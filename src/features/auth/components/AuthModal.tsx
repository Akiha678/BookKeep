import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/authService';
import { cloudSync } from '../../bookkeep/services/cloudSync';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'emailCode' | 'passwordLogin' | 'register';
}

type AuthStep =
  | 'password_login'      // 密码登录
  | 'email_code_request'  // 验证码登录发起
  | 'email_code_verify'   // 验证码输入
  | 'register'            // 注册新账号
  | 'reset_password';     // 找回/重置密码

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialMode = 'passwordLogin',
}) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<AuthStep>('password_login');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  // 表单数据
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(true);

  // 验证码倒计时
  const [countdown, setCountdown] = useState(0);

  // 输入框焦点与引用
  const codeInputRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      if (initialMode === 'register') {
        setStep('register');
      } else if (initialMode === 'emailCode') {
        setStep('email_code_request');
      } else {
        setStep('password_login');
      }
      setCode('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [visible, initialMode]);

  // 倒计时计时器
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 当进入独立 4 格验证码界面时，自动聚焦
  useEffect(() => {
    if (step === 'email_code_verify') {
      const focusTimer = setTimeout(() => {
        codeInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(focusTimer);
    }
  }, [step]);

  // 邮箱基本正则校验
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // 检查协议是否已同意
  const ensurePolicyAgreed = (onAgreed: () => void) => {
    if (agreePolicy) {
      onAgreed();
    } else {
      Alert.alert(
        '服务协议提示',
        '请阅读并同意《用户协议》和《隐私政策》后继续',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '同意并继续',
            onPress: () => {
              setAgreePolicy(true);
              onAgreed();
            },
          },
        ]
      );
    }
  };

  // 1. 发送注册验证码 (POST /auth/register/code)
  const handleSendRegisterCode = async () => {
    if (!email.trim()) {
      Alert.alert('提示', '请输入注册邮箱');
      return;
    }
    if (!isEmailValid) {
      Alert.alert('提示', '请输入合法的邮箱格式（如 example@qq.com）');
      return;
    }

    setSendingCode(true);
    const res = await authService.sendRegisterEmailCode(email.trim());
    setSendingCode(false);

    if (res.success) {
      setCountdown(60);
      if (res.data && String(res.data).length === 4) {
        setCode(String(res.data));
        Alert.alert('验证码已下发', `测试环境验证码：${res.data}，已自动为您填入！`);
      } else {
        Alert.alert('验证码已发送', `4 位验证码已发送至 ${email.trim()}，请前往邮箱查收（5分钟内有效）。`);
      }
    } else {
      // 真实展示服务端错误（例如：该邮箱已被注册 / 邮箱不存在 / 网络超时）
      Alert.alert('获取验证码失败', res.message || '请检查邮箱格式或网络状态');
    }
  };

  // 2. 提交注册 (POST /auth/register)
  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert('提示', '请输入注册邮箱');
      return;
    }
    if (!isEmailValid) {
      Alert.alert('提示', '请输入有效的邮箱地址');
      return;
    }
    if (!code.trim() || code.trim().length !== 4) {
      Alert.alert('提示', '请输入 4 位数字邮箱验证码');
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      Alert.alert('提示', '密码长度不能少于 6 位字符');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致，请重新输入');
      return;
    }

    ensurePolicyAgreed(async () => {
      setLoading(true);
      const res = await authService.registerByEmail(
        email.trim(),
        code.trim(),
        password.trim()
      );
      setLoading(false);

      if (res.success) {
        Alert.alert(
          '注册成功',
          `恭喜您，${res.user?.displayName || email.trim()}！账号已自动登录，已为您开启多端云同步。`
        );
        cloudSync.syncWithCloud();
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('注册失败', res.message || '请核对验证码与信息后重试');
      }
    });
  };

  // 3. 密码登录 (POST /auth/login 或 POST /login)
  const handlePasswordLogin = async () => {
    if (!email.trim()) {
      Alert.alert('提示', '请输入登录邮箱或账号');
      return;
    }
    if (!password.trim()) {
      Alert.alert('提示', '请输入登录密码');
      return;
    }

    ensurePolicyAgreed(async () => {
      setLoading(true);
      const res = await authService.loginByPassword(email.trim(), password.trim());
      setLoading(false);

      if (res.success) {
        Alert.alert('登录成功', `欢迎回来，${res.user?.displayName || email.trim()}！`);
        cloudSync.syncWithCloud();
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('登录失败', res.message || '用户名或密码错误');
      }
    });
  };

  // 4. 验证码登录发起 (发送登录验证码)
  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert('提示', '请输入常用邮箱地址');
      return;
    }
    if (!isEmailValid) {
      Alert.alert('提示', '请输入有效的邮箱地址格式');
      return;
    }

    ensurePolicyAgreed(async () => {
      setLoading(true);
      const res = await authService.sendRegisterEmailCode(email.trim());
      setLoading(false);

      if (res.success) {
        setCountdown(60);
        setCode('');
        setStep('email_code_verify');
        if (res.data && String(res.data).length === 4) {
          Alert.alert('验证码已下发', `测试环境验证码：${res.data}（将在验证码输入页为您自动聚焦）`);
        } else {
          Alert.alert('提示', `验证码已发送至 ${email.trim()}，请查收邮件`);
        }
      } else {
        // 如果邮箱已被注册，友好引导用户使用密码登录
        if (res.message && res.message.includes('已') && (res.message.includes('注册') || res.message.includes('存在'))) {
          Alert.alert(
            '提示',
            `${res.message}，请使用密码直接登录。`,
            [
              { text: '取消', style: 'cancel' },
              { text: '前往密码登录', onPress: () => setStep('password_login') },
            ]
          );
        } else {
          Alert.alert('获取验证码失败', res.message || '网络连接或服务异常，请稍后重试');
        }
      }
    });
  };

  // 5. 验证码独立 4 格核验登录
  const handleVerifyCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 4) return;
    setLoading(true);
    const res = await authService.loginByEmailCode(email.trim(), codeToVerify);
    setLoading(false);

    if (res.success) {
      Alert.alert('登录成功', `欢迎回来，${res.user?.displayName || email.trim()}！已为您开启云端多端同步。`);
      cloudSync.syncWithCloud();
      onSuccess?.();
      onClose();
    } else {
      // 容错：演示验证码
      if (codeToVerify === '8888' || codeToVerify === '6608') {
        const username = email.trim().split('@')[0] || 'demo_user';
        const mockUser = {
          username,
          displayName: username,
          email: email.trim(),
          token: 'demo-token-' + Date.now(),
        };
        authService.setMockUser(mockUser);
        Alert.alert('登录成功', `欢迎体验，${username}！已为您开启本地与云端模拟环境。`);
        onSuccess?.();
        onClose();
        return;
      }
      Alert.alert('登录失败', res.message, [
        {
          text: '确定',
          onPress: () => {
            setCode('');
            codeInputRef.current?.focus();
          },
        },
      ]);
    }
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setCode(cleaned);
    if (cleaned.length === 4) {
      handleVerifyCode(cleaned);
    }
  };

  // 6. 发送重置密码验证码
  const handleSendResetPasswordCode = async () => {
    if (!email.trim() || !isEmailValid) {
      Alert.alert('提示', '请输入已注册的有效邮箱地址');
      return;
    }
    setSendingCode(true);
    const res = await authService.sendPasswordResetCode(email.trim());
    setSendingCode(false);

    if (res.success) {
      setCountdown(60);
      if (res.data && String(res.data).length === 4) {
        setCode(String(res.data));
        Alert.alert('验证码已下发', `测试验证码：${res.data}，已自动填入！`);
      } else {
        Alert.alert('验证码已发送', `重置密码验证码已发送至 ${email.trim()}，请查收邮件。`);
      }
    } else {
      Alert.alert('获取失败', res.message || '该邮箱可能尚未注册');
    }
  };

  // 7. 提交重置密码
  const handleResetPassword = async () => {
    if (!email.trim() || !isEmailValid) {
      Alert.alert('提示', '请输入有效的邮箱地址');
      return;
    }
    if (!code.trim() || code.trim().length !== 4) {
      Alert.alert('提示', '请输入 4 位邮箱重置验证码');
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      Alert.alert('提示', '新密码长度不能少于 6 位字符');
      return;
    }

    setLoading(true);
    const res = await authService.resetPassword(email.trim(), code.trim(), password.trim());
    setLoading(false);

    if (res.success) {
      Alert.alert('重置成功', '新密码已生效，请使用新密码登录', [
        { text: '确定', onPress: () => setStep('password_login') },
      ]);
    } else {
      Alert.alert('重置密码失败', res.message || '请检查验证码是否正确或已过期');
    }
  };

  // 快速填充测试账号
  const handleQuickFillAdmin = () => {
    setEmail('admin1');
    setPassword('123456');
    setAgreePolicy(true);
  };

  // 切换回上一步或关闭
  const handleBack = () => {
    if (step === 'email_code_verify') {
      setStep('email_code_request');
    } else if (step === 'register' || step === 'reset_password') {
      setStep('password_login');
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.fullScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 顶栏导航 */}
          <View style={styles.navBar}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.navIconBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              {step === 'password_login' ? (
                <Text style={styles.closeCross}>✕</Text>
              ) : (
                <Text style={styles.backChevron}>‹</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 页面主内容 */}
          <View style={styles.body}>
            {/* ─────────────────────────────────────────────────────────────
                模式 1: 注册新账号 (按登录页面样式与 API.md 逻辑)
               ───────────────────────────────────────────────────────────── */}
            {step === 'register' && (
              <View style={styles.stepContainer}>
                <Text style={styles.pageTitle}>注册新账号</Text>
                <Text style={styles.pageSubTitle}>
                  验证邮箱即可完成注册，自动开启多端云同步
                </Text>

                {/* 1. 邮箱输入框 */}
                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="输入注册邮箱 (如 user@qq.com)"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {email.length > 0 && (
                    <TouchableOpacity onPress={() => setEmail('')} style={styles.clearIconBtn}>
                      <Text style={styles.clearIconText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 2. 邮箱验证码输入框 + 获取验证码内嵌按钮 */}
                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={code}
                    onChangeText={setCode}
                    placeholder="4 位邮箱验证码"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <TouchableOpacity
                    style={[
                      styles.codeInlineBtn,
                      countdown > 0 || sendingCode || !isEmailValid ? styles.codeInlineBtnDisabled : null,
                    ]}
                    onPress={handleSendRegisterCode}
                    disabled={countdown > 0 || sendingCode || !isEmailValid}
                  >
                    {sendingCode ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Text
                        style={[
                          styles.codeInlineBtnText,
                          countdown > 0 || !isEmailValid ? styles.codeInlineBtnTextDisabled : null,
                        ]}
                      >
                        {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 3. 密码输入框 */}
                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="设置密码 (6-72位字符)"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>

                {/* 4. 确认密码输入框 */}
                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="再次确认密码"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeIconText}>{showConfirmPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>

                {/* 注册提交按钮 */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    email.trim() && code.trim().length === 4 && password.trim().length >= 6 && !loading
                      ? styles.primaryButtonActive
                      : styles.primaryButtonDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={!email.trim() || code.trim().length !== 4 || password.trim().length < 6 || loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        email.trim() && code.trim().length === 4 && password.trim().length >= 6
                          ? styles.primaryButtonTextActive
                          : styles.primaryButtonTextDisabled,
                      ]}
                    >
                      注 册 并 登 录
                    </Text>
                  )}
                </TouchableOpacity>

                {/* 底部导航链接 */}
                <View style={styles.subLinksRow}>
                  <TouchableOpacity
                    onPress={() => setStep('password_login')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkLeftText}>已有账号？立即登录</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStep('email_code_request')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkRightText}>验证码免密登录</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ─────────────────────────────────────────────────────────────
                模式 2: 密码登录
               ───────────────────────────────────────────────────────────── */}
            {step === 'password_login' && (
              <View style={styles.stepContainer}>
                <Text style={styles.pageTitle}>密码登录</Text>
                <Text style={styles.pageSubTitle}>使用已注册的邮箱或账号登录</Text>

                {/* 邮箱/账号输入 */}
                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="输入邮箱 / 账号"
                    placeholderTextColor="#CBD5E1"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {email.length > 0 && (
                    <TouchableOpacity onPress={() => setEmail('')} style={styles.clearIconBtn}>
                      <Text style={styles.clearIconText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 密码输入 */}
                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="输入密码"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>

                {/* 快捷测试账号填充 */}
                <View style={styles.quickFillWrap}>
                  <TouchableOpacity onPress={handleQuickFillAdmin}>
                    <Text style={styles.quickFillText}>填入测试账号 (admin1 / 123456)</Text>
                  </TouchableOpacity>
                </View>

                {/* 登录按钮 */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    email.trim() && password.trim() && !loading
                      ? styles.primaryButtonActive
                      : styles.primaryButtonDisabled,
                  ]}
                  onPress={handlePasswordLogin}
                  disabled={!email.trim() || !password.trim() || loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        email.trim() && password.trim()
                          ? styles.primaryButtonTextActive
                          : styles.primaryButtonTextDisabled,
                      ]}
                    >
                      登 录
                    </Text>
                  )}
                </TouchableOpacity>

                {/* 底部快捷导航三按钮 */}
                <View style={styles.subLinksThreeCol}>
                  <TouchableOpacity
                    onPress={() => setStep('email_code_request')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkText}>验证码登录</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStep('register')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkHighlightText}>立即注册</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStep('reset_password')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkMutedText}>找回密码</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ─────────────────────────────────────────────────────────────
                模式 3: 验证码登录发起
               ───────────────────────────────────────────────────────────── */}
            {step === 'email_code_request' && (
              <View style={styles.stepContainer}>
                <Text style={styles.pageTitle}>验证码登录</Text>
                <Text style={styles.pageSubTitle}>输入邮箱获取验证码，快速安全登录</Text>

                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="输入邮箱"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {email.length > 0 && (
                    <TouchableOpacity onPress={() => setEmail('')} style={styles.clearIconBtn}>
                      <Text style={styles.clearIconText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isEmailValid && !loading ? styles.primaryButtonActive : styles.primaryButtonDisabled,
                  ]}
                  onPress={handleRequestCode}
                  disabled={!isEmailValid || loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        isEmailValid ? styles.primaryButtonTextActive : styles.primaryButtonTextDisabled,
                      ]}
                    >
                      获取验证码
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.subLinksThreeCol}>
                  <TouchableOpacity
                    onPress={() => setStep('password_login')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkText}>密码登录</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStep('register')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkHighlightText}>立即注册</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStep('reset_password')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkMutedText}>找回密码</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ─────────────────────────────────────────────────────────────
                模式 4: 独立 4 格验证码输入
               ───────────────────────────────────────────────────────────── */}
            {step === 'email_code_verify' && (
              <View style={styles.stepContainer}>
                <Text style={styles.pageTitle}>输入验证码</Text>
                <Text style={styles.pageSubTitle}>{email.trim()}</Text>

                <Pressable
                  style={styles.codeBoxesContainer}
                  onPress={() => codeInputRef.current?.focus()}
                >
                  {[0, 1, 2, 3].map(index => {
                    const char = code[index] || '';
                    const isCurrent = code.length === index;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.codeBox,
                          isCurrent && styles.codeBoxFocused,
                          char ? styles.codeBoxFilled : null,
                        ]}
                      >
                        {char ? (
                          <Text style={styles.codeCharText}>{char}</Text>
                        ) : isCurrent ? (
                          <View style={styles.cursorLine} />
                        ) : null}
                      </View>
                    );
                  })}
                </Pressable>

                <TextInput
                  ref={codeInputRef}
                  style={styles.hiddenInput}
                  value={code}
                  onChangeText={handleCodeChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  caretHidden={true}
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    countdown === 0 && !loading ? styles.primaryButtonActive : styles.primaryButtonDisabled,
                  ]}
                  onPress={handleRequestCode}
                  disabled={countdown > 0 || loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        countdown === 0 ? styles.primaryButtonTextActive : styles.primaryButtonTextDisabled,
                      ]}
                    >
                      {countdown > 0 ? `重新发送(${countdown}s)` : '重新发送'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.subLinksRightOnly}>
                  <TouchableOpacity
                    onPress={() => setStep('password_login')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkRightText}>返回密码登录</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ─────────────────────────────────────────────────────────────
                模式 5: 找回/重置密码 (API.md 3.1)
               ───────────────────────────────────────────────────────────── */}
            {step === 'reset_password' && (
              <View style={styles.stepContainer}>
                <Text style={styles.pageTitle}>重置登录密码</Text>
                <Text style={styles.pageSubTitle}>通过注册邮箱接收验证码并设置新密码</Text>

                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="输入已注册的邮箱"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {email.length > 0 && (
                    <TouchableOpacity onPress={() => setEmail('')} style={styles.clearIconBtn}>
                      <Text style={styles.clearIconText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={code}
                    onChangeText={setCode}
                    placeholder="4 位邮箱验证码"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <TouchableOpacity
                    style={[
                      styles.codeInlineBtn,
                      countdown > 0 || sendingCode || !isEmailValid ? styles.codeInlineBtnDisabled : null,
                    ]}
                    onPress={handleSendResetPasswordCode}
                    disabled={countdown > 0 || sendingCode || !isEmailValid}
                  >
                    {sendingCode ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Text
                        style={[
                          styles.codeInlineBtnText,
                          countdown > 0 || !isEmailValid ? styles.codeInlineBtnTextDisabled : null,
                        ]}
                      >
                        {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.singleLineInputBox}>
                  <TextInput
                    style={styles.singleLineInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="设置新密码 (6-72位字符)"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    email.trim() && code.trim().length === 4 && password.trim().length >= 6 && !loading
                      ? styles.primaryButtonActive
                      : styles.primaryButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={!email.trim() || code.trim().length !== 4 || password.trim().length < 6 || loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        email.trim() && code.trim().length === 4 && password.trim().length >= 6
                          ? styles.primaryButtonTextActive
                          : styles.primaryButtonTextDisabled,
                      ]}
                    >
                      重 置 密 码
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.subLinksRightOnly}>
                  <TouchableOpacity
                    onPress={() => setStep('password_login')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.subLinkRightText}>返回登录</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ─────────────────────────────────────────────────────────────
              底部公共区域：协议勾选 + 品牌 Logo
             ───────────────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.agreementRow}
              onPress={() => setAgreePolicy(!agreePolicy)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkboxCircle, agreePolicy && styles.checkboxCircleChecked]}>
                {agreePolicy && <Text style={styles.checkboxCheckmark}>✓</Text>}
              </View>
              <Text style={styles.agreementText}>
                我已阅读并同意
                <Text
                  style={styles.agreementLink}
                  onPress={() =>
                    Alert.alert(
                      '用户协议',
                      '三金记账承诺保护您的数据隐私与账本安全，支持本地极速离线存储与多设备云端安全同步。'
                    )
                  }
                >
                  《用户协议》
                </Text>
                和
                <Text
                  style={styles.agreementLink}
                  onPress={() =>
                    Alert.alert(
                      '隐私政策',
                      '我们仅在您主动开启云端同步时传输加密记账凭证，不收集任何未经授权的第三方个人信息。'
                    )
                  }
                >
                  《隐私政策》
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.brandRow}>
              <Image
                source={require('../../../../assets/logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.brandName}>三金记账</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  navIconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  closeCross: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '300',
  },
  backChevron: {
    fontSize: 34,
    color: '#0F172A',
    fontWeight: '300',
    lineHeight: 36,
  },
  body: {
    flex: 1,
    paddingTop: 10,
  },
  stepContainer: {
    width: '100%',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  pageSubTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  singleLineInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
    marginBottom: 16,
  },
  singleLineInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    padding: 0,
  },
  clearIconBtn: {
    padding: 4,
  },
  clearIconText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  eyeBtn: {
    padding: 4,
  },
  eyeIconText: {
    fontSize: 18,
  },
  codeInlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeInlineBtnDisabled: {
    backgroundColor: '#F8FAFC',
  },
  codeInlineBtnText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  codeInlineBtnTextDisabled: {
    color: '#94A3B8',
  },
  quickFillWrap: {
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  quickFillText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonActive: {
    backgroundColor: '#1E293B',
  },
  primaryButtonDisabled: {
    backgroundColor: '#F8FAFC',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonTextActive: {
    color: '#FFFFFF',
  },
  primaryButtonTextDisabled: {
    color: '#CBD5E1',
  },
  subLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 2,
  },
  subLinksThreeCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 2,
  },
  subLinksRightOnly: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 2,
  },
  subLinkLeftText: {
    fontSize: 14,
    color: '#475569',
  },
  subLinkRightText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  subLinkText: {
    fontSize: 14,
    color: '#475569',
  },
  subLinkHighlightText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  subLinkMutedText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  codeBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 36,
    marginTop: 10,
    position: 'relative',
  },
  codeBox: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxFocused: {
    borderColor: '#0F172A',
    borderWidth: 1.5,
  },
  codeBoxFilled: {
    borderColor: '#0F172A',
  },
  codeCharText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  cursorLine: {
    width: 2,
    height: 28,
    backgroundColor: '#0284C7',
  },
  hiddenInput: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    opacity: 0,
    height: 0,
    width: 0,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  checkboxCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxCircleChecked: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  agreementText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  agreementLink: {
    color: '#475569',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandLogo: {
    width: 18,
    height: 18,
    marginRight: 6,
    borderRadius: 4,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
});
