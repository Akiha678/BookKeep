import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, TransactionType, CategoryName } from '../../shared/types/bookkeep';
import { getCurrentMonthStr } from '../../shared/utils/format';
import { mmkvStorage } from '../../shared/storage/mmkvStorage';

interface BookkeepState {
  transactions: Transaction[];
  currentMonth: string;
  filterType: 'all' | 'expense' | 'income';
  subTab: 'bills' | 'stats';
  editingItem: Transaction | null;
  addModalVisible: boolean;
}

const initialTransactions = mmkvStorage.getTransactions();

const initialState: BookkeepState = {
  transactions: initialTransactions,
  currentMonth: getCurrentMonthStr(),
  filterType: 'all',
  subTab: 'bills',
  editingItem: null,
  addModalVisible: false,
};

export const bookkeepSlice = createSlice({
  name: 'bookkeep',
  initialState,
  reducers: {
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = action.payload;
      mmkvStorage.setTransactions(state.transactions);
    },
    addTransaction: (
      state,
      action: PayloadAction<{
        type: TransactionType;
        category: CategoryName;
        amount: number;
        date: string;
        time: string;
        note: string;
      }>
    ) => {
      const newTx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...action.payload,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        synced: false,
      };
      state.transactions.unshift(newTx);
      mmkvStorage.setTransactions(state.transactions);
    },
    updateTransaction: (
      state,
      action: PayloadAction<{
        id: string;
        data: {
          type: TransactionType;
          category: CategoryName;
          amount: number;
          date: string;
          time: string;
          note: string;
        };
      }>
    ) => {
      const idx = state.transactions.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) {
        state.transactions[idx] = {
          ...state.transactions[idx],
          ...action.payload.data,
          updatedAt: Date.now(),
          synced: false,
        };
        mmkvStorage.setTransactions(state.transactions);
      }
    },
    deleteTransaction: (state, action: PayloadAction<string>) => {
      const idx = state.transactions.findIndex(t => t.id === action.payload);
      if (idx !== -1) {
        state.transactions[idx] = {
          ...state.transactions[idx],
          isDeleted: true,
          updatedAt: Date.now(),
          synced: false,
        };
        mmkvStorage.setTransactions(state.transactions);
      }
    },
    setCurrentMonth: (state, action: PayloadAction<string>) => {
      state.currentMonth = action.payload;
    },
    setFilterType: (state, action: PayloadAction<'all' | 'expense' | 'income'>) => {
      state.filterType = action.payload;
    },
    setSubTab: (state, action: PayloadAction<'bills' | 'stats'>) => {
      state.subTab = action.payload;
    },
    setEditingItem: (state, action: PayloadAction<Transaction | null>) => {
      state.editingItem = action.payload;
    },
    setAddModalVisible: (state, action: PayloadAction<boolean>) => {
      state.addModalVisible = action.payload;
    },
  },
});

export const {
  setTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  setCurrentMonth,
  setFilterType,
  setSubTab,
  setEditingItem,
  setAddModalVisible,
} = bookkeepSlice.actions;

export default bookkeepSlice.reducer;
