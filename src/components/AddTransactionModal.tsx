import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Transaction,
  TransactionType,
  CategoryName,
} from '../type/bookkeep';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../constants/categories';
import { Colors } from '../theme/colors';
import {
  getTodayDateStr,
  getCurrentTimeStr,
} from '../utils/format';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    type: TransactionType;
    category: CategoryName;
    amount: number;
    date: string;
    time: string;
    note: string;
  }) => void;
  editingItem?: Transaction | null;
}

const QUICK_NOTES = ['外卖午餐', '便利店', '地铁交通', '超市采购', '聚会请客', '周末娱乐'];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  onSave,
  editingItem,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<CategoryName>('餐饮');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateStr());
  const [time, setTime] = useState<string>(getCurrentTimeStr());

  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type);
      setCategory(editingItem.category);
      setAmountStr(String(editingItem.amount));
      setNote(editingItem.note);
      setDate(editingItem.date);
      setTime(editingItem.time);
    } else {
      setType('expense');
      setCategory('餐饮');
      setAmountStr('');
      setNote('');
      setDate(getTodayDateStr());
      setTime(getCurrentTimeStr());
    }
  }, [editingItem, visible]);

  // 当切换类型时，重置默认选中的分类
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'expense') {
      setCategory('餐饮');
    } else {
      setCategory('工资');
    }
  };

  const handleSave = () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('提示', '请输入有效的记账金额');
      return;
    }

    onSave({
      type,
      category,
      amount,
      date,
      time,
      note: note.trim(),
    });
    onClose();
  };

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* 顶部标题与关闭按钮 */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* 收支切换 Segmented Control */}
            <View style={styles.typeSegment}>
              <TouchableOpacity
                style={[styles.segmentBtn, type === 'expense' && styles.segmentBtnActiveExpense]}
                onPress={() => handleTypeChange('expense')}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, type === 'expense' && styles.segmentTextActive]}>
                  支出
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, type === 'income' && styles.segmentBtnActiveIncome]}
                onPress={() => handleTypeChange('income')}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, type === 'income' && styles.segmentTextActive]}>
                  收入
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSave} style={styles.saveBtnTop}>
              <Text style={styles.saveBtnTopText}>完成</Text>
            </TouchableOpacity>
          </View>

          {/* 金额大输入框 */}
          <View style={styles.amountInputSection}>
            <Text style={styles.currencySymbol}>¥</Text>
            <TextInput
              style={styles.amountInput}
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0.00"
              placeholderTextColor="#CBD5E1"
              keyboardType="decimal-pad"
              autoFocus={true}
              selectionColor={Colors.primary}
            />
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* 分类网格选择区 */}
            <Text style={styles.sectionTitle}>
              选择分类（{type === 'expense' ? '支出类型' : '收入类型'}）
            </Text>
            <View style={styles.categoryGrid}>
              {categories.map(cat => {
                const isSelected = category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                    ]}
                    onPress={() => setCategory(cat.name)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.catIconBox,
                        { backgroundColor: cat.bgColor },
                        isSelected && styles.catIconBoxSelected,
                      ]}
                    >
                      <Text style={styles.catIconText}>{cat.icon}</Text>
                    </View>
                    <Text
                      style={[
                        styles.catNameText,
                        isSelected && styles.catNameTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 日期与时间行 */}
            <View style={styles.rowSection}>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>记账日期</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>时间</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:mm"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* 备注输入框 */}
            <View style={styles.noteSection}>
              <Text style={styles.fieldLabel}>备注说明</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="添加备注信息（如：和朋友聚餐、买咖啡）..."
                placeholderTextColor="#94A3B8"
                maxLength={50}
              />

              {/* 快捷备注标签 */}
              <View style={styles.quickTagsRow}>
                {QUICK_NOTES.map((tag, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickTag}
                    onPress={() => setNote(tag)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickTagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 底部保存大按钮 */}
            <TouchableOpacity
              style={styles.bottomSaveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.bottomSaveText}>
                {editingItem ? '保存修改' : '确认记一笔'}
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.modalOverlay,
  },
  backdrop: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  typeSegment: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 3,
  },
  segmentBtn: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 17,
  },
  segmentBtnActiveExpense: {
    backgroundColor: Colors.expense,
  },
  segmentBtnActiveIncome: {
    backgroundColor: Colors.income,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  saveBtnTop: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveBtnTopText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  amountInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.divider,
    paddingVertical: 10,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 38,
    fontWeight: '800',
    color: Colors.textPrimary,
    padding: 0,
  },
  scrollBody: {
    flexGrow: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  categoryCard: {
    width: '20%',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  catIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  catIconText: {
    fontSize: 22,
  },
  catNameText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  catNameTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  rowSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fieldBox: {
    flex: 0.48,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteSection: {
    marginBottom: 20,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  quickTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  quickTagText: {
    fontSize: 12,
    color: '#64748B',
  },
  bottomSaveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  bottomSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catIconBoxSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  bottomSpacer: {
    height: 30,
  },
});
