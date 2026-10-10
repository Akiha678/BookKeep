import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { SyncStatus } from '../type/bookkeep';
import { storage } from '../services/storage';
import { cloudSync } from '../services/cloudSync';

interface CloudSyncModalProps {
  visible: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  visible,
  onClose,
  syncStatus,
  onTriggerSync,
}) => {
  const [config, setConfig] = useState(storage.getSyncConfig());
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [serverUrl, setServerUrl] = useState(config.serverUrl);
  const [token, setToken] = useState(config.token || '');

  // 登录表单状态
  const [showLogin, setShowLogin] = useState(false);
  const [loginAccount, setLoginAccount] = useState('admin1');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 备份与恢复
  const [backupJson, setBackupJson] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);

  // 当弹窗打开时重新同步配置数据
  useEffect(() => {
    if (visible) {
      const latest = storage.getSyncConfig();
      setConfig(latest);
      setAutoSync(latest.autoSync);
      setServerUrl(latest.serverUrl);
      setToken(latest.token || '');
    }
  }, [visible]);

  const localCount = storage.getTransactions().length;
  const unsyncedCount = storage.getUnsyncedTransactions().length;
  const lastError = cloudSync.getLastError();

  const lastSyncDateStr = config.lastSyncTime && config.lastSyncTime > 0
    ? new Date(config.lastSyncTime).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '尚未同步';

  const handleSaveConfig = () => {
    storage.updateSyncConfig({
      autoSync,
      serverUrl: serverUrl.trim(),
      token: token.trim(),
    });
    setConfig(storage.getSyncConfig());
    Alert.alert('设置成功', '云端同步参数已更新');
  };

  const handleLogin = async () => {
    if (!loginAccount.trim() || !loginPassword.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    setIsLoggingIn(true);
    // 从 serverUrl 解析 baseUrl
    let baseUrl = 'http://10.10.1.9:8080';
    try {
      const urlObj = new URL(serverUrl);
      baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      // 保持默认
    }

    const res = await cloudSync.login(loginAccount, loginPassword, baseUrl);
    setIsLoggingIn(false);

    if (res.success) {
      const updated = storage.getSyncConfig();
      setConfig(updated);
      setToken(updated.token || '');
      setShowLogin(false);
      Alert.alert('登录成功', `已绑定账号: ${res.user?.username || loginAccount}，凭证已保存并可直接同步`);
    } else {
      Alert.alert('登录失败', res.message);
    }
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确定清除当前账号的云端登录凭证吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => {
          storage.updateSyncConfig({ token: '', username: '', displayName: '' });
          const updated = storage.getSyncConfig();
          setConfig(updated);
          setToken('');
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

  const handleReset = () => {
    Alert.alert('重置数据', '确定要重置为初始默认精美演示账本吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: () => {
          storage.resetToDefault();
          Alert.alert('已重置', '账本已恢复初始数据并更新');
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* 顶部标题栏 */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <Text style={styles.titleIcon}>☁️</Text>
              <Text style={styles.headerTitle}>云端同步中心 (Spring Boot)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 状态看板卡片 */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeaderRow}>
                <Text style={styles.statusCardTitle}>局域网同步状态</Text>
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
                      ? '同步中'
                      : syncStatus === 'error'
                      ? '同步异常'
                      : config.token
                      ? '已联机在线'
                      : '未登录凭证'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricNumber}>{localCount}</Text>
                  <Text style={styles.metricLabel}>本地有效账目</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricNumber, unsyncedCount > 0 && { color: Colors.warning }]}>
                    {unsyncedCount}
                  </Text>
                  <Text style={styles.metricLabel}>待上传变更</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricNumber}>{config.token ? '已授权' : '未授权'}</Text>
                  <Text style={styles.metricLabel}>鉴权状态</Text>
                </View>
              </View>

              <Text style={styles.lastSyncTip}>最近同步时间：{lastSyncDateStr}</Text>

              {lastError && syncStatus === 'error' && (
                <View style={styles.errorNoticeBox}>
                  <Text style={styles.errorNoticeText}>⚠️ {lastError}</Text>
                </View>
              )}

              {/* 立即同步按钮 */}
              <TouchableOpacity
                style={[styles.syncNowBtn, syncStatus === 'syncing' && styles.syncNowBtnDisabled]}
                onPress={onTriggerSync}
                disabled={syncStatus === 'syncing'}
                activeOpacity={0.8}
              >
                {syncStatus === 'syncing' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinnerSpacing} />
                ) : (
                  <Text style={styles.syncBtnIcon}>🔄</Text>
                )}
                <Text style={styles.syncNowBtnText}>
                  {syncStatus === 'syncing' ? '正在与 10.10.1.9 同步...' : '立即同步增量数据'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 用户账号与鉴权卡片 */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>后端账号与凭证</Text>
                {config.token ? (
                  <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.linkActionText}>退出绑定</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setShowLogin(!showLogin)}>
                    <Text style={styles.linkActionText}>{showLogin ? '收起登录' : '快捷登录'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {config.token ? (
                <View style={styles.accountBoundBox}>
                  <View style={styles.accountAvatar}>
                    <Text style={styles.avatarText}>👤</Text>
                  </View>
                  <View style={styles.accountMeta}>
                    <Text style={styles.accountName}>
                      {config.displayName || config.username || '已登录用户'}
                    </Text>
                    <Text style={styles.accountTokenDesc}>
                      Token: {config.token.substring(0, 10)}...{config.token.substring(config.token.length - 6)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.unboundBox}>
                  <Text style={styles.unboundTip}>
                    当前尚未绑定服务端身份。服务端启用了 Bearer 校验，请快捷登录或输入 Token。
                  </Text>
                </View>
              )}

              {showLogin && !config.token && (
                <View style={styles.loginFormBox}>
                  <Text style={styles.inputLabel}>XinChat 账号 (用户名/邮箱)</Text>
                  <TextInput
                    style={styles.urlInput}
                    value={loginAccount}
                    onChangeText={setLoginAccount}
                    placeholder="例如: admin1"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />

                  <Text style={[styles.inputLabel, styles.inputLabelSpacing]}>密码</Text>
                  <TextInput
                    style={styles.urlInput}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="输入账号密码"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={true}
                  />

                  <TouchableOpacity
                    style={[styles.loginSubmitBtn, isLoggingIn && styles.syncNowBtnDisabled]}
                    onPress={handleLogin}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.loginSubmitText}>一键登录服务端</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 云端网络配置项 */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>网络与服务配置</Text>

              {/* 自动同步开关 */}
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>记账后自动静默同步</Text>
                  <Text style={styles.switchDesc}>新增/编辑/删除时，后台自动增量上传</Text>
                </View>
                <Switch
                  value={autoSync}
                  onValueChange={val => {
                    setAutoSync(val);
                    storage.updateSyncConfig({ autoSync: val });
                  }}
                  thumbColor={autoSync ? Colors.primary : '#F1F5F9'}
                  trackColor={{ false: '#E2E8F0', true: Colors.primaryLight }}
                />
              </View>

              {/* 服务端接口地址 */}
              <View style={styles.urlInputBlock}>
                <Text style={styles.inputLabel}>服务端同步接口 (默认 10.10.1.9:8080)</Text>
                <TextInput
                  style={styles.urlInput}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="http://10.10.1.9:8080/bookkeep/sync"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, styles.inputLabelSpacing]}>自定义 Bearer Token</Text>
                <TextInput
                  style={styles.urlInput}
                  value={token}
                  onChangeText={setToken}
                  placeholder="手动填入 Token（可选）"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />

                <TouchableOpacity style={styles.saveConfigBtn} onPress={handleSaveConfig}>
                  <Text style={styles.saveConfigText}>保存网络配置</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 数据备份与恢复 */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>数据备份与重置</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.outlineActionBtn} onPress={handleExport}>
                  <Text style={styles.outlineActionIcon}>📤</Text>
                  <Text style={styles.outlineActionText}>导出数据备份</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outlineActionBtn}
                  onPress={() => setShowJsonInput(!showJsonInput)}
                >
                  <Text style={styles.outlineActionIcon}>📥</Text>
                  <Text style={styles.outlineActionText}>导入恢复数据</Text>
                </TouchableOpacity>
              </View>

              {showJsonInput && (
                <View style={styles.jsonInputContainer}>
                  <TextInput
                    style={styles.jsonInput}
                    multiline={true}
                    numberOfLines={4}
                    value={backupJson}
                    onChangeText={setBackupJson}
                    placeholder="在此粘贴导出的账本 JSON 备份内容..."
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity style={styles.confirmImportBtn} onPress={handleImport}>
                    <Text style={styles.confirmImportText}>确认合并恢复</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetBtnText}>重置为初始演示数据</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '90%',
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
  scrollContent: {
    flexGrow: 0,
  },
  statusCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    marginBottom: 16,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillSuccess: {
    backgroundColor: '#D1FAE5',
  },
  statusPillSyncing: {
    backgroundColor: '#DBEAFE',
  },
  statusPillError: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  lastSyncTip: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorNoticeBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  errorNoticeText: {
    fontSize: 12,
    color: Colors.danger,
    lineHeight: 16,
  },
  syncNowBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncNowBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  syncNowBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: Colors.cardAlt,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  linkActionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  accountBoundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  accountTokenDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unboundBox: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unboundTip: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
  },
  loginFormBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  loginSubmitBtn: {
    backgroundColor: Colors.skyCyan,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  loginSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 10,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  switchDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  urlInputBlock: {
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  urlInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  saveConfigBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  saveConfigText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  outlineActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
  },
  outlineActionIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  outlineActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  jsonInputContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  jsonInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmImportBtn: {
    backgroundColor: Colors.skyCyan,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmImportText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  resetBtnText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '500',
  },
  spinnerSpacing: {
    marginRight: 8,
  },
  inputLabelSpacing: {
    marginTop: 10,
  },
  bottomSpacer: {
    height: 30,
  },
});
