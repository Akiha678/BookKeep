import { createMMKV, MMKV } from 'react-native-mmkv';
import { Transaction, UserInfo, CloudSyncConfig } from '../types/bookkeep';

const DEFAULT_SERVER_URL = 'http://111.231.53.205:8080';

const KEYS = {
  TRANSACTIONS: 'bookkeep_transactions_v2',
  USER: 'bookkeep_user_v2',
  SYNC_CONFIG: 'bookkeep_sync_config_v2',
};

// 安全初始化 MMKV 实例
let mmkvInstance: MMKV;
try {
  mmkvInstance = createMMKV({ id: 'bookkeep-storage' });
} catch {
  // 降级兜底 (在原生环境未链接或热重载瞬时不可用时)
  const memoryStore = new Map<string, string>();
  mmkvInstance = {
    getString: (key: string) => memoryStore.get(key),
    set: (key: string, value: any) => {
      memoryStore.set(key, String(value));
    },
    getNumber: (key: string) => {
      const v = memoryStore.get(key);
      return v ? Number(v) : undefined;
    },
    getBoolean: (key: string) => {
      const v = memoryStore.get(key);
      return v === 'true';
    },
    contains: (key: string) => memoryStore.has(key),
    remove: (key: string) => memoryStore.delete(key),
    clearAll: () => memoryStore.clear(),
  } as unknown as MMKV;
}

export const mmkv = mmkvInstance;

class MMKVStorageService {
  /**
   * 获取所有本地记账数据
   */
  public getTransactions(): Transaction[] {
    try {
      const raw = mmkv.getString(KEYS.TRANSACTIONS);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * 保存本地记账数据
   */
  public setTransactions(items: Transaction[]): void {
    try {
      mmkv.set(KEYS.TRANSACTIONS, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save transactions to MMKV', e);
    }
  }

  /**
   * 获取当前登录用户
   */
  public getUser(): UserInfo | null {
    try {
      const raw = mmkv.getString(KEYS.USER);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * 保存当前登录用户
   */
  public setUser(user: UserInfo | null): void {
    try {
      if (user) {
        mmkv.set(KEYS.USER, JSON.stringify(user));
      } else {
        mmkv.remove(KEYS.USER);
      }
    } catch (e) {
      console.warn('Failed to save user to MMKV', e);
    }
  }

  /**
   * 获取云端同步配置
   */
  public getSyncConfig(): CloudSyncConfig {
    try {
      const raw = mmkv.getString(KEYS.SYNC_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.serverUrl === 'http://10.10.1.9:8080' || !parsed.serverUrl)) {
          parsed.serverUrl = DEFAULT_SERVER_URL;
        }
        return parsed;
      }
    } catch {}

    const currentUser = this.getUser();
    return {
      autoSync: true,
      serverUrl: DEFAULT_SERVER_URL,
      currentUser,
      token: currentUser?.token,
      username: currentUser?.username,
      displayName: currentUser?.displayName,
      lastSyncTime: null,
    };
  }

  /**
   * 更新云端同步配置
   */
  public setSyncConfig(config: CloudSyncConfig): void {
    try {
      mmkv.set(KEYS.SYNC_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save sync config to MMKV', e);
    }
  }

  /**
   * 导出全部数据为标准化 JSON
   */
  public exportDataJson(): string {
    const list = this.getTransactions().filter(t => !t.isDeleted);
    return JSON.stringify(
      {
        version: '2.0.0',
        exportedAt: Date.now(),
        total: list.length,
        transactions: list,
      },
      null,
      2
    );
  }

  /**
   * 导入 JSON 数据并合并
   */
  public importDataJson(jsonStr: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      let incomingList: Transaction[] = [];

      if (Array.isArray(parsed)) {
        incomingList = parsed;
      } else if (parsed && Array.isArray(parsed.transactions)) {
        incomingList = parsed.transactions;
      } else {
        return { success: false, count: 0, error: 'JSON 格式不符合备份规范' };
      }

      const existingMap = new Map<string, Transaction>();
      for (const t of this.getTransactions()) {
        existingMap.set(t.id, t);
      }

      let importedCount = 0;
      for (const item of incomingList) {
        if (!item.id || !item.amount || !item.category || !item.date) {
          continue;
        }
        const existing = existingMap.get(item.id);
        if (!existing || (item.updatedAt || 0) > (existing.updatedAt || 0)) {
          existingMap.set(item.id, {
            ...item,
            synced: false,
            updatedAt: item.updatedAt || Date.now(),
            createdAt: item.createdAt || Date.now(),
          });
          importedCount++;
        }
      }

      this.setTransactions(Array.from(existingMap.values()));
      return { success: true, count: importedCount };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'JSON 解析异常' };
    }
  }

  /**
   * 清空所有数据
   */
  public clearAllData(): void {
    mmkv.remove(KEYS.TRANSACTIONS);
    mmkv.remove(KEYS.USER);
    mmkv.remove(KEYS.SYNC_CONFIG);
  }
}

export const mmkvStorage = new MMKVStorageService();
