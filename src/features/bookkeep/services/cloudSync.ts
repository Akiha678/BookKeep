import { SyncStatus, SyncApiResponse, Transaction } from '../../../shared/types/bookkeep';
import { mmkvStorage } from '../../../shared/storage/mmkvStorage';
import { authService, AuthActionResult } from '../../auth/services/authService';
import { store } from '../../../stores';
import { setTransactions } from '../../../stores/slices/bookkeepSlice';
import { setSyncStatus, setLastSyncTime, setLastError } from '../../../stores/slices/syncSlice';
import { logout } from '../../../stores/slices/authSlice';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  pulledCount: number;
  message: string;
  requiresAuth?: boolean;
}

class CloudSyncService {
  private statusListeners: Set<(status: SyncStatus, error: string | null) => void> = new Set();

  public getStatus(): SyncStatus {
    return store.getState().sync.syncStatus;
  }

  public getLastError(): string | null {
    return store.getState().sync.lastError;
  }

  public subscribeStatus(listener: (status: SyncStatus, error: string | null) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: SyncStatus, error: string | null = null) {
    store.dispatch(setSyncStatus(status));
    store.dispatch(setLastError(error));
    this.statusListeners.forEach(fn => fn(status, error));
  }

  public async login(
    account: string,
    password: string,
    baseUrl: string = 'http://111.231.53.205:8080'
  ): Promise<AuthActionResult> {
    return authService.loginByPassword(account, password, baseUrl);
  }

  public async syncWithCloud(): Promise<SyncResult> {
    const currentStatus = this.getStatus();
    if (currentStatus === 'syncing') {
      return { success: false, syncedCount: 0, pulledCount: 0, message: '正在同步中，请稍候' };
    }

    const user = store.getState().auth.currentUser || mmkvStorage.getUser();
    if (!user || !user.token) {
      this.setStatus('idle', null);
      return {
        success: false,
        syncedCount: 0,
        pulledCount: 0,
        requiresAuth: true,
        message: '未登录账号，请先登录后再进行云端同步',
      };
    }

    this.setStatus('syncing', null);
    const syncConfig = store.getState().sync;
    const allItems = store.getState().bookkeep.transactions;
    const unsyncedItems = allItems.filter(t => !t.synced);

    try {
      const serverUrl = syncConfig.serverUrl.endsWith('/bookkeep/sync')
        ? syncConfig.serverUrl
        : `${syncConfig.serverUrl.replace(/\/+$/, '')}/bookkeep/sync`;

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
        lastSyncTime: syncConfig.lastSyncTime || 0,
        unsyncedItems: payloadItems,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const authHeader = user.token.startsWith('Bearer ')
        ? user.token
        : `Bearer ${user.token}`;

      const response = await fetch(serverUrl, {
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
        store.dispatch(logout());
        throw new Error('登录状态已失效或过期 (401)，请重新登录');
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

      // ── 合并增量数据 (LWW 冲突解决) ──
      const map = new Map<string, Transaction>();
      for (const t of allItems) {
        map.set(t.id, { ...t, synced: true });
      }

      if (items && Array.isArray(items)) {
        for (const cloudItem of items) {
          const localItem = map.get(cloudItem.id);
          if (!localItem || cloudItem.updatedAt >= localItem.updatedAt) {
            map.set(cloudItem.id, {
              id: cloudItem.id,
              type: cloudItem.type as any,
              category: cloudItem.category as any,
              amount: cloudItem.amount,
              date: cloudItem.date,
              time: cloudItem.time,
              note: cloudItem.note,
              createdAt: cloudItem.createdAt,
              updatedAt: cloudItem.updatedAt,
              synced: true,
              isDeleted: cloudItem.isDeleted,
            });
          }
        }
      }

      const mergedList = Array.from(map.values());
      // 更新 Redux 与 MMKV
      store.dispatch(setTransactions(mergedList));
      store.dispatch(setLastSyncTime(serverTime));

      this.setStatus('success', null);

      setTimeout(() => {
        if (this.getStatus() === 'success') {
          this.setStatus('idle', null);
        }
      }, 3000);

      return {
        success: true,
        syncedCount: uploadedCount,
        pulledCount: pulledCount,
        message: `云端同步成功！已上传 ${uploadedCount} 笔，从服务器拉取 ${pulledCount} 笔`,
      };
    } catch (err: any) {
      let errMsg = err.message || '网络连接超时，请检查局域网连接';
      if (err.name === 'AbortError') {
        errMsg = `连接超时，请检查局域网连接是否畅通`;
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

  public getLocalCount(): number {
    return store.getState().bookkeep.transactions.length;
  }
}

export const cloudSync = new CloudSyncService();
