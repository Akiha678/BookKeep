import { Transaction, DayGroup, MonthlySummary, CategoryStat } from '../type/bookkeep';
import { getCategoryMeta } from '../constants/categories';

/**
 * 格式化金额显示 (如 1234.5 -> 1,234.50)
 */
export function formatMoney(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0.00';
  }
  const parts = Math.abs(amount).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * 格式化日期为友好显示
 */
export function formatFriendlyDate(dateStr: string): string {
  const today = getTodayDateStr();
  const yesterday = getYesterdayDateStr();

  if (dateStr === today) {
    return '今天';
  }
  if (dateStr === yesterday) {
    return '昨天';
  }

  // 格式化为 "M月D日 星期X"
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) {
    return dateStr;
  }

  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekDay = weekDays[dateObj.getDay()];

  return `${month}月${day}日 ${weekDay}`;
}

export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateStr(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeStr(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 将明细流水按日期倒序分组
 */
export function groupTransactionsByDay(transactions: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();

  // 排序：先按日期倒序，再按创建时间倒序
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.createdAt - a.createdAt;
  });

  for (const item of sorted) {
    if (!map.has(item.date)) {
      map.set(item.date, []);
    }
    map.get(item.date)!.push(item);
  }

  const groups: DayGroup[] = [];
  for (const [date, items] of map.entries()) {
    let totalExpense = 0;
    let totalIncome = 0;

    for (const it of items) {
      if (it.type === 'expense') {
        totalExpense += it.amount;
      } else {
        totalIncome += it.amount;
      }
    }

    groups.push({
      date,
      dayText: formatFriendlyDate(date),
      totalExpense,
      totalIncome,
      items,
    });
  }

  return groups;
}

/**
 * 计算指定月份的月度汇总
 */
export function calculateMonthlySummary(transactions: Transaction[], monthStr: string): MonthlySummary {
  let totalExpense = 0;
  let totalIncome = 0;
  let transactionCount = 0;

  for (const item of transactions) {
    if (item.date.startsWith(monthStr)) {
      transactionCount++;
      if (item.type === 'expense') {
        totalExpense += item.amount;
      } else {
        totalIncome += item.amount;
      }
    }
  }

  return {
    month: monthStr,
    totalExpense,
    totalIncome,
    balance: totalIncome - totalExpense,
    transactionCount,
  };
}

/**
 * 计算分类统计占比排行
 */
export function calculateCategoryStats(
  transactions: Transaction[],
  monthStr: string,
  type: 'expense' | 'income'
): CategoryStat[] {
  const filtered = transactions.filter(t => t.date.startsWith(monthStr) && t.type === type);
  const totalAmount = filtered.reduce((acc, cur) => acc + cur.amount, 0);

  const statMap = new Map<string, { amount: number; count: number }>();

  for (const item of filtered) {
    const existing = statMap.get(item.category) || { amount: 0, count: 0 };
    existing.amount += item.amount;
    existing.count += 1;
    statMap.set(item.category, existing);
  }

  const result: CategoryStat[] = [];
  for (const [catName, val] of statMap.entries()) {
    const meta = getCategoryMeta(catName);
    result.push({
      category: catName as any,
      amount: val.amount,
      count: val.count,
      percentage: totalAmount > 0 ? (val.amount / totalAmount) * 100 : 0,
      type,
      icon: meta.icon,
      color: meta.color,
    });
  }

  // 按金额降序排列
  return result.sort((a, b) => b.amount - a.amount);
}