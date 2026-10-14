import { UserInfo } from '../../../shared/types/bookkeep';
import { mmkvStorage } from '../../../shared/storage/mmkvStorage';
import { store } from '../../../stores';
import { setUser, logout } from '../../../stores/slices/authSlice';

export const DEFAULT_SERVER_BASE = 'http://111.231.53.205:8080';

export interface AuthActionResult {
  success: boolean;
  message: string;
  data?: any;
  user?: UserInfo;
}

export interface CaptchaResult {
  success: boolean;
  captchaId?: string;
  imageBase64?: string;
  message?: string;
}

const NETWORK_TIMEOUT = 15000;

class AuthService {
  private getBaseUrl(customUrl?: string): string {
    const config = mmkvStorage.getSyncConfig();
    let url = customUrl || config.serverUrl || DEFAULT_SERVER_BASE;
    if (url.includes('10.10.1.9:8080')) {
      url = DEFAULT_SERVER_BASE;
    }
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}`;
    } catch {
      return DEFAULT_SERVER_BASE;
    }
  }

  /**
   * 1. 账号/邮箱 + 密码登录 (POST /auth/login 或 POST /login)
   */
  public async loginByPassword(account: string, password: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      let url = `${base}/auth/login`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      let resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: account.trim(),
          password: password.trim(),
        }),
        signal: controller.signal,
      });

      // 如果 404 则尝试 /login 备用接口
      if (resp.status === 404) {
        url = `${base}/login`;
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: account.trim(),
            password: password.trim(),
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return {
          success: false,
          message: json.message || `登录失败 (HTTP ${resp.status})`,
        };
      }

      const accessToken = json.accessToken || json.data?.accessToken || json.data?.token || json.token;
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
        email: json.email || json.data?.email || (account.includes('@') ? account.trim() : undefined),
        avatarColor: json.avatarColor || json.data?.avatarColor,
        token: accessToken,
      };

      // 同步 Redux 与 MMKV
      store.dispatch(setUser(userInfo));

      return {
        success: true,
        message: '登录成功',
        user: userInfo,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: '登录连接超时，请检查服务端连接',
        };
      }
      return {
        success: false,
        message: `登录请求失败: ${err.message || '无法连接到服务端'}`,
      };
    }
  }

  /**
   * 2. 发送手机短信验证码 (POST /auth/sms/code 或 /auth/login/smsCode)
   */
  public async sendSmsCode(phone: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      let url = `${base}/auth/login/smsCode`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      let resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
        signal: controller.signal,
      });

      if (resp.status === 404) {
        url = `${base}/auth/sms/code`;
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone.trim() }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.code !== 1000) {
        return {
          success: false,
          message: json.message || '发送短信验证码失败',
        };
      }

      return {
        success: true,
        message: '验证码已下发',
        data: json.data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `获取验证码失败: ${err.message || '网络连接超时'}`,
      };
    }
  }

  /**
   * 3. 手机验证码快捷登录 (POST /auth/login/phone)
   */
  public async loginByPhone(phone: string, code: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/login/phone`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

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

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return {
          success: false,
          message: json.message || '验证码登录失败',
        };
      }

      const token = json.accessToken || json.data?.accessToken || json.data?.token || json.token;
      if (!token) {
        return {
          success: false,
          message: json.message || '未获取到有效登录令牌',
        };
      }

      const userInfo: UserInfo = {
        id: json.id || json.data?.id,
        username: json.username || json.data?.username || phone.trim(),
        displayName: json.displayName || json.data?.displayName || `用户_${phone.slice(-4)}`,
        phone: phone.trim(),
        token,
      };

      store.dispatch(setUser(userInfo));

      return {
        success: true,
        message: '登录成功',
        user: userInfo,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `手机登录失败: ${err.message || '网络超时'}`,
      };
    }
  }

  /**
   * 4. 发送邮箱注册验证码 (POST /auth/register/code)
   * 接口参考 API.md 3.1: 请求体 { email: string }
   */
  public async sendRegisterEmailCode(email: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/register/code`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.code !== 1000) {
        return {
          success: false,
          message: json.message || '发送邮箱验证码失败',
        };
      }

      return {
        success: true,
        message: json.data || '验证码已发送至邮箱',
        data: json.data,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: '请求超时，邮件服务响应较慢，请稍后重试',
        };
      }
      return {
        success: false,
        message: `发送验证码失败: ${err.message || '网络无法连接到服务端'}`,
      };
    }
  }

  /**
   * 4.1 邮箱快捷免密登录 (POST /auth/login/email)
   */
  public async loginByEmailCode(email: string, code: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/login/email`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      let resp: Response | null = null;
      let json: any = null;

      try {
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            code: code.trim(),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        json = await resp.json().catch(() => null);
      } catch {
        // 请求失败或超时
      }

      // 若 /auth/login/email 成功返回 token
      if (resp && resp.ok && (json?.code === 1000 || json?.accessToken || json?.data?.token)) {
        const token = json.accessToken || json.data?.token || json.data?.accessToken;
        const username = email.split('@')[0];
        const userInfo: UserInfo = {
          username,
          displayName: username,
          email: email.trim(),
          token,
        };
        store.dispatch(setUser(userInfo));
        return {
          success: true,
          message: '邮箱验证码登录成功',
          user: userInfo,
        };
      }

      // 若服务端暂未开放免密登录端点，提示用户使用密码登录或注册
      return {
        success: false,
        message: json?.message || '邮箱快捷登录暂未开启，请使用密码登录或注册新账号',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `登录请求失败: ${err.message || ''}`,
      };
    }
  }

  /**
   * 5. 提交邮箱注册 (POST /auth/register)
   * 接口参考 API.md: 请求体 { email, code, password } (6-72位密码)
   */
  public async registerByEmail(email: string, code: string, password: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/register`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

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

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || (json.code && json.code !== 1000 && !json.accessToken)) {
        return {
          success: false,
          message: json.message || `注册失败 (HTTP ${resp.status})`,
        };
      }

      const token = json.accessToken || json.data?.accessToken || json.data?.token;
      const username = json.username || json.data?.username || email.split('@')[0];
      const displayName = json.displayName || json.data?.displayName || username;

      if (token) {
        const userInfo: UserInfo = {
          id: json.id || json.data?.id,
          username,
          displayName,
          email: email.trim(),
          avatarColor: json.avatarColor || json.data?.avatarColor,
          token,
        };
        store.dispatch(setUser(userInfo));
        return {
          success: true,
          message: '注册并登录成功',
          user: userInfo,
        };
      }

      // 若未直接返回 token，尝试使用注册的密码登录
      return await this.loginByPassword(email.trim(), password.trim(), baseUrl);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: '注册请求超时，请稍后检查重试',
        };
      }
      return {
        success: false,
        message: `注册请求失败: ${err.message || '请检查服务端连接'}`,
      };
    }
  }

  /**
   * 6. 发送重置密码邮箱验证码 (POST /auth/password/code)
   * 接口参考 API.md 3.1
   */
  public async sendPasswordResetCode(email: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/password/code`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.code !== 1000) {
        return {
          success: false,
          message: json.message || '发送重置验证码失败',
        };
      }

      return {
        success: true,
        message: json.data || '重置验证码已发送至邮箱',
        data: json.data,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: '请求超时，请检查网络后重试',
        };
      }
      return {
        success: false,
        message: `获取验证码失败: ${err.message || ''}`,
      };
    }
  }

  /**
   * 7. 提交重置新密码 (POST /auth/updatePassword)
   * 接口参考 API.md 3.1
   */
  public async resetPassword(email: string, code: string, newPassword: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/updatePassword`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword: newPassword.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.code !== 1000) {
        return {
          success: false,
          message: json.message || '重置密码失败',
        };
      }

      return {
        success: true,
        message: '密码重置成功，请使用新密码登录',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `重置密码请求失败: ${err.message || ''}`,
      };
    }
  }

  /**
   * 8. 登出注销 (POST /user/info/logoff)
   */
  public async logoff(): Promise<void> {
    store.dispatch(logout());
  }

  /**
   * 9. 设置离线/测试模拟用户
   */
  public setMockUser(user: UserInfo): void {
    store.dispatch(setUser(user));
  }

  /**
   * 10. 获取登录图形验证码 (GET /auth/login/captcha)
   */
  public async getCaptcha(baseUrl?: string): Promise<CaptchaResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/login/captcha`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      const resp = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.code !== 1000) {
        return {
          success: false,
          message: json.message || '获取图形验证码失败',
        };
      }

      return {
        success: true,
        captchaId: json.data?.captchaId,
        imageBase64: json.data?.data,
        message: '获取成功',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `获取验证码失败: ${err.message || ''}`,
      };
    }
  }
}

export const authService = new AuthService();
