import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SyncStatus } from '../../shared/types/bookkeep';
import { mmkvStorage } from '../../shared/storage/mmkvStorage';

interface SyncState {
  syncStatus: SyncStatus;
  autoSync: boolean;
  serverUrl: string;
  lastSyncTime: number | null;
  lastError: string | null;
  syncModalVisible: boolean;
}

const savedConfig = mmkvStorage.getSyncConfig();

const initialState: SyncState = {
  syncStatus: 'idle',
  autoSync: savedConfig.autoSync ?? true,
  serverUrl:
    savedConfig.serverUrl && savedConfig.serverUrl !== 'http://10.10.1.9:8080'
      ? savedConfig.serverUrl
      : 'http://111.231.53.205:8080',
  lastSyncTime: savedConfig.lastSyncTime || null,
  lastError: null,
  syncModalVisible: false,
};

export const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSyncStatus: (state, action: PayloadAction<SyncStatus>) => {
      state.syncStatus = action.payload;
    },
    setAutoSync: (state, action: PayloadAction<boolean>) => {
      state.autoSync = action.payload;
      mmkvStorage.setSyncConfig({
        ...mmkvStorage.getSyncConfig(),
        autoSync: action.payload,
      });
    },
    setServerUrl: (state, action: PayloadAction<string>) => {
      state.serverUrl = action.payload;
      mmkvStorage.setSyncConfig({
        ...mmkvStorage.getSyncConfig(),
        serverUrl: action.payload,
      });
    },
    setLastSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncTime = action.payload;
      mmkvStorage.setSyncConfig({
        ...mmkvStorage.getSyncConfig(),
        lastSyncTime: action.payload,
      });
    },
    setLastError: (state, action: PayloadAction<string | null>) => {
      state.lastError = action.payload;
    },
    setSyncModalVisible: (state, action: PayloadAction<boolean>) => {
      state.syncModalVisible = action.payload;
    },
  },
});

export const {
  setSyncStatus,
  setAutoSync,
  setServerUrl,
  setLastSyncTime,
  setLastError,
  setSyncModalVisible,
} = syncSlice.actions;

export default syncSlice.reducer;
