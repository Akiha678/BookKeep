import { CategoryItem, CategoryName } from '../types/bookkeep';

export const EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'exp_food', name: '餐饮', type: 'expense', icon: '🍜', color: '#FF7043', bgColor: '#FFF3E0' },
  { id: 'exp_shop', name: '购物', type: 'expense', icon: '🛍️', color: '#EC407A', bgColor: '#FCE4EC' },
  { id: 'exp_daily', name: '日用', type: 'expense', icon: '🧴', color: '#26A69A', bgColor: '#E0F2F1' },
  { id: 'exp_traffic', name: '交通', type: 'expense', icon: '🚗', color: '#29B6F6', bgColor: '#E1F5FE' },
  { id: 'exp_sports', name: '运动', type: 'expense', icon: '🏃', color: '#66BB6A', bgColor: '#E8F5E9' },
  { id: 'exp_fun', name: '娱乐', type: 'expense', icon: '🎮', color: '#AB47BC', bgColor: '#F3E5F5' },
  { id: 'exp_comm', name: '通讯', type: 'expense', icon: '📱', color: '#42A5F5', bgColor: '#E3F2FD' },
  { id: 'exp_clothes', name: '服饰', type: 'expense', icon: '👗', color: '#FF4081', bgColor: '#F8BBD0' },
  { id: 'exp_housing', name: '住房', type: 'expense', icon: '🏠', color: '#5C6BC0', bgColor: '#E8EAF6' },
  { id: 'exp_social', name: '社交', type: 'expense', icon: '☕', color: '#8D6E63', bgColor: '#EFEBE9' },
  { id: 'exp_travel', name: '旅行', type: 'expense', icon: '✈️', color: '#26C6DA', bgColor: '#E0F7FA' },
  { id: 'exp_tobacco', name: '烟酒', type: 'expense', icon: '🍷', color: '#7E57C2', bgColor: '#EDE7F6' },
  { id: 'exp_gift', name: '礼物', type: 'expense', icon: '🎁', color: '#FFA726', bgColor: '#FFF8E1' },
];

export const INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'inc_salary', name: '工资', type: 'income', icon: '💰', color: '#2E7D32', bgColor: '#E8F5E9' },
  { id: 'inc_parttime', name: '兼职', type: 'income', icon: '💻', color: '#00897B', bgColor: '#E0F2F1' },
  { id: 'inc_redpacket', name: '红包', type: 'income', icon: '🧧', color: '#D32F2F', bgColor: '#FFEBEE' },
  { id: 'inc_invest', name: '理财', type: 'income', icon: '📈', color: '#1565C0', bgColor: '#E3F2FD' },
  { id: 'inc_bonus', name: '奖金', type: 'income', icon: '🏆', color: '#F57C00', bgColor: '#FFF3E0' },
  { id: 'inc_other', name: '其他', type: 'income', icon: '✨', color: '#7B1FA2', bgColor: '#F3E5F5' },
];

export const ALL_CATEGORIES: CategoryItem[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];

export function getCategoryMeta(name: CategoryName | string): CategoryItem {
  const found = ALL_CATEGORIES.find(c => c.name === name);
  if (found) {
    return found;
  }
  return {
    id: 'unknown',
    name: (name as CategoryName) || '其他',
    type: 'expense',
    icon: '📝',
    color: '#2B85FF',
    bgColor: '#EBF4FF',
  };
}
