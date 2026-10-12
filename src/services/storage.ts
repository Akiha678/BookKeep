import { Transaction, CloudSyncConfig, UserInfo } from '../type/bookkeep';

const DEFAULT_SERVER_URL = 'http://10.10.1.9:8080/bookkeep/sync';

class BookKeepStorage {
  private transactions: Transaction[] = [];
  private listeners: Set<(items: Transaction[]) => void> = new Set();
  private userListeners: Set<(user: UserInfo | null) => void> = new Set();
  private syncConfig: CloudSyncConfig = {
    autoSync: true,
    serverUrl: DEFAULT_SERVER_URL,
    currentUser: null,
    token: '',
    username: '',
    displayName: '',
    lastSyncTime: 0,
  };

  constructor() {
    this.transactions = [];
  }

  /**
   * 获取当前已登录的用户信息
   */
  public getUser(): UserInfo | null {
    return this.syncConfig.currentUser;
  }

  /**
   * 设置当前登录用户或清空退出登录
   */
  public setUser(user: UserInfo | null) {
    this.syncConfig.currentUser = user;
    this.syncConfig.token = user?.token || '';
    this.syncConfig.username = user?.username || '';
    this.syncConfig.displayName = user?.displayName || user?.username || '';
    this.userListeners.forEach(fn => fn(user));
  }

  /**
   * 是否已处于登录状态
   */
  public isLoggedIn(): boolean {
    return Boolean(this.syncConfig.currentUser?.token);
  }

  /**
   * 监听用户登录态变化
   */
  public subscribeUser(listener: (user: UserInfo | null) => void): () => void {
    this.userListeners.add(listener);
    return () => {
      this.userListeners.delete(listener);
    };
  }

  /**
   * 获取用于页面展示的有效账目列表（自动过滤软删除项）
   */
  public getTransactions(): Transaction[] {
    return this.transactions.filter(t => !t.isDeleted);
  }

  /**
   * 获取所有账目，包括标记删除项（用于导出或全量备份）
   */
  public getAllTransactions(): Transaction[] {
    return [...this.transactions];
  }

  /**
   * 获取所有待同步项（包含新增、修改以及软删除记录）
   */
  public getUnsyncedTransactions(): Transaction[] {
    return this.transactions.filter(t => !t.synced);
  }

  public getSyncConfig(): CloudSyncConfig {
    return { ...this.syncConfig };
  }

  public updateSyncConfig(partial: Partial<CloudSyncConfig>) {
    this.syncConfig = { ...this.syncConfig, ...partial };
  }

  public subscribe(listener: (items: Transaction[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const visible = this.getTransactions();
    this.listeners.forEach(fn => fn(visible));
  }

  public addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'synced' | 'isDeleted'>): Transaction {
    const now = Date.now();
    const newTx: Transaction = {
      ...tx,
      id: `tx_${now}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      synced: false,
      isDeleted: false,
    };
    this.transactions.unshift(newTx);
    this.notify();
    return newTx;
  }

  public updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): boolean {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx === -1) {
      return false;
    }
    this.transactions[idx] = {
      ...this.transactions[idx],
      ...updates,
      updatedAt: Date.now(),
      synced: false,
    };
    this.notify();
    return true;
  }

  /**
   * 软删除：标记 isDeleted 为 true，置 synced 为 false，以便上报服务端
   */
  public deleteTransaction(id: string): boolean {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx === -1) {
      return false;
    }
    this.transactions[idx] = {
      ...this.transactions[idx],
      isDeleted: true,
      updatedAt: Date.now(),
      synced: false,
    };
    this.notify();
    return true;
  }

  public markAllAsSynced(syncTime: number = Date.now()) {
    this.transactions = this.transactions.map(t => ({ ...t, synced: true }));
    this.syncConfig.lastSyncTime = syncTime;
    this.notify();
  }

  public mergeCloudTransactions(cloudItems: any[], serverTime?: number) {
    const map = new Map<string, Transaction>();

    // 先存入本地数据
    for (const item of this.transactions) {
      map.set(item.id, item);
    }

    // 合并云端数据（以更新时间最新为准）
    for (const raw of cloudItems) {
      const cloudItem: Transaction = {
        id: raw.id,
        type: raw.type,
        category: raw.category,
        amount: Number(raw.amount),
        date: raw.date,
        time: raw.time,
        note: raw.note || '',
        createdAt: Number(raw.createdAt) || Date.now(),
        updatedAt: Number(raw.updatedAt) || Date.now(),
        synced: true,
        isDeleted: Boolean(raw.isDeleted),
      };

      const existing = map.get(cloudItem.id);
      if (!existing) {
        map.set(cloudItem.id, cloudItem);
      } else {
        if (cloudItem.updatedAt >= existing.updatedAt || existing.synced) {
          map.set(cloudItem.id, cloudItem);
        }
      }
    }

    this.transactions = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    if (serverTime) {
      this.syncConfig.lastSyncTime = serverTime;
    }
    this.notify();
  }

  public exportDataJson(): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        transactions: this.transactions,
      },
      null,
      2
    );
  }

  public importDataJson(jsonStr: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !Array.isArray(parsed.transactions)) {
        return { success: false, count: 0, error: '无效的数据格式' };
      }
      this.mergeCloudTransactions(parsed.transactions);
      return { success: true, count: parsed.transactions.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'JSON 解析失败' };
    }
  }

  public clearAllData() {
    this.transactions = [];
    this.syncConfig.lastSyncTime = 0;
    this.notify();
  }

  public resetToDefault() {
    this.clearAllData();
  }
}

export const storage = new BookKeepStorage();
