import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors } from '../../../shared/theme/colors';
import { MonthlySummary, SyncStatus } from '../../../shared/types/bookkeep';
import { formatMoney } from '../../../shared/utils/format';

interface HeaderCardProps {
  currentMonth: string; // YYYY-MM
  summary: MonthlySummary;
  syncStatus: SyncStatus;
  unsyncedCount: number;
  filterType: 'all' | 'expense' | 'income';
  isLoggedIn?: boolean;
  userDisplayName?: string;
  activeSubTab?: 'bills' | 'stats';
  onSubTabChange?: (tab: 'bills' | 'stats') => void;
  onFilterChange: (type: 'all' | 'expense' | 'income') => void;
  onSyncPress: () => void;
  onMonthPrev: () => void;
  onMonthNext: () => void;
}

export const HeaderCard: React.FC<HeaderCardProps> = ({
  currentMonth,
  summary,
  syncStatus,
  unsyncedCount,
  filterType,
  isLoggedIn = false,
  userDisplayName,
  activeSubTab = 'bills',
  onSubTabChange,
  onFilterChange,
  onSyncPress,
  onMonthPrev,
  onMonthNext,
}) => {
  const [yearStr, monthStr] = currentMonth.split('-');
  const displayMonth = `${yearStr}年${parseInt(monthStr, 10)}月`;

  const getSyncBadge = () => {
    if (!isLoggedIn) {
      return { text: '登录', icon: '👤', color: '#FEF3C7', bg: 'rgba(245, 158, 11, 0.3)' };
    }
    switch (syncStatus) {
      case 'syncing':
        return { text: '同步中', icon: '🔄', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.25)' };
      case 'success':
        return { text: '已同步', icon: '☁️', color: '#E0F2FE', bg: 'rgba(255, 255, 255, 0.2)' };
      case 'error':
        return { text: '失败', icon: '⚠️', color: '#FEE2E2', bg: 'rgba(239, 68, 68, 0.3)' };
      default:
        if (unsyncedCount > 0) {
          return { text: `${unsyncedCount}待传`, icon: '☁️', color: '#FEF3C7', bg: 'rgba(245, 158, 11, 0.3)' };
        }
        return { text: userDisplayName ? `${userDisplayName}` : '已同步', icon: '☁️', color: '#E0F2FE', bg: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  const badge = getSyncBadge();

  return (
    <View style={styles.container}>
      {/* 1. 第一行: AppBar (Logo+标题 / 明细与图表切换 / 云同步状态) */}
      <View style={styles.appBarRow}>
        <View style={styles.brandBox}>
          <Image
            source={require('../../../../assets/logo.png')}
            style={styles.brandLogo}
            resizeMode="cover"
          />
          <Text style={styles.brandTitle}>三金记账</Text>
        </View>

        {/* 明细与图表 TabApp 切换 */}
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabBtn, activeSubTab === 'bills' && styles.subTabBtnActive]}
            onPress={() => onSubTabChange?.('bills')}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabBtnText, activeSubTab === 'bills' && styles.subTabBtnTextActive]}>
              明细
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabBtn, activeSubTab === 'stats' && styles.subTabBtnActive]}
            onPress={() => onSubTabChange?.('stats')}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabBtnText, activeSubTab === 'stats' && styles.subTabBtnTextActive]}>
              图表
            </Text>
          </TouchableOpacity>
        </View>

        {/* 云同步徽标 */}
        <TouchableOpacity
          style={[styles.syncBadge, { backgroundColor: badge.bg }]}
          onPress={onSyncPress}
          activeOpacity={0.8}
        >
          {syncStatus === 'syncing' ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.syncSpinner} />
          ) : (
            <Text style={styles.syncBadgeIcon}>{badge.icon}</Text>
          )}
          <Text style={[styles.syncBadgeText, { color: badge.color }]}>{badge.text}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. 第二行: 日期 收入 支出 (这三个为一行) */}
      <View style={styles.dataSummaryRow}>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={onMonthPrev} style={styles.arrowButton} activeOpacity={0.7}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{displayMonth}</Text>
          <TouchableOpacity onPress={onMonthNext} style={styles.arrowButton} activeOpacity={0.7}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>收入</Text>
          <Text style={styles.summaryIncomeValue}>¥{formatMoney(summary.totalIncome)}</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>支出</Text>
          <Text style={styles.summaryExpenseValue}>¥{formatMoney(summary.totalExpense)}</Text>
        </View>
      </View>

      {/* 3. 第三行: 全部明细 支出 收入 (这三个为一行) */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === 'all' && styles.filterBtnActive]}
          onPress={() => onFilterChange('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterBtnText, filterType === 'all' && styles.filterBtnTextActive]}>
            全部明细
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, filterType === 'expense' && styles.filterBtnActive]}
          onPress={() => onFilterChange('expense')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterBtnText, filterType === 'expense' && styles.filterBtnTextActive]}>
            支出
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, filterType === 'income' && styles.filterBtnActive]}
          onPress={() => onFilterChange('income')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterBtnText, filterType === 'income' && styles.filterBtnTextActive]}>
            收入
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    height: 34,
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderRadius: 14,
    padding: 2,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  subTabBtnText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  subTabBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncSpinner: {
    marginRight: 4,
  },
  syncBadgeIcon: {
    fontSize: 11,
    marginRight: 3,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dataSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  monthText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 1,
  },
  summaryIncomeValue: {
    color: '#E0F2FE',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryExpenseValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  filterBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  filterBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
