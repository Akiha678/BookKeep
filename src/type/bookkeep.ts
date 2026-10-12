export type TransactionType = 'expense' | 'income';

export type ExpenseCategoryName =
  | '餐饮'
  | '购物'
  | '日用'
  | '交通'
  | '运动'
  | '娱乐'
  | '通讯'
  | '服饰'
  | '住房'
  | '社交'
  | '旅行'
  | '烟酒'
  | '礼物';

export type IncomeCategoryName =
  | '工资'
  | '兼职'
  | '红包'
  | '理财'
  | '奖金'
  | '其他';

export type CategoryName = ExpenseCategoryName | IncomeCategoryName;

export interface CategoryItem {
  id: string;
  name: CategoryName;
  type: TransactionType;
  icon: string;
  color: string;
  bgColor: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: CategoryName;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note: string;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  isDeleted?: boolean;
}

export interface UserInfo {
  id?: number;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatarColor?: number;
  token: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export interface CloudSyncConfig {
  autoSync: boolean;
  serverUrl: string;
  currentUser: UserInfo | null;
  token?: string;
  username?: string;
  displayName?: string;
  lastSyncTime: number | null;
}

export interface SyncApiItemDto {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  time: string;
  note: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface SyncApiResponse {
  code: number;
  message: string;
  data: {
    serverTime: number;
    items: SyncApiItemDto[];
    uploadedCount: number;
    pulledCount: number;
  } | null;
}

export interface DayGroup {
  date: string;
  dayText: string;
  totalExpense: number;
  totalIncome: number;
  items: Transaction[];
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalExpense: number;
  totalIncome: number;
  balance: number;
  transactionCount: number;
}

export interface CategoryStat {
  category: CategoryName;
  amount: number;
  count: number;
  percentage: number;
  type: TransactionType;
  icon: string;
  color: string;
}
