import { Transaction, CloudSyncConfig } from '../type/bookkeep';
import { getTodayDateStr, getYesterdayDateStr } from '../utils/format';

const DEFAULT_SERVER_URL = 'http://10.10.1.9:8080/bookkeep/sync';

// 预设丰富示例数据
function generateInitialTransactions(): Transaction[] {
  const today = getTodayDateStr();
  const yesterday = getYesterdayDateStr();
  const now = Date.now();

  return [
    {
      id: 'tx_1',
      type: 'expense',
      category: '餐饮',
      amount: 38.5,
      date: today,
      time: '12:30',
      note: '商务午餐工作便当',
      createdAt: now - 3600000 * 2,
      updatedAt: now - 3600000 * 2,
      synced: true,
    },
    {
      id: 'tx_2',
      type: 'expense',
      category: '交通',
      amount: 15.0,
      date: today,
      time: '08:45',
      note: '地铁出行上班单程',
      createdAt: now - 3600000 * 6,
      updatedAt: now - 3600000 * 6,
      synced: true,
    },
    {
      id: 'tx_3',
      type: 'income',
      category: '红包',
      amount: 88.0,
      date: today,
      time: '10:15',
      note: '周末朋友婚礼礼金回礼',
      createdAt: now - 3600000 * 4,
      updatedAt: now - 3600000 * 4,
      synced: true,
    },
    {
      id: 'tx_4',
      type: 'expense',
      category: '日用',
      amount: 68.9,
      date: yesterday,
      time: '19:20',
      note: '便利店纸巾洗发水',
      createdAt: now - 86400000 - 3600000,
      updatedAt: now - 86400000 - 3600000,
      synced: true,
    },
    {
      id: 'tx_5',
      type: 'expense',
      category: '购物',
      amount: 299.0,
      date: yesterday,
      time: '15:10',
      note: '秋季换季卫衣',
      createdAt: now - 86400000 - 3600000 * 5,
      updatedAt: now - 86400000 - 3600000 * 5,
      synced: true,
    },
    {
      id: 'tx_6',
      type: 'expense',
      category: '运动',
      amount: 120.0,
      date: yesterday,
      time: '20:30',
      note: '羽毛球场馆预约及球拍穿线',
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
      synced: true,
    },
    {
      id: 'tx_7',
      type: 'income',
      category: '工资',
      amount: 12500.0,
      date: yesterday.substring(0, 8) + '05',
      time: '10:00',
      note: '10月份基本工资及绩效',
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000 * 5,
      synced: true,
    },
    {
      id: 'tx_8',
      type: 'expense',
      category: '住房',
      amount: 2600.0,
      date: yesterday.substring(0, 8) + '06',
      time: '14:00',
      note: '本月房租及物业费',
      createdAt: now - 86400000 * 4,
      updatedAt: now - 86400000 * 4,
      synced: true,
    },
    {
      id: 'tx_9',
      type: 'expense',
      category: '娱乐',
      amount: 70.0,
      date: yesterday.substring(0, 8) + '07',
      time: '21:00',
      note: '周末院线电影票',
      createdAt: now - 86400000 * 3,
      updatedAt: now - 86400000 * 3,
      synced: true,
    },
    {
      id: 'tx_10',
      type: 'expense',
      category: '通讯',
      amount: 99.0,
      date: yesterday.substring(0, 8) + '08',
      time: '09:00',
      note: '中国移动手机话费及5G宽带',
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000 * 2,
      synced: true,
    },
    {
      id: 'tx_11',
      type: 'income',
      category: '兼职',
      amount: 800.0,
      date: yesterday.substring(0, 8) + '08',
      time: '18:00',
      note: '小程序前端页面外包报酬',
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000 * 2,
      synced: true,
    },
    {
      id: 'tx_12',
      type: 'expense',
      category: '礼物',
      amount: 188.0,
      date: yesterday.substring(0, 8) + '09',
      time: '16:30',
      note: '朋友生日定制礼盒',
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
      synced: true,
    },
  ];
}

class BookKeepStorage {
  private transactions: Transaction[] = [];
  private listeners: Set<(items: Transaction[]) => void> = new Set();
  private syncConfig: CloudSyncConfig = {
    autoSync: true,
    serverUrl: DEFAULT_SERVER_URL,
    lastSyncTime: 0,
  };

  constructor() {
    this.transactions = generateInitialTransactions();
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

  public resetToDefault() {
    this.transactions = generateInitialTransactions();
    this.syncConfig.lastSyncTime = Date.now();
    this.notify();
  }
}

export const storage = new BookKeepStorage();
