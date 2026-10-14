import { palette } from './palette';

/**
 * 结构化语义主题色彩 (Semantic Theme Colors)
 * 覆盖主题色、背景色、按钮色、文字色、边框色、业务记账色与状态色
 */
export const themeColors = {
  // 1. 主题核心色 (Sky Blue 天空蓝)
  primary: {
    main: palette.blue[500], // #2B85FF
    dark: palette.blue[600], // #1A6DE0
    light: palette.blue[50], // #EBF4FF
    lighter: '#F3F8FF',
    border: '#CFE3FF',
    contrastText: palette.common.white,
    gradientStart: '#4DA4FF',
    gradientEnd: '#1F75EE',
    gradient: ['#4DA4FF', '#1F75EE'] as const,
    skyCyan: palette.sky[500], // #0EA5E9
    skySoft: palette.sky[100], // #E0F2FE
    skyDeep: palette.sky[700], // #0369A1
  },

  // 2. 页面及各类容器背景色 (Backgrounds)
  background: {
    page: '#F6F9FD', // 默认浅蓝灰页面底色
    card: palette.common.white, // 纯白高光卡片底色
    cardAlt: palette.slate[50], // 次级浅灰卡片 (#F8FAFC)
    input: palette.slate[50], // 输入框浅灰底色
    inputFocused: palette.common.white, // 聚焦时的输入框底色
    modal: palette.common.white, // 弹窗容器背景色
    elevated: palette.common.white, // 浮层/气泡背景
    overlay: 'rgba(15, 23, 42, 0.5)', // 模态遮罩层背景
    divider: '#E9EFF8', // 列表/卡片内部分割线背景
  },

  // 3. 按钮颜色配置 (Button Colors)
  button: {
    // 黑盒质感/深色主按钮 (用于登录、注册等长条大按钮)
    primary: {
      background: palette.slate[800], // #1E293B
      text: palette.common.white,
      pressed: palette.slate[900], // #0F172A
      disabledBg: palette.slate[50], // #F8FAFC
      disabledText: palette.slate[300], // #CBD5E1
    },
    // 天空蓝品牌主按钮 (用于记账保存、突出确认等)
    theme: {
      background: palette.blue[500], // #2B85FF
      text: palette.common.white,
      pressed: palette.blue[600], // #1A6DE0
      disabledBg: palette.blue[50], // #EBF4FF
      disabledText: palette.slate[400], // #94A3B8
    },
    // 次要操作/浅色按钮 (用于取消、切换等)
    secondary: {
      background: palette.slate[100], // #F1F5F9
      text: palette.slate[700], // #334155
      pressed: palette.slate[200], // #E2E8F0
      border: palette.slate[200],
    },
    // 线框轮廓按钮 (Outline)
    outline: {
      background: palette.common.transparent,
      text: palette.blue[500],
      border: palette.blue[500],
      pressedBg: palette.blue[50],
    },
    // 危险操作按钮 (删除、清空账本)
    danger: {
      background: palette.red[500], // #EF4444
      text: palette.common.white,
      pressed: palette.red[600], // #DC2626
      lightBg: palette.red[100], // #FEE2E2
      lightText: palette.red[600],
    },
    // 成功操作按钮
    success: {
      background: palette.emerald[500], // #10B981
      text: palette.common.white,
      pressed: palette.emerald[600], // #059669
      lightBg: palette.emerald[50],
      lightText: palette.emerald[600],
    },
  },

  // 4. 文字与排版颜色 (Typography / Text)
  text: {
    primary: palette.slate[900], // #0F172A (主要标题、正文、加粗金额)
    secondary: palette.slate[600], // #475569 (副标题、说明文字、表单标签)
    muted: palette.slate[400], // #94A3B8 (时间戳、占位符、辅助弱提示)
    light: palette.slate[300], // #CBD5E1 (失效/极浅说明)
    inverse: palette.common.white, // 深色背景上的反色白字
    link: '#2563EB', // 链接与高亮蓝色
  },

  // 5. 边框与描边 (Borders & Outlines)
  border: {
    default: palette.slate[200], // #E2E8F0
    subtle: palette.slate[100], // #F1F5F9 (单行底线、极细分割)
    primary: '#CFE3FF', // 天空蓝浅边框
    focus: palette.blue[500], // 输入框聚焦高亮框
    danger: palette.red[200], // #FECACA
    success: palette.emerald[200], // #A7F3D0
  },

  // 6. 记账收支业务语义色 (Accounting / Ledger)
  accounting: {
    expense: palette.rose[500], // #FF5757 支出红
    expenseLight: '#FFF0F0', // 支出浅底色
    expenseBorder: '#FED7D7', // 支出浅边框
    income: palette.emerald[500], // #10B981 收入绿
    incomeLight: palette.emerald[50], // #ECFDF5 收入浅底色
    incomeBorder: palette.emerald[200], // #A7F3D0 收入浅边框
    balance: palette.blue[500], // 结余主色
  },

  // 7. 状态反馈与警示 (Status Feedback)
  status: {
    success: palette.emerald[500], // #10B981
    successLight: palette.emerald[50],
    warning: palette.amber[500], // #F59E0B
    warningLight: palette.amber[100],
    danger: palette.red[500], // #EF4444
    dangerLight: palette.red[100],
    info: palette.sky[500], // #0EA5E9
    infoLight: palette.sky[100],
  },

  // 8. 阴影与环境色 (Shadows)
  shadow: {
    light: 'rgba(30, 84, 160, 0.08)',
    medium: 'rgba(30, 84, 160, 0.16)',
    card: 'rgba(15, 23, 42, 0.06)',
    modal: 'rgba(15, 23, 42, 0.5)',
  },
} as const;

export type ThemeColorsType = typeof themeColors;

/**
 * 平铺兼容字典 (保持与旧版 Colors 对象 100% 字段向下兼容)
 * 现有页面中 `Colors.primary`、`Colors.background`、`Colors.expense` 均可零成本平滑使用
 */
export const Colors = {
  // 主题色
  primary: themeColors.primary.main,
  primaryDark: themeColors.primary.dark,
  primaryLight: themeColors.primary.light,
  primaryLighter: themeColors.primary.lighter,
  primaryBorder: themeColors.primary.border,
  primaryGradientStart: themeColors.primary.gradientStart,
  primaryGradientEnd: themeColors.primary.gradientEnd,

  // 天空衍生色
  skyCyan: themeColors.primary.skyCyan,
  skySoft: themeColors.primary.skySoft,
  skyDeep: themeColors.primary.skyDeep,

  // 收支语义色
  expense: themeColors.accounting.expense,
  expenseLight: themeColors.accounting.expenseLight,
  expenseBorder: themeColors.accounting.expenseBorder,
  income: themeColors.accounting.income,
  incomeLight: themeColors.accounting.incomeLight,
  incomeBorder: themeColors.accounting.incomeBorder,

  // 中性色 & 背景色
  background: themeColors.background.page,
  cardBackground: themeColors.background.card,
  cardAlt: themeColors.background.cardAlt,
  divider: themeColors.background.divider,
  border: themeColors.border.default,

  // 文字颜色
  textPrimary: themeColors.text.primary,
  textSecondary: themeColors.text.secondary,
  textMuted: themeColors.text.muted,
  textLight: themeColors.text.light,
  white: palette.common.white,

  // 状态色
  warning: themeColors.status.warning,
  warningLight: themeColors.status.warningLight,
  success: themeColors.status.success,
  danger: themeColors.status.danger,
  dangerLight: themeColors.status.dangerLight,

  // 阴影与遮罩
  shadow: themeColors.shadow.light,
  shadowMedium: themeColors.shadow.medium,
  modalOverlay: themeColors.shadow.modal,

  // 暴露结构化对象，便于链式访问
  theme: themeColors,
  palette,
} as const;
