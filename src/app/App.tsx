import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Transaction, SyncStatus, CategoryName, UserInfo } from '../type/bookkeep';
import { Colors } from '../theme/colors';
import { storage } from '../services/storage';
import { cloudSync } from '../services/cloudSync';
import { HeaderCard } from '../components/HeaderCard';
import { TransactionItem } from '../components/TransactionItem';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { StatisticsView } from '../components/StatisticsView';
import { CloudSyncModal } from '../components/CloudSyncModal';
import { AuthModal } from '../components/AuthModal';
import { MineView } from '../components/MineView';
import { calculateMonthlySummary, getCurrentMonthStr, groupTransactionsByDay, formatMoney } from '../utils/format';

function BookKeepApp() {
    const insets = useSafeAreaInsets();

    // 底部核心导航: 'bills'(明细) | 'mine'(我的)
    const [currentTab, setCurrentTab] = useState<'bills' | 'mine'>('bills');
    // 明细内部切换: 'bills'(明细列表) | 'stats'(图表统计)
    const [subTab, setSubTab] = useState<'bills' | 'stats'>('bills');

    const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonthStr());
    const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
    const [transactions, setTransactions] = useState<Transaction[]>(storage.getTransactions());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudSync.getStatus());

    // 弹窗状态
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<Transaction | null>(null);
    const [syncModalVisible, setSyncModalVisible] = useState(false);
    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserInfo | null>(storage.getUser());

    // 监听存储、同步与用户登录状态
    useEffect(() => {
        const unsubStorage = storage.subscribe(items => {
            setTransactions(items);
        });
        const unsubSync = cloudSync.subscribeStatus(status => {
            setSyncStatus(status);
        });
        const unsubUser = storage.subscribeUser(user => {
            setCurrentUser(user);
        });

        return () => {
            unsubStorage();
            unsubSync();
            unsubUser();
        };
    }, []);

    // 月份切换
    const handleMonthPrev = () => {
        const [year, month] = currentMonth.split('-').map(Number);
        let newYear = year;
        let newMonth = month - 1;
        if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }
        setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    };

    const handleMonthNext = () => {
        const [year, month] = currentMonth.split('-').map(Number);
        let newYear = year;
        let newMonth = month + 1;
        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        }
        setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    };

    // 过滤当月 & 类型账目
    const filteredTransactions = useMemo(() => {
        return transactions.filter(item => {
            const matchMonth = item.date.startsWith(currentMonth);
            if (!matchMonth) {
                return false;
            }
            if (filterType === 'all') {
                return true;
            }
            return item.type === filterType;
        });
    }, [transactions, currentMonth, filterType]);

    // 按天分组数据
    const groupedDays = useMemo(() => {
        return groupTransactionsByDay(filteredTransactions);
    }, [filteredTransactions]);

    // 当月汇总
    const monthlySummary = useMemo(() => {
        return calculateMonthlySummary(transactions, currentMonth);
    }, [transactions, currentMonth]);

    // 待同步条数
    const unsyncedCount = useMemo(() => {
        return transactions.filter(t => !t.synced).length;
    }, [transactions]);

    // 手动触发同步
    const handleTriggerSync = async () => {
        const res = await cloudSync.syncWithCloud();
        if (res.success) {
            Alert.alert('同步完成', `本次同步拉取 ${res.pulledCount} 条，推送 ${res.syncedCount} 条`);
        } else {
            Alert.alert('同步失败', res.message || '网络连接或服务端异常');
        }
    };

    // 保存单笔交易
    const handleSaveTransaction = (data: {
        type: 'expense' | 'income';
        category: CategoryName;
        amount: number;
        date: string;
        time: string;
        note: string;
    }) => {
        if (editingItem) {
            storage.updateTransaction(editingItem.id, data);
            setEditingItem(null);
        } else {
            storage.addTransaction(data);
        }
        const config = storage.getSyncConfig();
        if (config.autoSync && config.token) {
            cloudSync.syncWithCloud();
        }
    };

    const handleEditItem = (item: Transaction) => {
        setEditingItem(item);
        setAddModalVisible(true);
    };

    const handleDeleteItem = (id: string) => {
        storage.deleteTransaction(id);
        const config = storage.getSyncConfig();
        if (config.autoSync && config.token) {
            cloudSync.syncWithCloud();
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* 顶栏 HeaderCard (仅在明细页常驻，高度仅约 1/4 屏幕) */}
            {currentTab === 'bills' && (
                <HeaderCard
                    currentMonth={currentMonth}
                    summary={monthlySummary}
                    syncStatus={syncStatus}
                    unsyncedCount={unsyncedCount}
                    filterType={filterType}
                    isLoggedIn={Boolean(currentUser)}
                    userDisplayName={currentUser?.displayName || currentUser?.username}
                    activeSubTab={subTab}
                    onSubTabChange={setSubTab}
                    onFilterChange={setFilterType}
                    onSyncPress={() => setCurrentTab('mine')}
                    onMonthPrev={handleMonthPrev}
                    onMonthNext={handleMonthNext}
                />
            )}

            {/* 主视图内容区域 */}
            <View style={styles.mainContent}>
                {currentTab === 'bills' ? (
                    subTab === 'bills' ? (
                        <ScrollView
                            style={styles.billsListScroll}
                            contentContainerStyle={styles.billsListContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            {groupedDays.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyIcon}>📝</Text>
                                    <Text style={styles.emptyTitle}>本月暂无记账明细</Text>
                                    <Text style={styles.emptySub}>点击底部中间的「＋」按钮开始记一笔吧！</Text>
                                </View>
                            ) : (
                                groupedDays.map(group => (
                                    <View key={group.date} style={styles.dayGroup}>
                                        {/* 日期分组表头 */}
                                        <View style={styles.dayHeaderRow}>
                                            <Text style={styles.dayDateText}>{group.dayText}</Text>
                                            <View style={styles.daySummaryBox}>
                                                {group.totalExpense > 0 && (
                                                    <Text style={styles.dayExpenseText}>
                                                        支 ¥{formatMoney(group.totalExpense)}
                                                    </Text>
                                                )}
                                                {group.totalIncome > 0 && (
                                                    <Text style={styles.dayIncomeText}>
                                                        收 ¥{formatMoney(group.totalIncome)}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* 该日期下的每一笔账目 */}
                                        {group.items.map(tx => (
                                            <TransactionItem
                                                key={tx.id}
                                                item={tx}
                                                onPress={handleEditItem}
                                                onDelete={handleDeleteItem}
                                            />
                                        ))}
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    ) : (
                        <StatisticsView
                            currentMonth={currentMonth}
                            transactions={transactions}
                            onMonthPrev={handleMonthPrev}
                            onMonthNext={handleMonthNext}
                            showHeader={false}
                        />
                    )
                ) : (
                    <MineView
                        currentUser={currentUser}
                        syncStatus={syncStatus}
                        onOpenAuth={() => setAuthModalVisible(true)}
                        onTriggerSync={handleTriggerSync}
                    />
                )}
            </View>

            {/* 底部导航栏: 左侧明细、中间添加按钮、右侧我的 */}
            <View style={[styles.bottomTabBar, { paddingBottom: Math.max(10, insets.bottom) }]}>
                {/* 左侧: 明细 */}
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setCurrentTab('bills')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabIcon, currentTab === 'bills' && styles.tabIconActive]}>
                        📑
                    </Text>
                    <Text style={[styles.tabLabel, currentTab === 'bills' && styles.tabLabelActive]}>
                        明细
                    </Text>
                </TouchableOpacity>

                {/* 中间: 核心添加记账按钮 (突出圆形加号按钮) */}
                <View style={styles.centerAddBox}>
                    <TouchableOpacity
                        style={styles.centerAddBtn}
                        onPress={() => {
                            setEditingItem(null);
                            setAddModalVisible(true);
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.centerAddIcon}>＋</Text>
                    </TouchableOpacity>
                </View>

                {/* 右侧: 我的 */}
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setCurrentTab('mine')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabIcon, currentTab === 'mine' && styles.tabIconActive]}>
                        {currentUser ? '👤' : '⚙️'}
                    </Text>
                    <Text style={[styles.tabLabel, currentTab === 'mine' && styles.tabLabelActive]}>
                        我的
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 记账新增/编辑模态弹窗 */}
            <AddTransactionModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSave={handleSaveTransaction}
                editingItem={editingItem}
            />

            {/* 云端同步设置与管理弹窗 */}
            <CloudSyncModal
                visible={syncModalVisible}
                onClose={() => setSyncModalVisible(false)}
                syncStatus={syncStatus}
                onTriggerSync={handleTriggerSync}
            />

            {/* 登录/注册认证模态弹窗 */}
            <AuthModal
                visible={authModalVisible}
                onClose={() => setAuthModalVisible(false)}
                onSuccess={() => {
                    setAuthModalVisible(false);
                    cloudSync.syncWithCloud();
                }}
            />
        </View>
    );
}

export default function App() {
    return (
        <SafeAreaProvider>
            <BookKeepApp />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    mainContent: {
        flex: 1,
    },
    billsListScroll: {
        flex: 1,
    },
    billsListContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    dayGroup: {
        marginBottom: 10,
    },
    dayHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 5,
        marginBottom: 3,
    },
    dayDateText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    daySummaryBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dayExpenseText: {
        fontSize: 12,
        color: Colors.textMuted,
        marginRight: 10,
    },
    dayIncomeText: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 13,
        color: Colors.textMuted,
    },
    // 底部导航栏
    bottomTabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    tabIcon: {
        fontSize: 20,
        marginBottom: 2,
        opacity: 0.6,
    },
    tabIconActive: {
        opacity: 1,
        transform: [{ scale: 1.08 }],
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.textMuted,
    },
    tabLabelActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    // 中间突出添加按钮
    centerAddBox: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -18,
    },
    centerAddBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 7,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    centerAddIcon: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: 'bold',
        lineHeight: 28,
    },
});
