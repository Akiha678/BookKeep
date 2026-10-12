import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { SyncStatus, UserInfo } from '../type/bookkeep';
import { storage } from '../services/storage';
import { cloudSync } from '../services/cloudSync';
import { authService } from '../services/authService';

interface MineViewProps {
  currentUser: UserInfo | null;
  syncStatus: SyncStatus;
  onOpenAuth: () => void;
  onTriggerSync: () => void;
}

export const MineView: React.FC<MineViewProps> = ({
  currentUser,
  syncStatus,
  onTriggerSync,
}) => {
  // 配置与高级设置
  const [config, setConfig] = useState(storage.getSyncConfig());
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [serverUrl, setServerUrl] = useState(config.serverUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);

  // ── 未登录认证表单状态 ──
  // 默认停留在用户指定的「邮箱注册」界面
  const [authTab, setAuthTab] = useState<'emailRegister' | 'accountLogin' | 'phoneLogin'>('emailRegister');
  const [loading, setLoading] = useState(false);

  // 1. 邮箱注册表单字段
  const [regEmail, setRegEmail] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);

  // 2. 账号密码登录表单字段
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // 3. 手机快捷登录表单字段
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  // 倒计时计时器
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (emailCountdown > 0) {
      timer = setTimeout(() => setEmailCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [emailCountdown]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (phoneCountdown > 0) {
      timer = setTimeout(() => setPhoneCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [phoneCountdown]);

  useEffect(() => {
    const latest = storage.getSyncConfig();
    setConfig(latest);
    setAutoSync(latest.autoSync);
    setServerUrl(latest.serverUrl);
  }, [currentUser]);

  const localCount = storage.getTransactions().length;
  const unsyncedCount = storage.getUnsyncedTransactions().length;
  const lastError = cloudSync.getLastError();

  const lastSyncDateStr =
    config.lastSyncTime && config.lastSyncTime > 0
      ? new Date(config.lastSyncTime).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '尚未同步';

  // ── 认证处理函数 ──

  // 发送邮箱注册验证码
  const handleSendEmailCode = async () => {
    if (!regEmail.trim() || !regEmail.includes('@')) {
      Alert.alert('提示', '请输入合法的邮箱地址');
      return;
    }
    setLoading(true);
    const res = await authService.sendRegisterEmailCode(regEmail);
    setLoading(false);

    if (res.success) {
      setEmailCountdown(60);
      if (res.data && String(res.data).length === 4) {
        setRegCode(String(res.data));
        Alert.alert('验证码提示', `开发测试环境验证码：${res.data}（已为您自动填入）`);
      } else {
        Alert.alert('提示', '验证码已发送至您的邮箱，请前往查收并在 5 分钟内使用');
      }
    } else {
      Alert.alert('发送失败', res.message);
    }
  };

  // 提交邮箱注册
  const handleEmailRegister = async () => {
    if (!regEmail.trim() || !regEmail.includes('@')) {
      Alert.alert('提示', '请输入有效的邮箱地址');
      return;
    }
    if (!regCode.trim() || regCode.trim().length !== 4) {
      Alert.alert('提示', '请输入 4 位数字邮箱验证码');
      return;
    }
    if (regPassword.length < 6) {
      Alert.alert('提示', '密码长度至少需为 6 位');
      return;
    }
    setLoading(true);
    const res = await authService.registerByEmail(regEmail, regCode, regPassword);
    setLoading(false);

    if (res.success) {
      Alert.alert('注册成功', '恭喜注册成功，已自动登录并开启云端多设备实时同步！');
      cloudSync.syncWithCloud();
    } else {
      Alert.alert('注册失败', res.message);
    }
  };

  // 账号密码登录
  const handleAccountLogin = async () => {
    if (!loginAccount.trim()) {
      Alert.alert('提示', '请输入登录账号或邮箱');
      return;
    }
    if (!loginPassword) {
      Alert.alert('提示', '请输入登录密码');
      return;
    }
    setLoading(true);
    const res = await authService.loginByPassword(loginAccount, loginPassword);
    setLoading(false);

    if (res.success) {
      Alert.alert('登录成功', `欢迎回来，${res.user?.displayName || res.user?.username}！`);
      cloudSync.syncWithCloud();
    } else {
      Alert.alert('登录失败', res.message);
    }
  };

  // 发送手机短信验证码
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
        Alert.alert('验证码已下发', `开发测试环境验证码：${res.data}（已自动填入）`);
      } else {
        Alert.alert('提示', '短信验证码已下发，请注意查收');
      }
    } else {
      Alert.alert('发送失败', res.message);
    }
  };

  // 手机快捷登录
  const handlePhoneLogin = async () => {
    if (!phone.trim() || !phoneCode.trim()) {
      Alert.alert('提示', '请输入手机号及 4 位验证码');
      return;
    }
    setLoading(true);
    const res = await authService.loginByPhone(phone, phoneCode);
    setLoading(false);

    if (res.success) {
      Alert.alert('登录成功', `手机号 ${phone} 快捷登录成功！`);
      cloudSync.syncWithCloud();
    } else {
      Alert.alert('登录失败', res.message);
    }
  };

  // ── 已登录管理处理函数 ──

  const handleSaveAdvancedConfig = () => {
    storage.updateSyncConfig({
      autoSync,
      serverUrl: serverUrl.trim(),
    });
    setConfig(storage.getSyncConfig());
    Alert.alert('设置成功', '服务端接口地址已更新');
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确定退出当前账号吗？退出后将暂停云端数据同步。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定退出',
        style: 'destructive',
        onPress: async () => {
          await authService.logoff();
          Alert.alert('已退出', '当前账号已退出登录');
        },
      },
    ]);
  };

  const handleExport = () => {
    const jsonStr = storage.exportDataJson();
    setBackupJson(jsonStr);
    setShowJsonInput(true);
    Alert.alert(
      '备份导出成功',
      `共导出 ${localCount} 笔记账记录。\n已填入下方文本框中，可直接复制备份。`
    );
  };

  const handleImport = () => {
    if (!backupJson.trim()) {
      Alert.alert('提示', '请输入备份的 JSON 字符串');
      return;
    }
    const result = storage.importDataJson(backupJson.trim());
    if (result.success) {
      Alert.alert('恢复成功', `成功从备份恢复/合并 ${result.count} 笔记账记录！`);
      setBackupJson('');
      setShowJsonInput(false);
    } else {
      Alert.alert('恢复失败', result.error || '数据格式不合法');
    }
  };

  const handleClear = () => {
    Alert.alert('清空本地账本', '确定清空本地所有记账数据吗？未同步的本地记录将会被清除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定清空',
        style: 'destructive',
        onPress: () => {
          storage.clearAllData();
          Alert.alert('已清空', '本地记账数据已全部清空');
        },
      },
    ]);
  };

  // ═════════════════════════════════════════════════════════════════════
  // 渲染：未登录状态 ── 主流现代风格注册 / 登录 UI
  // ═════════════════════════════════════════════════════════════════════
  if (!currentUser) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.authScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. 顶部品牌 Branding 区域 */}
          <View style={styles.authBrandSection}>
            <View style={styles.authLogoWrap}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.authLogoImg}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.authBrandTitle}>三金记账</Text>
            <Text style={styles.authBrandSlogan}>纯粹记账 · 开启云端多设备实时同步</Text>
          </View>

          {/* 2. 主流风格 Segmented 切换胶囊栏 */}
          <View style={styles.authSegmentBar}>
            <TouchableOpacity
              style={[styles.authSegmentItem, authTab === 'emailRegister' && styles.authSegmentItemActive]}
              onPress={() => setAuthTab('emailRegister')}
              activeOpacity={0.8}
            >
              <Text style={[styles.authSegmentText, authTab === 'emailRegister' && styles.authSegmentTextActive]}>
                邮箱注册
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authSegmentItem, authTab === 'accountLogin' && styles.authSegmentItemActive]}
              onPress={() => setAuthTab('accountLogin')}
              activeOpacity={0.8}
            >
              <Text style={[styles.authSegmentText, authTab === 'accountLogin' && styles.authSegmentTextActive]}>
                账号登录
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authSegmentItem, authTab === 'phoneLogin' && styles.authSegmentItemActive]}
              onPress={() => setAuthTab('phoneLogin')}
              activeOpacity={0.8}
            >
              <Text style={[styles.authSegmentText, authTab === 'phoneLogin' && styles.authSegmentTextActive]}>
                手机快捷
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. 核心表单主卡片 */}
          <View style={styles.authFormCard}>
            {/* ───── TAB 1: 邮箱注册 (默认首选) ───── */}
            {authTab === 'emailRegister' && (
              <View>
                <View style={styles.authTipBanner}>
                  <Text style={styles.authTipText}>
                    ✉️ 输入邮箱即可快速开通云账号，享受账目永不丢失的云端实时同步。
                  </Text>
                </View>

                {/* 邮箱输入 */}
                <Text style={styles.fieldLabel}>电子邮箱</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefixIcon}>📧</Text>
                  <TextInput
                    style={styles.inputField}
                    value={regEmail}
                    onChangeText={setRegEmail}
                    placeholder="请输入常用邮箱地址 (如 user@example.com)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* 验证码输入 */}
                <Text style={styles.fieldLabel}>邮箱验证码</Text>
                <View style={styles.codeRowBox}>
                  <View style={[styles.inputBox, styles.codeInputFlex]}>
                    <Text style={styles.inputPrefixIcon}>🔢</Text>
                    <TextInput
                      style={styles.inputField}
                      value={regCode}
                      onChangeText={setRegCode}
                      placeholder="4 位验证码"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.sendCodePill,
                      (loading || emailCountdown > 0) && styles.sendCodePillDisabled,
                    ]}
                    onPress={handleSendEmailCode}
                    disabled={loading || emailCountdown > 0}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sendCodePillText}>
                      {emailCountdown > 0 ? `${emailCountdown}s` : '获取验证码'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 密码输入 */}
                <Text style={styles.fieldLabel}>设置登录密码</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefixIcon}>🔒</Text>
                  <TextInput
                    style={styles.inputField}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    placeholder="设置 6 位及以上安全密码"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showRegPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowRegPassword(!showRegPassword)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeBtnText}>{showRegPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>

                {/* 提交注册大按钮 */}
                <TouchableOpacity
                  style={[styles.authSubmitBtn, loading && styles.authSubmitBtnDisabled]}
                  onPress={handleEmailRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.authSubmitBtnText}>注 册 并 立 即 登 录</Text>
                  )}
                </TouchableOpacity>

                {/* 底部已有账号切换提示 */}
                <TouchableOpacity
                  style={styles.switchAuthLink}
                  onPress={() => setAuthTab('accountLogin')}
                >
                  <Text style={styles.switchAuthText}>
                    已有三金记账账号？<Text style={styles.switchAuthHighlight}>立即登录</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ───── TAB 2: 账号密码登录 ───── */}
            {authTab === 'accountLogin' && (
              <View>
                <View style={styles.authTipBanner}>
                  <Text style={styles.authTipText}>
                    🔑 支持使用已注册的用户名或邮箱及密码登录，立即同步您的本地账本。
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>账号 / 邮箱</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefixIcon}>👤</Text>
                  <TextInput
                    style={styles.inputField}
                    value={loginAccount}
                    onChangeText={setLoginAccount}
                    placeholder="输入用户名或注册邮箱"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.fieldLabel}>登录密码</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefixIcon}>🔒</Text>
                  <TextInput
                    style={styles.inputField}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="输入账号密码"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showLoginPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowLoginPassword(!showLoginPassword)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeBtnText}>{showLoginPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.authSubmitBtn, loading && styles.authSubmitBtnDisabled]}
                  onPress={handleAccountLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.authSubmitBtnText}>立 即 登 录</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchAuthLink}
                  onPress={() => setAuthTab('emailRegister')}
                >
                  <Text style={styles.switchAuthText}>
                    还没有账号？<Text style={styles.switchAuthHighlight}>免费注册新账号</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ───── TAB 3: 手机免密登录 ───── */}
            {authTab === 'phoneLogin' && (
              <View>
                <View style={styles.authTipBanner}>
                  <Text style={styles.authTipText}>
                    📱 手机验证码一键免密登录，若手机号尚未注册将自动为您开通账户。
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>手机号码</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefixIcon}>📱</Text>
                  <TextInput
                    style={styles.inputField}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="11 位中国大陆手机号码"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={styles.fieldLabel}>短信验证码</Text>
                <View style={styles.codeRowBox}>
                  <View style={[styles.inputBox, styles.codeInputFlex]}>
                    <Text style={styles.inputPrefixIcon}>🔢</Text>
                    <TextInput
                      style={styles.inputField}
                      value={phoneCode}
                      onChangeText={setPhoneCode}
                      placeholder="4 位验证码"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.sendCodePill,
                      (loading || phoneCountdown > 0) && styles.sendCodePillDisabled,
                    ]}
                    onPress={handleSendPhoneCode}
                    disabled={loading || phoneCountdown > 0}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sendCodePillText}>
                      {phoneCountdown > 0 ? `${phoneCountdown}s` : '获取验证码'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.authSubmitBtn, loading && styles.authSubmitBtnDisabled]}
                  onPress={handlePhoneLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.authSubmitBtnText}>一 键 免 密 登 录</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchAuthLink}
                  onPress={() => setAuthTab('emailRegister')}
                >
                  <Text style={styles.switchAuthText}>
                    使用邮箱注册账号？<Text style={styles.switchAuthHighlight}>去邮箱注册</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 4. 底部离线自由记账与协议说明 */}
          <View style={styles.authBottomNoteSection}>
            <Text style={styles.agreementText}>
              注册即表示同意《用户服务协议》与《隐私政策》
            </Text>
            <View style={styles.offlineTipBox}>
              <Text style={styles.offlineTipText}>
                💡 离线记账友好：未登录时所有账目均完整加密保存在本地；登录后将无缝开启云端实时自动同步。
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // 渲染：已登录状态 ── 完整的个人中心与云同步管理面板
  // ═════════════════════════════════════════════════════════════════════
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 顶部标题栏 */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoIcon}
            resizeMode="cover"
          />
          <Text style={styles.appBarTitle}>个人中心</Text>
        </View>
        <Text style={styles.appBarSub}>三金记账 v1.0.0</Text>
      </View>

      {/* 1. 用户账号身份卡片 */}
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>
            {currentUser.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : '👤'}
          </Text>
        </View>
        <View style={styles.userMeta}>
          <View style={styles.userNameRow}>
            <Text style={styles.userNameText}>{currentUser.displayName || currentUser.username}</Text>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>已登录</Text>
            </View>
          </View>
          <Text style={styles.userSubText}>
            账号: {currentUser.username}
            {currentUser.email ? ` | ${currentUser.email}` : ''}
            {currentUser.phone ? ` | ${currentUser.phone}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>退出</Text>
        </TouchableOpacity>
      </View>

      {/* 2. 同步状态看板 */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.statusCardTitle}>云端同步状态</Text>
          <View
            style={[
              styles.statusPill,
              syncStatus === 'syncing'
                ? styles.statusPillSyncing
                : syncStatus === 'error'
                ? styles.statusPillError
                : styles.statusPillSuccess,
            ]}
          >
            <Text style={styles.statusPillText}>
              {syncStatus === 'syncing'
                ? '正在同步...'
                : syncStatus === 'success'
                ? '增量同步就绪'
                : '同步异常'}
            </Text>
          </View>
        </View>

        <View style={styles.syncMetricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{localCount}</Text>
            <Text style={styles.metricLabel}>本地记账总数</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text
              style={[
                styles.metricVal,
                unsyncedCount > 0 && styles.metricValWarning,
              ]}
            >
              {unsyncedCount}
            </Text>
            <Text style={styles.metricLabel}>待上传笔数</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValSmall}>{lastSyncDateStr}</Text>
            <Text style={styles.metricLabel}>上次同步时间</Text>
          </View>
        </View>

        {lastError && syncStatus === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ 异常提示: {lastError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.syncNowBtn,
            syncStatus === 'syncing' && styles.syncNowBtnDisabled,
          ]}
          onPress={onTriggerSync}
          disabled={syncStatus === 'syncing'}
          activeOpacity={0.8}
        >
          {syncStatus === 'syncing' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.syncNowBtnText}>立即与云端双向同步</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. 记账设置与自动化 */}
      <View style={styles.settingCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchMeta}>
            <Text style={styles.switchTitle}>记账后自动静默同步</Text>
            <Text style={styles.switchSub}>新增或修改记账时在后台静默向服务端同步</Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={val => {
              setAutoSync(val);
              storage.updateSyncConfig({ autoSync: val });
            }}
            trackColor={{ false: '#CBD5E1', true: Colors.primary }}
          />
        </View>
      </View>

      {/* 4. 本地备份与恢复 */}
      <View style={styles.settingCard}>
        <Text style={styles.cardHeaderTitle}>本地数据备份与迁移</Text>
        <Text style={styles.cardHeaderSub}>将本地账单完整导出为 JSON 或从备份文件恢复</Text>

        <View style={styles.backupBtnRow}>
          <TouchableOpacity style={styles.backupBtn} onPress={handleExport}>
            <Text style={styles.backupBtnText}>📦 导出 JSON 备份</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backupBtn, styles.restoreBtn]}
            onPress={() => setShowJsonInput(!showJsonInput)}
          >
            <Text style={styles.restoreBtnText}>📥 导入恢复数据</Text>
          </TouchableOpacity>
        </View>

        {showJsonInput && (
          <View style={styles.jsonBox}>
            <TextInput
              style={styles.jsonInput}
              multiline={true}
              numberOfLines={4}
              value={backupJson}
              onChangeText={setBackupJson}
              placeholder="请在此粘贴标准 JSON 备份字符串..."
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity style={styles.confirmImportBtn} onPress={handleImport}>
              <Text style={styles.confirmImportBtnText}>确认导入并合并数据</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 5. 服务端地址设置 (折叠) */}
      <View style={styles.settingCard}>
        <TouchableOpacity
          style={styles.foldHeaderRow}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.cardHeaderTitle}>服务端接口高级配置</Text>
          <Text style={styles.foldIcon}>{showAdvanced ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedContent}>
            <Text style={styles.inputLabel}>Spring Boot 服务端 Base URL</Text>
            <TextInput
              style={styles.textInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://10.10.1.9:8080"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.saveConfigBtn}
              onPress={handleSaveAdvancedConfig}
            >
              <Text style={styles.saveConfigBtnText}>保存接口配置</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 6. 危险区域: 清空本地账本 */}
      <View style={styles.dangerCard}>
        <TouchableOpacity style={styles.resetBtn} onPress={handleClear}>
          <Text style={styles.resetBtnText}>🗑️ 清空本地记账数据</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  // ── 未登录认证页专用样式 ──
  authScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  authBrandSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  authLogoWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  authLogoImg: {
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  authBrandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  authBrandSlogan: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  authSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  authSegmentItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  authSegmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  authSegmentTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  authFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  authTipBanner: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  authTipText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 8,
  },
  inputPrefixIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  eyeBtnText: {
    fontSize: 16,
  },
  codeRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  codeInputFlex: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  sendCodePill: {
    backgroundColor: Colors.primary,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  sendCodePillDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendCodePillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  authSubmitBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  authSubmitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  authSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  switchAuthLink: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchAuthText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  switchAuthHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  authBottomNoteSection: {
    marginTop: 18,
    alignItems: 'center',
  },
  agreementText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
  },
  offlineTipBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  offlineTipText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
  },

  // ── 已登录状态原有样式 ──
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 10,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    marginRight: 8,
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  appBarSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userMeta: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  onlineBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  userSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  logoutBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoutBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillSyncing: {
    backgroundColor: '#FEF3C7',
  },
  statusPillSuccess: {
    backgroundColor: '#D1FAE5',
  },
  statusPillError: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  syncMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricValWarning: {
    color: '#D97706',
  },
  metricValSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
  },
  syncNowBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  syncNowBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  syncNowBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchMeta: {
    flex: 1,
    paddingRight: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  switchSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardHeaderSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  backupBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backupBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  backupBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  restoreBtn: {
    backgroundColor: '#F8FAFC',
    marginRight: 0,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  jsonBox: {
    marginTop: 10,
  },
  jsonInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 12,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    height: 80,
  },
  confirmImportBtn: {
    backgroundColor: Colors.primary,
    marginTop: 8,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmImportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  foldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foldIcon: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  advancedContent: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  saveConfigBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveConfigBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dangerCard: {
    marginBottom: 10,
  },
  resetBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 40,
  },
});
