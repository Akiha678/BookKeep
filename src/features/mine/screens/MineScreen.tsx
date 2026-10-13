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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../shared/theme/colors';
import { useAppDispatch, useAppSelector } from '../../../stores/hooks';
import { setAuthModalVisible } from '../../../stores/slices/authSlice';
import { setAutoSync, setServerUrl } from '../../../stores/slices/syncSlice';
import { setTransactions } from '../../../stores/slices/bookkeepSlice';
import { authService } from '../../auth/services/authService';
import { cloudSync } from '../../bookkeep/services/cloudSync';
import { mmkvStorage } from '../../../shared/storage/mmkvStorage';

export const MineScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const { currentUser } = useAppSelector(state => state.auth);
  const { syncStatus, autoSync, serverUrl, lastSyncTime, lastError } = useAppSelector(
    state => state.sync
  );
  const transactions = useAppSelector(state => state.bookkeep.transactions);

  // 本地配置折叠与备份状态
  const [localServerUrl, setLocalServerUrl] = useState(serverUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);

  useEffect(() => {
    setLocalServerUrl(serverUrl);
  }, [serverUrl]);

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

  const handleTriggerSync = async () => {
    const res = await cloudSync.syncWithCloud();
    if (res.success) {
      Alert.alert('同步完成', `本次同步拉取 ${res.pulledCount} 条，推送 ${res.syncedCount} 条`);
    } else {
      Alert.alert('同步失败', res.message || '网络连接或服务端异常');
    }
  };

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
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 顶部标题栏 */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Image
            source={require('../../../../assets/logo.png')}
            style={styles.logoIcon}
            resizeMode="cover"
          />
          <Text style={styles.appBarTitle}>个人中心</Text>
        </View>
        <Text style={styles.appBarSub}>三金记账 v2.0</Text>
      </View>

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
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => dispatch(setAuthModalVisible(true))}
          activeOpacity={0.85}
        >
          <View style={[styles.userAvatar, styles.userAvatarGuest]}>
            <Text style={styles.avatarTextGuest}>👤</Text>
          </View>
          <View style={styles.userMeta}>
            <View style={styles.userNameRow}>
              <Text style={styles.userNameText}>未登录</Text>
              <View style={styles.guestBadge}>
                <Text style={styles.guestBadgeText}>离线记账</Text>
              </View>
            </View>
            <Text style={styles.userSubText}>点击登录 / 注册，开启多端云同步</Text>
          </View>
          <View style={styles.loginActionBtn}>
            <Text style={styles.loginActionBtnText}>立即登录</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 2. 同步状态看板 */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.statusCardTitle}>云端同步状态</Text>
          <View
            style={[
              styles.statusPill,
              !currentUser
                ? styles.statusPillGuest
                : syncStatus === 'syncing'
                ? styles.statusPillSyncing
                : syncStatus === 'error'
                ? styles.statusPillError
                : styles.statusPillSuccess,
            ]}
          >
            <Text style={styles.statusPillText}>
              {!currentUser
                ? '离线模式'
                : syncStatus === 'syncing'
                ? '正在同步...'
                : syncStatus === 'success'
                ? '增量同步就绪'
                : syncStatus === 'error'
                ? '同步异常'
                : '闲置就绪'}
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
          onPress={currentUser ? handleTriggerSync : () => dispatch(setAuthModalVisible(true))}
          disabled={syncStatus === 'syncing'}
          activeOpacity={0.8}
        >
          {syncStatus === 'syncing' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.syncNowBtnText}>
              {currentUser ? '立即与云端双向同步' : '登录以启用云端实时同步'}
            </Text>
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
              dispatch(setAutoSync(val));
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
              value={localServerUrl}
              onChangeText={setLocalServerUrl}
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
    paddingBottom: 40,
  },
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
  userAvatarGuest: {
    backgroundColor: '#F1F5F9',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarTextGuest: {
    fontSize: 20,
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
  guestBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
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
  loginActionBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  loginActionBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
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
  statusPillGuest: {
    backgroundColor: '#F1F5F9',
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
