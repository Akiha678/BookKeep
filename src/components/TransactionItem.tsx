import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Transaction } from '../type/bookkeep';
import { getCategoryMeta } from '../constants/categories';
import { Colors } from '../theme/colors';
import { formatMoney } from '../utils/format';

interface TransactionItemProps {
  item: Transaction;
  onPress: (item: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ item, onPress, onDelete }) => {
  const meta = getCategoryMeta(item.category);
  const isExpense = item.type === 'expense';

  const handleLongPress = () => {
    Alert.alert(
      '删除账目',
      `确定要删除这笔「${item.category}」记账记录（¥${formatMoney(item.amount)}）吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => onDelete(item.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* 分类图标 */}
      <View style={[styles.iconContainer, { backgroundColor: meta.bgColor }]}>
        <Text style={styles.iconText}>{meta.icon}</Text>
      </View>

      {/* 中间信息：分类、备注、时间 */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.categoryName}>{item.category}</Text>
          {item.synced ? (
            <View style={styles.syncedDot}>
              <Text style={styles.syncedText}>☁️已同步</Text>
            </View>
          ) : (
            <View style={styles.unsyncedDot}>
              <Text style={styles.unsyncedText}>待同步</Text>
            </View>
          )}
        </View>

        <View style={styles.subRow}>
          <Text style={styles.noteText} numberOfLines={1}>
            {item.note ? item.note : '无备注'}
          </Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      </View>

      {/* 右侧金额 */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amountText, isExpense ? styles.expenseAmount : styles.incomeAmount]}>
          {isExpense ? '-' : '+'}¥{formatMoney(item.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 1.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  syncedDot: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#BAE6FD',
  },
  syncedText: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '500',
  },
  unsyncedDot: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  unsyncedText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  noteText: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  expenseAmount: {
    color: Colors.expense,
  },
  incomeAmount: {
    color: Colors.income,
  },
});
