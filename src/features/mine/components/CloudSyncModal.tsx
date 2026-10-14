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
  Image,
} from 'react-native';
import { Colors } from '../../../shared/theme/colors';
import { useAppDispatch, useAppSelector } from '../../../stores/hooks';
import { setAutoSync, setServerUrl } from '../../../stores/slices/syncSlice';
import { setTransactions } from '../../../stores/slices/bookkeepSlice';
import { setAuthModalVisible } from '../../../stores/slices/authSlice';
import { authService } from '../../auth/services/authService';
import { mmkvStorage } from '../../../shared/storage/mmkvStorage';

interface CloudSyncModalProps {
  visible: boolean;
  onClose: () => void;
  onTriggerSync: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  visible,
  onClose,
  onTriggerSync,
}) => {
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector(state => state.auth);
  const { syncStatus, autoSync, serverUrl, lastSyncTime, lastError } = useAppSelector(
    state => state.sync
  );
  const transactions = useAppSelector(state => state.bookkeep.transactions);

  const [localServerUrl, setLocalServerUrl] = useState(serverUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);

  useEffect(() => {
    if (visible) {
      setLocalServerUrl(serverUrl);
    }
  }, [visible, serverUrl]);

  const validTransactions = transactions.filter(t => !t.isDeleted);
  const localCount = validTransactions.length;
  const unsyncedCount = transactions.filter(t => !t.synced).length;

  const lastSyncDateStr =
    lastSyncTime && lastSyncTime > 0
      ? new Date(lastSyncTime).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '尚未同步';

  const handleSaveAdvancedConfig = () => {
    dispatch(setServerUrl(localServerUrl.trim()));
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
    const jsonStr = mmkvStorage.exportDataJson();
    setBackupJson(jsonStr);
    setShowJsonInput(true);
    Alert.alert('备份导出成功', `共导出 ${localCount} 笔记账记录。\n已填入下方文本框中，可直接复制备份。`);
  };

  const handleImport = () => {
    if (!backupJson.trim()) {
      Alert.alert('提示', '请输入备份的 JSON 字符串');
      return;
    }
    const result = mmkvStorage.importDataJson(backupJson.trim());
    if (result.success) {
      dispatch(setTransactions(mmkvStorage.getTransactions()));
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
          mmkvStorage.clearAllData();
          dispatch(setTransactions([]));
          Alert.alert('已清空', '本地记账数据已全部清空');
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
              <Image
                source={require('../../../../assets/logo.png')}
                style={styles.headerLogo}
                resizeMode="cover"
              />
              <Text style={styles.headerTitle}>三金记账 · 云端同步中心</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. 用户账号身份卡片 */}
            {currentUser ? (
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
            ) : (
              <View style={styles.guestCard}>
                <View style={styles.guestContent}>
                  <Text style={styles.guestIcon}>👤</Text>
                  <View style={styles.guestMeta}>
                    <Text style={styles.guestTitle}>尚未登录账号</Text>
                    <Text style={styles.guestDesc}>
                      登录或注册后，记账数据即可安全双向同步到云端数据库。
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.guestLoginBtn}
                  onPress={() => {
                    onClose();
                    dispatch(setAuthModalVisible(true));
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.guestLoginBtnText}>立即登录 / 注册账号</Text>
                </TouchableOpacity>
              </View>
            )}

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
                      : currentUser
                      ? styles.statusPillSuccess
                      : styles.statusPillOffline,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      !currentUser && styles.statusPillTextOffline,
                    ]}
                  >
                    {syncStatus === 'syncing'
                      ? '同步中'
                      : syncStatus === 'error'
                      ? '同步异常'
                      : currentUser
                      ? '已在线'
                      : '离线/未登录'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricNumber}>{localCount}</Text>
                  <Text style={styles.metricLabel}>本地记账总数</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text
                    style={[
                      styles.metricNumber,
                      unsyncedCount > 0 && { color: Colors.warning },
                    ]}
                  >
                    {unsyncedCount}
                  </Text>
                  <Text style={styles.metricLabel}>待上传变更</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricNumber}>{currentUser ? '双向同步' : '仅本机'}</Text>
                  <Text style={styles.metricLabel}>同步模式</Text>
                </View>
              </View>

              <Text style={styles.lastSyncTip}>最近同步时间：{lastSyncDateStr}</Text>

              {lastError && syncStatus === 'error' && (
                <View style={styles.errorNoticeBox}>
                  <Text style={styles.errorNoticeText}>⚠️ {lastError}</Text>
                </View>
              )}

              {/* 立即同步大按钮 */}
              <TouchableOpacity
                style={[
                  styles.syncNowBtn,
                  (syncStatus === 'syncing' || !currentUser) && styles.syncNowBtnDisabled,
                ]}
                onPress={() => {
                  if (!currentUser) {
                    onClose();
                    dispatch(setAuthModalVisible(true));
                  } else {
                    onTriggerSync();
                  }
                }}
                disabled={syncStatus === 'syncing'}
                activeOpacity={0.8}
              >
                {syncStatus === 'syncing' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinnerSpacing} />
                ) : (
                  <Text style={styles.syncBtnIcon}>🔄</Text>
                )}
                <Text style={styles.syncNowBtnText}>
                  {!currentUser
                    ? '登录后立即同步云端数据'
                    : syncStatus === 'syncing'
                    ? '正在与云端服务器增量同步...'
                    : '立即同步增量数据'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. 同步开关设置 */}
            <View style={styles.sectionCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>记账后自动静默同步</Text>
                  <Text style={styles.switchDesc}>新增、修改或删除时，后台自动增量上传</Text>
                </View>
                <Switch
                  value={autoSync}
                  onValueChange={val => {
                    dispatch(setAutoSync(val));
                  }}
                  thumbColor={autoSync ? Colors.primary : '#F1F5F9'}
                  trackColor={{ false: '#E2E8F0', true: Colors.primaryLight }}
                />
              </View>
            </View>

            {/* 4. 高级网络设置 (展开) */}
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.expandRow}
                onPress={() => setShowAdvanced(!showAdvanced)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionHeaderNoMargin}>服务端接口配置</Text>
                <Text style={styles.expandArrow}>{showAdvanced ? '▲ 收起' : '▼ 展开'}</Text>
              </TouchableOpacity>

              {showAdvanced && (
                <View style={styles.urlInputBlock}>
                  <Text style={styles.inputLabel}>服务端增量同步接口 Base URL</Text>
                  <TextInput
                    style={styles.urlInput}
                    value={localServerUrl}
                    onChangeText={setLocalServerUrl}
                    placeholder="http://111.231.53.205:8080"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.saveConfigBtn} onPress={handleSaveAdvancedConfig}>
                    <Text style={styles.saveConfigText}>保存接口配置</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 5. 数据备份与恢复 */}
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

              <TouchableOpacity style={styles.resetBtn} onPress={handleClear}>
                <Text style={styles.resetBtnText}>清空本地记账数据</Text>
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
  headerLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    marginBottom: 14,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 15,
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
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoutBtnText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
  },
  guestCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 14,
  },
  guestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  guestMeta: {
    flex: 1,
  },
  guestTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  guestDesc: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  guestLoginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  guestLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
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
  statusPillOffline: {
    backgroundColor: '#E2E8F0',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  statusPillTextOffline: {
    color: '#64748B',
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
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
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
  spinnerSpacing: {
    marginRight: 6,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeaderNoMargin: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandArrow: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  urlInput: {
    backgroundColor: '#F8FAFC',
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
    marginTop: 10,
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
    backgroundColor: '#F8FAFC',
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
    marginBottom: 10,
  },
  jsonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: Colors.textPrimary,
    height: 80,
    textAlignVertical: 'top',
  },
  confirmImportBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  confirmImportText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resetBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetBtnText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 30,
  },
});
