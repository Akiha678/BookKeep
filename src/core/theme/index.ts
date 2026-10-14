/**
 * 核心主题与色彩管理模块 (Core Theme & Color System)
 * 提供主题色、背景色、按钮色、文字色、边框色、收支语义色与对应的色彩组件
 */

export * from './palette';
export * from './colors';
export * from './colorUtils';
export * from './ColorComponents';

// 默认导出 Colors，方便 `import Colors from '@/core/theme'` 或 `import { Colors } from '@/core/theme'`
import { Colors } from './colors';
export default Colors;
