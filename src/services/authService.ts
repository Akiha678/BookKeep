import { UserInfo } from '../type/bookkeep';
import { storage } from './storage';

export const DEFAULT_SERVER_BASE = 'http://10.10.1.9:8080';

export interface AuthActionResult {
  success: boolean;
  message: string;
  data?: any;
  user?: UserInfo;
}

class AuthService {
  private getBaseUrl(customUrl?: string): string {
    const config = storage.getSyncConfig();
    const url = customUrl || config.serverUrl || DEFAULT_SERVER_BASE;
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}`;
    } catch {
      return DEFAULT_SERVER_BASE;
    }
  }

  /**
   * 1. 账号/邮箱 + 密码登录 (POST /auth/login)
   */
  public async loginByPassword(account: string, password: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/login`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: account.trim(),
          password: password.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json();
      if (!resp.ok) {
        return {
          success: false,
          message: json.message || `登录失败 (HTTP ${resp.status})`,
        };
      }

      const accessToken = json.accessToken || json.data?.accessToken;
      if (!accessToken) {
        return {
          success: false,
          message: json.message || '未获取到有效登录令牌',
        };
      }

      const userInfo: UserInfo = {
        id: json.id || json.data?.id,
        username: json.username || json.data?.username || account.trim(),
        displayName: json.displayName || json.data?.displayName || account.trim(),
        email: json.email || json.data?.email,
        avatarColor: json.avatarColor || json.data?.avatarColor,
        token: accessToken,
      };

      storage.setUser(userInfo);

      return {
        success: true,
        message: '登录成功',
        user: userInfo,
      };
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? '连接服务器超时，请确认局域网网络' : (err.message || '网络连接异常');
      return {
        success: false,
        message: `登录请求失败: ${msg}`,
      };
    }
  }

  /**
   * 2. 获取手机验证码 (POST /auth/login/smsCode)
   * 服务端在开发环境或短信模拟时直接返回 4 位数字验证码
   */
  public async sendSmsCode(phone: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/login/smsCode`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json();
      if (!resp.ok || json.code !== 1000) {
        return {
          success: false,
          message: json.message || '获取验证码失败',
        };
      }

      return {
        success: true,
        message: '验证码已下发',
        data: json.data, // 4位数字验证码
      };
    } catch (err: any) {
      return {
        success: false,
        message: `获取验证码超时: ${err.message || ''}`,
      };
    }
  }

  /**
   * 3. 手机验证码快捷登录/自动注册 (POST /auth/login/phone)
   * 未注册过的手机号首次验证通过后服务端会自动完成注册
   */
  public async loginByPhone(phone: string, code: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/login/phone`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          code: code.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json();
      if (!resp.ok || json.code !== 1000) {
        return {
          success: false,
          message: json.message || '验证码登录失败',
        };
      }

      const token = json.data?.token;
      if (!token) {
        return {
          success: false,
          message: '登录返回格式异常，未找到 Token',
        };
      }

      const suffix = phone.length >= 4 ? phone.slice(-4) : phone;
      const userInfo: UserInfo = {
        username: phone.trim(),
        displayName: `用户${suffix}`,
        phone: phone.trim(),
        token,
      };

      storage.setUser(userInfo);

      return {
        success: true,
        message: '手机快捷登录成功',
        user: userInfo,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `登录请求失败: ${err.message || ''}`,
      };
    }
  }

  /**
   * 4. 发送邮箱注册验证码 (POST /auth/register/code)
   */
  public async sendRegisterEmailCode(email: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/register/code`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json();
      if (!resp.ok || json.code !== 1000) {
        return {
          success: false,
          message: json.message || '发送邮箱验证码失败',
        };
      }

      return {
        success: true,
        message: json.data || '验证码已发送',
        data: json.data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `发送验证码失败: ${err.message || ''}`,
      };
    }
  }

  /**
   * 5. 提交邮箱注册 (POST /auth/register)
   */
  public async registerByEmail(email: string, code: string, password: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/register`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          password: password.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json();
      if (!resp.ok || (json.code && json.code !== 1000 && !json.accessToken)) {
        return {
          success: false,
          message: json.message || '注册失败',
        };
      }

      const accessToken = json.accessToken || json.data?.accessToken;
      if (!accessToken) {
        return {
          success: false,
          message: '注册成功但未返回有效登录凭证，请直接登录',
        };
      }

      const userInfo: UserInfo = {
        id: json.id,
        username: json.username || email.trim(),
        displayName: json.displayName || email.split('@')[0],
        email: email.trim(),
        avatarColor: json.avatarColor,
        token: accessToken,
      };

      storage.setUser(userInfo);

      return {
        success: true,
        message: '注册并登录成功',
        user: userInfo,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `注册请求失败: ${err.message || ''}`,
      };
    }
  }

  /**
   * 6. 退出登录并吊销服务端会话 (POST /user/info/logoff)
   */
  public async logoff(baseUrl?: string): Promise<void> {
    const user = storage.getUser();
    if (user && user.token) {
      try {
        const base = this.getBaseUrl(baseUrl);
        const url = `${base}/user/info/logoff`;

        const authHeader = user.token.startsWith('Bearer ') ? user.token : `Bearer ${user.token}`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
        });
      } catch {
        // 静默处理吊销异常
      }
    }
    storage.setUser(null);
  }
}

export const authService = new AuthService();
