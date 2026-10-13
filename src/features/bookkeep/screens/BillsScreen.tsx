import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../stores/hooks';
import {
  setCurrentMonth,
  setFilterType,
  setSubTab,
  setEditingItem,
  setAddModalVisible,
  deleteTransaction,
} from '../../../stores/slices/bookkeepSlice';
import { HeaderCard } from '../components/HeaderCard';
import { TransactionItem } from '../components/TransactionItem';
import { StatisticsView } from '../components/StatisticsView';
import { Transaction } from '../../../shared/types/bookkeep';
import { Colors } from '../../../shared/theme/colors';
import {
  calculateMonthlySummary,
  groupTransactionsByDay,
  formatMoney,
} from '../../../shared/utils/format';
import { cloudSync } from '../services/cloudSync';

export const BillsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { transactions, currentMonth, filterType, subTab } = useAppSelector(
    state => state.bookkeep
  );
  const { currentUser } = useAppSelector(state => state.auth);
  const { syncStatus, autoSync } = useAppSelector(state => state.sync);

  // 月份切换
  const handleMonthPrev = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    dispatch(setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`));
  };

  const handleMonthNext = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    dispatch(setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`));
  };

  // 过滤未删除且符合月份 & 类型的账目
  const activeTransactions = useMemo(() => {
    return transactions.filter(t => !t.isDeleted);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return activeTransactions.filter(item => {
      const matchMonth = item.date.startsWith(currentMonth);
      if (!matchMonth) {
        return false;
      }
      if (filterType === 'all') {
        return true;
      }
      return item.type === filterType;
    });
  }, [activeTransactions, currentMonth, filterType]);

  // 按天分组数据
  const groupedDays = useMemo(() => {
    return groupTransactionsByDay(filteredTransactions);
  }, [filteredTransactions]);

  // 当月汇总
  const monthlySummary = useMemo(() => {
    return calculateMonthlySummary(activeTransactions, currentMonth);
  }, [activeTransactions, currentMonth]);

  // 待同步条数
  const unsyncedCount = useMemo(() => {
    return activeTransactions.filter(t => !t.synced).length;
  }, [activeTransactions]);

  // 编辑单笔
  const handleEditItem = (item: Transaction) => {
    dispatch(setEditingItem(item));
    dispatch(setAddModalVisible(true));
  };

  // 删除单笔
  const handleDeleteItem = (id: string) => {
    dispatch(deleteTransaction(id));
    if (autoSync && currentUser?.token) {
      cloudSync.syncWithCloud();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* 顶栏 HeaderCard (常驻明细顶部) */}
      <HeaderCard
        currentMonth={currentMonth}
        summary={monthlySummary}
        syncStatus={syncStatus}
        unsyncedCount={unsyncedCount}
        filterType={filterType}
        isLoggedIn={Boolean(currentUser)}
        userDisplayName={currentUser?.displayName || currentUser?.username}
        activeSubTab={subTab}
        onSubTabChange={tab => dispatch(setSubTab(tab))}
        onFilterChange={type => dispatch(setFilterType(type))}
        onSyncPress={() => navigation.navigate('Mine')}
        onMonthPrev={handleMonthPrev}
        onMonthNext={handleMonthNext}
      />

      {/* 主视图内容区域 */}
      <View style={styles.mainContent}>
        {subTab === 'bills' ? (
          <ScrollView
            style={styles.billsListScroll}
            contentContainerStyle={styles.billsListContainer}
            showsVerticalScrollIndicator={false}
          >
            {groupedDays.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>本月暂无记账明细</Text>
                <Text style={styles.emptySub}>点击底部中间的「＋」按钮开始记一笔吧！</Text>
              </View>
            ) : (
              groupedDays.map(group => (
                <View key={group.date} style={styles.dayGroup}>
                  {/* 日期分组表头 */}
                  <View style={styles.dayHeaderRow}>
                    <Text style={styles.dayDateText}>{group.dayText}</Text>
                    <View style={styles.daySummaryBox}>
                      {group.totalExpense > 0 && (
                        <Text style={styles.dayExpenseText}>
                          支 ¥{formatMoney(group.totalExpense)}
                        </Text>
                      )}
                      {group.totalIncome > 0 && (
                        <Text style={styles.dayIncomeText}>
                          收 ¥{formatMoney(group.totalIncome)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* 该日期下的每一笔账目 */}
                  {group.items.map(tx => (
                    <TransactionItem
                      key={tx.id}
                      item={tx}
                      onPress={handleEditItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <StatisticsView
            currentMonth={currentMonth}
            transactions={activeTransactions}
            onMonthPrev={handleMonthPrev}
            onMonthNext={handleMonthNext}
            showHeader={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  mainContent: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  billsListScroll: {
    flex: 1,
  },
  billsListContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  dayGroup: {
    marginBottom: 10,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 5,
    marginBottom: 3,
  },
  dayDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  daySummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayExpenseText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 10,
  },
  dayIncomeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
