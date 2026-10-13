import { UserInfo } from '../../../shared/types/bookkeep';
import { mmkvStorage } from '../../../shared/storage/mmkvStorage';
import { store } from '../../../stores';
import { setUser, logout } from '../../../stores/slices/authSlice';

export const DEFAULT_SERVER_BASE = 'http://10.10.1.9:8080';

export interface AuthActionResult {
  success: boolean;
  message: string;
  data?: any;
  user?: UserInfo;
}

class AuthService {
  private getBaseUrl(customUrl?: string): string {
    const config = mmkvStorage.getSyncConfig();
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

      // 同步 Redux 与 MMKV
      store.dispatch(setUser(userInfo));

      return {
        success: true,
        message: '登录成功',
        user: userInfo,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `登录请求失败: ${err.message || '网络无法连接到服务端'}`,
      };
    }
  }

  /**
   * 2. 发送手机短信验证码 (POST /auth/sms/code)
   */
  public async sendSmsCode(phone: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      const url = `${base}/auth/sms/code`;

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
        message: `获取验证码超时: ${err.message || ''}`,
      };
    }
  }

  /**
   * 3. 手机验证码快捷登录/自动注册 (POST /auth/login/phone)
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

      store.dispatch(setUser(userInfo));

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
   * 4. 发送邮箱注册/登录验证码 (POST /auth/register/code 或 /auth/email/code)
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
   * 4.1 邮箱验证码快捷登录 (POST /auth/login/email 或自动免密注册登录)
   */
  public async loginByEmailCode(email: string, code: string, baseUrl?: string): Promise<AuthActionResult> {
    try {
      const base = this.getBaseUrl(baseUrl);
      // 优先尝试标准邮箱验证码登录端点
      const url = `${base}/auth/login/email`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

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

      // 若服务端未配置单独邮箱验证码接口，尝试通过 register 注册/绑定
      const regRes = await this.registerByEmail(email, code, '123456', baseUrl);
      if (regRes.success) {
        return regRes;
      }

      // 如果提示用户已存在但接口不支持纯验证码登录，尝试使用默认密码登录
      if (regRes.message && (regRes.message.includes('已存在') || regRes.message.includes('已注册'))) {
        const loginRes = await this.loginByPassword(email, '123456', baseUrl);
        if (loginRes.success) {
          return loginRes;
        }
      }

      return {
        success: false,
        message: regRes.message || json?.message || '验证码校验失败，请检查验证码',
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
          message: json.message || '邮箱注册失败',
        };
      }

      const token = json.accessToken || json.data?.token || json.data?.accessToken;
      const username = email.split('@')[0];

      if (token) {
        const userInfo: UserInfo = {
          username,
          displayName: username,
          email: email.trim(),
          token,
        };
        store.dispatch(setUser(userInfo));
        return {
          success: true,
          message: '注册并登录成功',
          user: userInfo,
        };
      }

      // 若未直接返回 token，尝试使用新设置密码登录
      return await this.loginByPassword(email.trim(), password.trim(), baseUrl);
    } catch (err: any) {
      return {
        success: false,
        message: `注册请求失败: ${err.message || '请检查服务端连接'}`,
      };
    }
  }

  /**
   * 6. 登出注销
   */
  public async logoff(): Promise<void> {
    store.dispatch(logout());
  }
}

export const authService = new AuthService();
