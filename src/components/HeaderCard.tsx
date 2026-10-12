import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { MonthlySummary, SyncStatus } from '../type/bookkeep';
import { formatMoney } from '../utils/format';

interface HeaderCardProps {
  currentMonth: string; // YYYY-MM
  summary: MonthlySummary;
  syncStatus: SyncStatus;
  unsyncedCount: number;
  filterType: 'all' | 'expense' | 'income';
  isLoggedIn?: boolean;
  userDisplayName?: string;
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
  onFilterChange,
  onSyncPress,
  onMonthPrev,
  onMonthNext,
}) => {
  // 解析显示月份，例如 "2026年10月"
  const [yearStr, monthStr] = currentMonth.split('-');
  const displayMonth = `${yearStr}年${parseInt(monthStr, 10)}月`;

  // 同步指示器状态文案与样式
  const getSyncBadge = () => {
    if (!isLoggedIn) {
      return { text: '点击登录同步', icon: '👤', color: '#FEF3C7', bg: 'rgba(245, 158, 11, 0.3)' };
    }
    switch (syncStatus) {
      case 'syncing':
        return { text: '正在同步...', icon: '🔄', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.25)' };
      case 'success':
        return { text: userDisplayName ? `${userDisplayName}已同步` : '云端已同步', icon: '☁️ ✓', color: '#E0F2FE', bg: 'rgba(255, 255, 255, 0.2)' };
      case 'error':
        return { text: '同步失败', icon: '⚠️', color: '#FEE2E2', bg: 'rgba(239, 68, 68, 0.3)' };
      default:
        if (unsyncedCount > 0) {
          return { text: `${unsyncedCount}笔待同步`, icon: '☁️ ⬆', color: '#FEF3C7', bg: 'rgba(245, 158, 11, 0.3)' };
        }
        return { text: userDisplayName ? `${userDisplayName}在线` : '云端已同步', icon: '☁️', color: '#E0F2FE', bg: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  const badge = getSyncBadge();

  return (
    <View style={styles.container}>
      {/* 顶部月份切换与云同步按钮 */}
      <View style={styles.topRow}>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={onMonthPrev} style={styles.arrowButton} activeOpacity={0.7}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{displayMonth}</Text>
          <TouchableOpacity onPress={onMonthNext} style={styles.arrowButton} activeOpacity={0.7}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.syncBadge, { backgroundColor: badge.bg }]} onPress={onSyncPress} activeOpacity={0.8}>
          {syncStatus === 'syncing' ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.syncSpinner} />
          ) : (
            <Text style={styles.syncBadgeIcon}>{badge.icon}</Text>
          )}
          <Text style={[styles.syncBadgeText, { color: badge.color }]}>{badge.text}</Text>
        </TouchableOpacity>
      </View>

      {/* 总结余大数值区 */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>本月结余 (元)</Text>
        <Text style={styles.balanceValue}>
          {summary.balance >= 0 ? '+' : '-'}¥{formatMoney(summary.balance)}
        </Text>
      </View>

      {/* 支出 & 收入 双列明细概览卡片 */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={styles.statTagRow}>
            <View style={[styles.statDot, styles.statDotExpense]} />
            <Text style={styles.statLabel}>本月支出</Text>
          </View>
          <Text style={styles.statExpenseValue}>¥{formatMoney(summary.totalExpense)}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <View style={styles.statTagRow}>
            <View style={[styles.statDot, styles.statDotIncome]} />
            <Text style={styles.statLabel}>本月收入</Text>
          </View>
          <Text style={styles.statIncomeValue}>¥{formatMoney(summary.totalIncome)}</Text>
        </View>
      </View>

      {/* 快捷筛选过滤器 Tab (全部 / 支出 / 收入) */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
          onPress={() => onFilterChange('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>全部明细</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'expense' && styles.filterTabActive]}
          onPress={() => onFilterChange('expense')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterTabText, filterType === 'expense' && styles.filterTabTextActive]}>仅看支出</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'income' && styles.filterTabActive]}
          onPress={() => onFilterChange('income')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterTabText, filterType === 'income' && styles.filterTabTextActive]}>仅看收入</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrowButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  monthText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncSpinner: {
    marginRight: 6,
  },
  syncBadgeIcon: {
    fontSize: 12,
    marginRight: 5,
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceSection: {
    marginBottom: 18,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
  },
  statTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  statExpenseValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statIncomeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 14,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    padding: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 11,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  statDotExpense: {
    backgroundColor: '#FF8A80',
  },
  statDotIncome: {
    backgroundColor: '#69F0AE',
  },
});
