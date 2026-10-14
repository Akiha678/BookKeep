import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewProps,
  TextProps,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { themeColors, Colors } from './colors';

// ---------------------------------------------------------------------------
// 1. useThemeColors Hook
// ---------------------------------------------------------------------------
export function useThemeColors() {
  return {
    colors: Colors,
    theme: themeColors,
  };
}

// ---------------------------------------------------------------------------
// 2. ThemedView (ColorView) 背景与容器颜色组件
// ---------------------------------------------------------------------------
export type BackgroundVariant =
  | 'page'
  | 'card'
  | 'cardAlt'
  | 'input'
  | 'modal'
  | 'primary'
  | 'primaryLight'
  | 'transparent';

export type BorderVariant =
  | 'none'
  | 'default'
  | 'subtle'
  | 'primary'
  | 'danger';

export interface ThemedViewProps extends ViewProps {
  bg?: BackgroundVariant;
  border?: BorderVariant;
  rounded?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const ThemedView: React.FC<ThemedViewProps> = ({
  bg = 'card',
  border = 'none',
  rounded,
  padding,
  style,
  children,
  ...rest
}) => {
  const getBgColor = (): string => {
    switch (bg) {
      case 'page':
        return themeColors.background.page;
      case 'card':
        return themeColors.background.card;
      case 'cardAlt':
        return themeColors.background.cardAlt;
      case 'input':
        return themeColors.background.input;
      case 'modal':
        return themeColors.background.modal;
      case 'primary':
        return themeColors.primary.main;
      case 'primaryLight':
        return themeColors.primary.light;
      case 'transparent':
        return 'transparent';
      default:
        return themeColors.background.card;
    }
  };

  const getBorderColor = (): string | undefined => {
    switch (border) {
      case 'default':
        return themeColors.border.default;
      case 'subtle':
        return themeColors.border.subtle;
      case 'primary':
        return themeColors.border.primary;
      case 'danger':
        return themeColors.border.danger;
      default:
        return undefined;
    }
  };

  const dynamicStyle: ViewStyle = {
    backgroundColor: getBgColor(),
    ...(border !== 'none'
      ? { borderWidth: 1, borderColor: getBorderColor() }
      : {}),
    ...(rounded !== undefined ? { borderRadius: rounded } : {}),
    ...(padding !== undefined ? { padding } : {}),
  };

  return (
    <View style={[dynamicStyle, style]} {...rest}>
      {children}
    </View>
  );
};

// ---------------------------------------------------------------------------
// 3. ThemedText (ColorText) 文本排版与语义颜色组件
// ---------------------------------------------------------------------------
export type TextColorVariant =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'light'
  | 'inverse'
  | 'link'
  | 'expense'
  | 'income'
  | 'warning'
  | 'danger';

export type TextSizeVariant = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type TextWeightVariant = 'normal' | 'medium' | 'semibold' | 'bold';

export interface ThemedTextProps extends TextProps {
  color?: TextColorVariant;
  size?: TextSizeVariant;
  weight?: TextWeightVariant;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  color = 'primary',
  size = 'base',
  weight = 'normal',
  style,
  children,
  ...rest
}) => {
  const getTextColor = (): string => {
    switch (color) {
      case 'primary':
        return themeColors.text.primary;
      case 'secondary':
        return themeColors.text.secondary;
      case 'muted':
        return themeColors.text.muted;
      case 'light':
        return themeColors.text.light;
      case 'inverse':
        return themeColors.text.inverse;
      case 'link':
        return themeColors.text.link;
      case 'expense':
        return themeColors.accounting.expense;
      case 'income':
        return themeColors.accounting.income;
      case 'warning':
        return themeColors.status.warning;
      case 'danger':
        return themeColors.status.danger;
      default:
        return themeColors.text.primary;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'xs':
        return 12;
      case 'sm':
        return 14;
      case 'base':
        return 16;
      case 'lg':
        return 18;
      case 'xl':
        return 22;
      case '2xl':
        return 28;
      default:
        return 16;
    }
  };

  const getFontWeight = (): TextStyle['fontWeight'] => {
    switch (weight) {
      case 'medium':
        return '500';
      case 'semibold':
        return '600';
      case 'bold':
        return '700';
      default:
        return '400';
    }
  };

  const dynamicStyle: TextStyle = {
    color: getTextColor(),
    fontSize: getFontSize(),
    fontWeight: getFontWeight(),
  };

  return (
    <Text style={[dynamicStyle, style]} {...rest}>
      {children}
    </Text>
  );
};

// ---------------------------------------------------------------------------
// 4. ThemedButton (ColorButton) 按钮颜色与变体组件
// ---------------------------------------------------------------------------
export type ButtonVariant =
  | 'primary'   // 黑盒/深色高质感主按钮
  | 'theme'     // 品牌天空蓝按钮
  | 'secondary' // 浅灰中性按钮
  | 'outline'   // 蓝色边框按钮
  | 'danger'    // 危险操作按钮
  | 'success';  // 成功绿色按钮

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ThemedButtonProps extends TouchableOpacityProps {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  variant = 'theme',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  children,
  ...rest
}) => {
  const getButtonStyles = () => {
    const isInactive = disabled || loading;

    switch (variant) {
      case 'primary': {
        const conf = themeColors.button.primary;
        return {
          bg: isInactive ? conf.disabledBg : conf.background,
          textColor: isInactive ? conf.disabledText : conf.text,
          border: undefined,
        };
      }
      case 'secondary': {
        const conf = themeColors.button.secondary;
        return {
          bg: isInactive ? themeColors.background.cardAlt : conf.background,
          textColor: isInactive ? themeColors.text.light : conf.text,
          border: conf.border,
        };
      }
      case 'outline': {
        const conf = themeColors.button.outline;
        return {
          bg: conf.background,
          textColor: isInactive ? themeColors.text.light : conf.text,
          border: isInactive ? themeColors.border.default : conf.border,
        };
      }
      case 'danger': {
        const conf = themeColors.button.danger;
        return {
          bg: isInactive ? conf.lightBg : conf.background,
          textColor: isInactive ? conf.lightText : conf.text,
          border: undefined,
        };
      }
      case 'success': {
        const conf = themeColors.button.success;
        return {
          bg: isInactive ? conf.lightBg : conf.background,
          textColor: isInactive ? conf.lightText : conf.text,
          border: undefined,
        };
      }
      case 'theme':
      default: {
        const conf = themeColors.button.theme;
        return {
          bg: isInactive ? conf.disabledBg : conf.background,
          textColor: isInactive ? conf.disabledText : conf.text,
          border: undefined,
        };
      }
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          height: 36,
          paddingHorizontal: 12,
          borderRadius: 6,
          fontSize: 13,
        };
      case 'lg':
        return {
          height: 52,
          paddingHorizontal: 24,
          borderRadius: 8,
          fontSize: 16,
        };
      case 'md':
      default:
        return {
          height: 44,
          paddingHorizontal: 16,
          borderRadius: 8,
          fontSize: 15,
        };
    }
  };

  const btnStyle = getButtonStyles();
  const sizeStyle = getSizeStyles();

  const containerStyle: ViewStyle = {
    height: sizeStyle.height,
    paddingHorizontal: sizeStyle.paddingHorizontal,
    borderRadius: sizeStyle.borderRadius,
    backgroundColor: btnStyle.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(btnStyle.border
      ? { borderWidth: 1, borderColor: btnStyle.border }
      : {}),
  };

  const labelStyle: TextStyle = {
    color: btnStyle.textColor,
    fontSize: sizeStyle.fontSize,
    fontWeight: '600',
  };

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={btnStyle.textColor} />
      ) : (
        <>
          {icon && <View style={styles.iconMargin}>{icon}</View>}
          {title ? (
            <Text style={[labelStyle, textStyle]}>{title}</Text>
          ) : (
            children
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconMargin: {
    marginRight: 6,
  },
});
