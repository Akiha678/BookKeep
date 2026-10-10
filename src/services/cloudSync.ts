import { SyncStatus, SyncApiResponse } from '../type/bookkeep';
import { storage } from './storage';

export interface LoginResult {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    username: string;
    displayName: string;
    email: string;
  };
}

class CloudSyncService {
  private status: SyncStatus = 'idle';
  private lastError: string | null = null;
  private statusListeners: Set<(status: SyncStatus, error: string | null) => void> = new Set();

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public subscribeStatus(listener: (status: SyncStatus, error: string | null) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: SyncStatus, error: string | null = null) {
    this.status = status;
    this.lastError = error;
    this.statusListeners.forEach(fn => fn(status, error));
  }

  /**
   * 登录服务端获取访问令牌 (POST /auth/login)
   */
  public async login(
    account: string,
    password: string,
    baseUrl: string = 'http://10.10.1.9:8080'
  ): Promise<LoginResult> {
    try {
      const cleanBase = baseUrl.replace(/\/+$/, '');
      const loginUrl = `${cleanBase}/auth/login`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: account.trim(),
          password: password.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await resp.json();
      if (!resp.ok || (data.code && data.code !== 1000 && !data.accessToken)) {
        return {
          success: false,
          message: data.message || `登录失败 (HTTP ${resp.status})`,
        };
      }

      const accessToken = data.accessToken || data.data?.accessToken;
      if (!accessToken) {
        return {
          success: false,
          message: data.message || '登录响应中未包含有效 Token',
        };
      }

      // 保存到本地同步配置
      storage.updateSyncConfig({
        token: accessToken,
        username: data.username || account,
        displayName: data.displayName || data.username || account,
      });

      return {
        success: true,
        message: '登录成功，已自动配置云端访问凭证',
        token: accessToken,
        user: {
          id: data.id,
          username: data.username,
          displayName: data.displayName,
          email: data.email,
        },
      };
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? '连接登录服务超时' : err.message || '网络连接失败';
      return {
        success: false,
        message: `无法连接到 ${baseUrl}: ${msg}`,
      };
    }
  }

  /**
   * 执行与服务端增量双向同步 (POST /bookkeep/sync)
   */
  public async syncWithCloud(): Promise<{
    success: boolean;
    syncedCount: number;
    pulledCount: number;
    message: string;
  }> {
    if (this.status === 'syncing') {
      return { success: false, syncedCount: 0, pulledCount: 0, message: '正在同步中，请稍候' };
    }

    this.setStatus('syncing', null);
    const config = storage.getSyncConfig();
    const unsyncedItems = storage.getUnsyncedTransactions();

    try {
      if (!config.serverUrl) {
        throw new Error('未配置服务端同步地址');
      }

      if (!config.token) {
        throw new Error('请先在同步中心登录账号或填入认证 Token');
      }

      // 组装格式化为 Spring Boot 期望的 BookkeepItemDto
      const payloadItems = unsyncedItems.map(item => ({
        id: item.id,
        type: item.type,
        category: item.category,
        amount: item.amount,
        date: item.date,
        time: item.time,
        note: item.note || '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isDeleted: Boolean(item.isDeleted),
      }));

      const reqBody = {
        lastSyncTime: config.lastSyncTime || 0,
        unsyncedItems: payloadItems,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const authHeader = config.token.startsWith('Bearer ')
        ? config.token
        : `Bearer ${config.token}`;

      const response = await fetch(config.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new Error('认证失效或已过期 (401)，请在同步中心重新登录');
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`服务器响应异常 (HTTP ${response.status}): ${errText}`);
      }

      const resJson: SyncApiResponse = await response.json();

      if (resJson.code !== 1000 || !resJson.data) {
        throw new Error(resJson.message || '服务端返回业务错误');
      }

      const { serverTime, items, uploadedCount, pulledCount } = resJson.data;

      // 合并云端变动并更新本地同步时间戳
      storage.mergeCloudTransactions(items || [], serverTime);
      storage.markAllAsSynced(serverTime);

      this.setStatus('success', null);

      // 3秒后自动恢复 idle 状态
      setTimeout(() => {
        if (this.status === 'success') {
          this.setStatus('idle', null);
        }
      }, 3000);

      return {
        success: true,
        syncedCount: uploadedCount,
        pulledCount: pulledCount,
        message: `云端同步成功！已上传 ${uploadedCount} 笔变更，从服务器拉取 ${pulledCount} 笔数据`,
      };
    } catch (err: any) {
      let errMsg = err.message || '网络连接超时，请检查局域网连接';
      if (err.name === 'AbortError') {
        errMsg = `连接超时，请检查局域网 IP ${config.serverUrl} 是否畅通`;
      }
      this.setStatus('error', errMsg);
      return {
        success: false,
        syncedCount: 0,
        pulledCount: 0,
        message: `同步失败: ${errMsg}`,
      };
    }
  }

  /**
   * 获取本地总账目数
   */
  public getLocalCount(): number {
    return storage.getTransactions().length;
  }
}

export const cloudSync = new CloudSyncService();
