import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Colors } from '../theme/colors';
import { authService } from '../services/authService';
import { cloudSync } from '../services/cloudSync';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'passwordLogin' | 'phoneLogin' | 'emailRegister';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialMode = 'passwordLogin',
}) => {
  const [tab, setTab] = useState<'passwordLogin' | 'phoneLogin' | 'emailRegister'>(initialMode);
  const [loading, setLoading] = useState(false);

  // 1. 账号密码登录表单
  const [account, setAccount] = useState('admin1');
  const [password, setPassword] = useState('123456');

  // 2. 手机验证码登录表单
  const [phone, setPhone] = useState('13800138000');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  // 3. 邮箱注册表单
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [emailCountdown, setEmailCountdown] = useState(0);

  useEffect(() => {
    if (visible) {
      setTab(initialMode);
    }
  }, [visible, initialMode]);

  // 手机验证码倒计时
  useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => setPhoneCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneCountdown]);

  // 邮箱验证码倒计时
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  // 快速填入内置管理员测试账号
  const handleQuickFillAdmin = () => {
    setAccount('admin1');
    setPassword('123456');
  };

  // 1. 提交账号密码登录
  const handlePasswordLogin = async () => {
    if (!account.trim() || !password.trim()) {
      Alert.alert('提示', '请输入用户名/邮箱及密码');
      return;
    }
    setLoading(true);
    const res = await authService.loginByPassword(account, password);
    setLoading(false);

    if (res.success) {
      Alert.alert('登录成功', `欢迎回来，${res.user?.displayName || account}！已连接云端同步。`);
      cloudSync.syncWithCloud();
      onSuccess?.();
      onClose();
    } else {
      Alert.alert('登录失败', res.message);
    }
  };

  // 2. 发送手机验证码
  const handleSendPhoneCode = async () => {
    if (!phone.trim()) {
      Alert.alert('提示', '请输入手机号');
      return;
    }
    setLoading(true);
    const res = await authService.sendSmsCode(phone);
    setLoading(false);

    if (res.success) {
      setPhoneCountdown(60);
      if (res.data) {
        setPhoneCode(String(res.data));
        Alert.alert('验证码已下发', `开发测试环境验证码：${res.data}（已为您自动填入）`);
      } else {
        Alert.alert('提示', '验证码已下发，请查收短信');
      }
    } else {
      Alert.alert('发送失败', res.message);
    }
  };

  // 提交手机登录/免密注册
  const handlePhoneLogin = async () => {
    if (!phone.trim() || !phoneCode.trim()) {
      Alert.alert('提示', '请输入手机号及 4 位验证码');
      return;
    }
    setLoading(true);
    const res = await authService.loginByPhone(phone, phoneCode);
    setLoading(false);

    if (res.success) {
      Alert.alert('登录成功', `手机号 ${phone} 快捷登录成功！已开启云端同步。`);
      cloudSync.syncWithCloud();
      onSuccess?.();
      onClose();
    } else {
      Alert.alert('登录失败', res.message);
    }
  };

  // 3. 发送邮箱注册验证码
  const handleSendEmailCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('提示', '请输入合法的邮箱地址');
      return;
    }
    setLoading(true);
    const res = await authService.sendRegisterEmailCode(email);
    setLoading(false);

    if (res.success) {
      setEmailCountdown(60);
      if (res.data && res.data.length === 4) {
        setEmailCode(res.data);
        Alert.alert('验证码提示', `测试环境验证码：${res.data}（已自动填入）`);
      } else {
        Alert.alert('提示', '验证码已发送至您的邮箱，请前往查收并在 5 分钟内使用');
      }
    } else {
      Alert.alert('发送失败', res.message);
    }
  };

  // 提交邮箱注册
  const handleEmailRegister = async () => {
    if (!email.trim() || !emailCode.trim() || !regPassword.trim()) {
      Alert.alert('提示', '请完整填写邮箱、验证码和密码');
      return;
    }
    if (regPassword.length < 6) {
      Alert.alert('提示', '密码长度至少需为 6 位');
      return;
    }
    setLoading(true);
    const res = await authService.registerByEmail(email, emailCode, regPassword);
    setLoading(false);

    if (res.success) {
      Alert.alert('注册成功', `恭喜注册成功，已自动登录并开启云端多端同步！`);
      cloudSync.syncWithCloud();
      onSuccess?.();
      onClose();
    } else {
      Alert.alert('注册失败', res.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* 顶部标题与关闭 */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.headerLogo}
                resizeMode="cover"
              />
              <Text style={styles.headerTitle}>三金记账 · 账号中心</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 模式选择 Tab */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, tab === 'passwordLogin' && styles.tabButtonActive]}
              onPress={() => setTab('passwordLogin')}
            >
              <Text style={[styles.tabButtonText, tab === 'passwordLogin' && styles.tabButtonTextActive]}>
                账号登录
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, tab === 'phoneLogin' && styles.tabButtonActive]}
              onPress={() => setTab('phoneLogin')}
            >
              <Text style={[styles.tabButtonText, tab === 'phoneLogin' && styles.tabButtonTextActive]}>
                手机快捷登录
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, tab === 'emailRegister' && styles.tabButtonActive]}
              onPress={() => setTab('emailRegister')}
            >
              <Text style={[styles.tabButtonText, tab === 'emailRegister' && styles.tabButtonTextActive]}>
                注册新账号
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Tab 1: 账号密码登录 */}
            {tab === 'passwordLogin' && (
              <View style={styles.formContainer}>
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>
                    💡 支持使用三金记账云端账号或邮箱登录。登录后，本地记账将自动增量同步到服务端云数据库。
                  </Text>
                </View>

                <Text style={styles.inputLabel}>登录账号（用户名 / 邮箱）</Text>
                <TextInput
                  style={styles.textInput}
                  value={account}
                  onChangeText={setAccount}
                  placeholder="例如: admin1 或 xin@example.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, styles.inputMarginTop]}>登录密码</Text>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="请输入密码 (如: 123456)"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={true}
                />

                <View style={styles.helperRow}>
                  <TouchableOpacity onPress={handleQuickFillAdmin}>
                    <Text style={styles.quickFillLink}>填入预置测试账号 (admin1 / 123456)</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>登 录 并 启 用 同 步</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Tab 2: 手机验证码快捷登录 */}
            {tab === 'phoneLogin' && (
              <View style={styles.formContainer}>
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>
                    📱 手机快捷登录：未注册过的手机号，在首次验证通过后将自动完成注册！
                  </Text>
                </View>

                <Text style={styles.inputLabel}>手机号码</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="请输入11位手机号"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />

                <Text style={[styles.inputLabel, styles.inputMarginTop]}>短信验证码</Text>
                <View style={styles.codeRow}>
                  <TextInput
                    style={[styles.textInput, styles.codeInput]}
                    value={phoneCode}
                    onChangeText={setPhoneCode}
                    placeholder="4位数字验证码"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendCodeBtn,
                      (loading || phoneCountdown > 0) && styles.sendCodeBtnDisabled,
                    ]}
                    onPress={handleSendPhoneCode}
                    disabled={loading || phoneCountdown > 0}
                  >
                    <Text style={styles.sendCodeBtnText}>
                      {phoneCountdown > 0 ? `${phoneCountdown}s 后重发` : '获取验证码'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handlePhoneLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>快 捷 登 录 / 免 密 注 册</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Tab 3: 邮箱注册新账号 */}
            {tab === 'emailRegister' && (
              <View style={styles.formContainer}>
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>
                    ✉️ 邮箱注册：输入邮箱获取 4 位验证码并设置密码即可快速注册独立账号。
                  </Text>
                </View>

                <Text style={styles.inputLabel}>注册邮箱</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="例如: yourname@domain.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, styles.inputMarginTop]}>邮箱验证码</Text>
                <View style={styles.codeRow}>
                  <TextInput
                    style={[styles.textInput, styles.codeInput]}
                    value={emailCode}
                    onChangeText={setEmailCode}
                    placeholder="4位数字验证码"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendCodeBtn,
                      (loading || emailCountdown > 0) && styles.sendCodeBtnDisabled,
                    ]}
                    onPress={handleSendEmailCode}
                    disabled={loading || emailCountdown > 0}
                  >
                    <Text style={styles.sendCodeBtnText}>
                      {emailCountdown > 0 ? `${emailCountdown}s 后重发` : '发送验证码'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, styles.inputMarginTop]}>设置登录密码</Text>
                <TextInput
                  style={styles.textInput}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  placeholder="设置6位以上新密码"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={true}
                />

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleEmailRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>注 册 并 立 即 登 录</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

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
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingTop: 18,
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
    marginBottom: 16,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 8,
  },
  titleIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  formScroll: {
    flexGrow: 0,
  },
  formContainer: {
    paddingVertical: 4,
  },
  tipBox: {
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    marginBottom: 14,
  },
  tipText: {
    fontSize: 12,
    color: Colors.primaryDark,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputMarginTop: {
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeInput: {
    flex: 1,
  },
  sendCodeBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCodeBtnDisabled: {
    opacity: 0.5,
  },
  sendCodeBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  quickFillLink: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bottomSpacer: {
    height: 30,
  },
});
