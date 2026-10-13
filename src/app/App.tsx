import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from '../stores';
import { useAppDispatch, useAppSelector } from '../stores/hooks';
import { RootNavigator } from '../navigation/RootNavigator';
import { AddTransactionModal } from '../features/bookkeep/components/AddTransactionModal';
import { AuthModal } from '../features/auth/components/AuthModal';
import { CloudSyncModal } from '../features/mine/components/CloudSyncModal';
import {
  addTransaction,
  updateTransaction,
  setAddModalVisible,
  setEditingItem,
} from '../stores/slices/bookkeepSlice';
import { setAuthModalVisible } from '../stores/slices/authSlice';
import { setSyncModalVisible } from '../stores/slices/syncSlice';
import { cloudSync } from '../features/bookkeep/services/cloudSync';
import { CategoryName, TransactionType } from '../shared/types/bookkeep';

/**
 * 全局模态弹窗管理器
 */
const GlobalModals: React.FC = () => {
  const dispatch = useAppDispatch();
  const { addModalVisible, editingItem } = useAppSelector(state => state.bookkeep);
  const { authModalVisible, currentUser } = useAppSelector(state => state.auth);
  const { syncModalVisible, autoSync } = useAppSelector(state => state.sync);

  // 应用初始化时，如已登录且开启自动同步，静默拉取最新数据
  useEffect(() => {
    if (currentUser?.token && autoSync) {
      cloudSync.syncWithCloud();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveTransaction = (data: {
    type: TransactionType;
    category: CategoryName;
    amount: number;
    date: string;
    time: string;
    note: string;
  }) => {
    if (editingItem) {
      dispatch(
        updateTransaction({
          id: editingItem.id,
          data,
        })
      );
      dispatch(setEditingItem(null));
    } else {
      dispatch(addTransaction(data));
    }

    if (autoSync && currentUser?.token) {
      cloudSync.syncWithCloud();
    }
  };

  return (
    <>
      {/* 记账新增/编辑模态弹窗 */}
      <AddTransactionModal
        visible={addModalVisible}
        onClose={() => {
          dispatch(setAddModalVisible(false));
          dispatch(setEditingItem(null));
        }}
        onSave={handleSaveTransaction}
        editingItem={editingItem}
      />

      {/* 登录/注册认证模态弹窗 */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => dispatch(setAuthModalVisible(false))}
        onSuccess={() => {
          dispatch(setAuthModalVisible(false));
          cloudSync.syncWithCloud();
        }}
      />

      {/* 云端同步管理模态弹窗 */}
      <CloudSyncModal
        visible={syncModalVisible}
        onClose={() => dispatch(setSyncModalVisible(false))}
        onTriggerSync={() => cloudSync.syncWithCloud()}
      />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <StatusBar barStyle="light-content" />
        <NavigationContainer>
          <RootNavigator />
          <GlobalModals />
        </NavigationContainer>
      </Provider>
    </SafeAreaProvider>
  );
}
