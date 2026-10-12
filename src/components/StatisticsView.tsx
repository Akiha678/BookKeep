import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Transaction, TransactionType } from '../type/bookkeep';
import { Colors } from '../theme/colors';
import {
  calculateCategoryStats,
  calculateMonthlySummary,
  formatMoney,
} from '../utils/format';

interface StatisticsViewProps {
  currentMonth: string;
  transactions: Transaction[];
  onMonthPrev: () => void;
  onMonthNext: () => void;
  showHeader?: boolean;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  currentMonth,
  transactions,
  onMonthPrev,
  onMonthNext,
  showHeader = true,
}) => {
  const [activeType, setActiveType] = useState<TransactionType>('expense');

  const [yearStr, monthStr] = currentMonth.split('-');
  const displayMonth = `${yearStr}年${parseInt(monthStr, 10)}月`;

  const summary = calculateMonthlySummary(transactions, currentMonth);
  const stats = calculateCategoryStats(transactions, currentMonth, activeType);

  // 计算最大单笔
  const monthlyFiltered = transactions.filter(
    t => t.date.startsWith(currentMonth) && t.type === activeType
  );
  const maxItem = monthlyFiltered.length > 0
    ? monthlyFiltered.reduce((prev, cur) => (cur.amount > prev.amount ? cur : prev))
    : null;

  const totalAmount = activeType === 'expense' ? summary.totalExpense : summary.totalIncome;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 顶部月份切换卡片 (仅独立模式下显示) */}
      {showHeader && (
        <View style={styles.monthHeaderCard}>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={onMonthPrev} style={styles.arrowBtn} activeOpacity={0.7}>
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{displayMonth} 收支统计</Text>
            <TouchableOpacity onPress={onMonthNext} style={styles.arrowBtn} activeOpacity={0.7}>
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 收支总览对比条 */}
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>总支出</Text>
              <Text style={styles.overviewExpense}>¥{formatMoney(summary.totalExpense)}</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>总收入</Text>
              <Text style={styles.overviewIncome}>¥{formatMoney(summary.totalIncome)}</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>结余</Text>
              <Text style={[styles.overviewBalance, summary.balance < 0 && { color: Colors.expense }]}>
                ¥{formatMoney(summary.balance)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 支出 / 收入 排行切换 Tab */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeType === 'expense' && styles.tabButtonActiveExpense]}
          onPress={() => setActiveType('expense')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeType === 'expense' && styles.tabTextActive]}>
            支出分类排行
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeType === 'income' && styles.tabButtonActiveIncome]}
          onPress={() => setActiveType('income')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeType === 'income' && styles.tabTextActive]}>
            收入分类排行
          </Text>
        </TouchableOpacity>
      </View>

      {/* 消费洞察提示卡片 */}
      {maxItem && (
        <View style={styles.insightCard}>
          <Text style={styles.insightIcon}>💡</Text>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>
              {activeType === 'expense' ? '单笔最高支出' : '单笔最高收入'}
            </Text>
            <Text style={styles.insightDesc}>
              {maxItem.date} 在「{maxItem.category}」产生 {maxItem.note ? `(${maxItem.note})` : ''} ¥
              {formatMoney(maxItem.amount)}
            </Text>
          </View>
        </View>
      )}

      {/* 分类进度排行榜列表 */}
      <View style={styles.rankingSection}>
        <View style={styles.rankingHeaderRow}>
          <Text style={styles.rankingSectionTitle}>
            {activeType === 'expense' ? '支出占比与明细排行' : '收入占比与明细排行'}
          </Text>
          <Text style={styles.rankingTotalHint}>
            共 {stats.length} 个分类，合计 ¥{formatMoney(totalAmount)}
          </Text>
        </View>

        {stats.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>本月暂无{activeType === 'expense' ? '支出' : '收入'}记录</Text>
          </View>
        ) : (
          stats.map((item, index) => {
            const isTop3 = index < 3;
            return (
              <View key={item.category} style={styles.rankCard}>
                <View style={styles.rankTopRow}>
                  {/* 排名徽章 */}
                  <View
                    style={[
                      styles.rankBadge,
                      index === 0 && styles.rankBadge1,
                      index === 1 && styles.rankBadge2,
                      index === 2 && styles.rankBadge3,
                    ]}
                  >
                    <Text style={[styles.rankBadgeText, isTop3 && styles.rankBadgeTextTop]}>
                      {index + 1}
                    </Text>
                  </View>

                  {/* 图标与分类名 */}
                  <Text style={styles.catIcon}>{item.icon}</Text>
                  <Text style={styles.catName}>{item.category}</Text>
                  <Text style={styles.catCount}>({item.count}笔)</Text>

                  {/* 金额与占比 */}
                  <View style={styles.rankRightBox}>
                    <Text style={styles.rankAmount}>¥{formatMoney(item.amount)}</Text>
                    <Text style={styles.rankPercent}>{item.percentage.toFixed(1)}%</Text>
                  </View>
                </View>

                {/* 动态比例进度条 */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(2, item.percentage))}%`,
                        backgroundColor: item.color || Colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  monthHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  arrowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  arrowText: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  overviewExpense: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.expense,
  },
  overviewIncome: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.income,
  },
  overviewBalance: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  overviewDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 13,
  },
  tabButtonActiveExpense: {
    backgroundColor: Colors.expense,
  },
  tabButtonActiveIncome: {
    backgroundColor: Colors.income,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  insightIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  rankingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  rankingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankingSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rankingTotalHint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  rankCard: {
    marginBottom: 16,
  },
  rankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankBadge1: {
    backgroundColor: '#F59E0B',
  },
  rankBadge2: {
    backgroundColor: '#38BDF8',
  },
  rankBadge3: {
    backgroundColor: '#A855F7',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  rankBadgeTextTop: {
    color: '#FFFFFF',
  },
  catIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 4,
  },
  catCount: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  rankRightBox: {
    alignItems: 'flex-end',
  },
  rankAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rankPercent: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  bottomSpacer: {
    height: 40,
  },
});
