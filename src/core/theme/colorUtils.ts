import { themeColors } from './colors';
import { palette } from './palette';

/**
 * 将 6 位或 3 位 HEX 颜色转换为 RGBA 字符串
 * @param hex 例如 '#2B85FF' 或 '#FFF'
 * @param alpha 透明度 0 ~ 1
 */
export function withAlpha(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string') return hex;

  // 处理 rgba 或 rgb 直接传入的情况
  if (hex.startsWith('rgb')) {
    return hex.replace(/[\d\.]+\)$/g, `${alpha})`);
  }

  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map(char => char + char)
      .join('');
  }

  if (cleaned.length !== 6) {
    return hex;
  }

  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/**
 * 计算背景颜色的亮度 (Luminance)，并返回适用的高反差文本色 (黑/白)
 * @param hexColor 容器背景色
 */
export function getContrastTextColor(hexColor: string): string {
  if (!hexColor || hexColor === 'transparent') {
    return themeColors.text.primary;
  }

  let cleaned = hexColor.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map(char => char + char)
      .join('');
  }

  if (cleaned.length !== 6) {
    return palette.common.white;
  }

  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);

  // YIQ 亮度公式
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? themeColors.text.primary : palette.common.white;
}

/**
 * 便捷获取记账收支对应的语义颜色
 * @param type 'expense' | 'income'
 */
export function getAccountingColor(type: 'expense' | 'income') {
  return type === 'expense'
    ? {
        main: themeColors.accounting.expense,
        light: themeColors.accounting.expenseLight,
        border: themeColors.accounting.expenseBorder,
      }
    : {
        main: themeColors.accounting.income,
        light: themeColors.accounting.incomeLight,
        border: themeColors.accounting.incomeBorder,
      };
}
