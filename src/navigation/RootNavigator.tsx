import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootTabParamList } from './types';
import { BillsScreen } from '../features/bookkeep/screens/BillsScreen';
import { MineScreen } from '../features/mine/screens/MineScreen';
import { useAppDispatch, useAppSelector } from '../stores/hooks';
import { setAddModalVisible, setEditingItem } from '../stores/slices/bookkeepSlice';
import { Colors } from '../shared/theme/colors';

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * 占位空组件 (中间加号按钮不进行页面跳转，而是触发弹窗)
 */
const EmptyScreen = () => null;

/**
 * 自定义主流精致底部导航栏组件
 */
function CustomTabBar({ state, navigation }: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector(s => s.auth);

  const activeRouteName = state.routes[state.index].name;

  return (
    <View style={[styles.bottomTabBar, { paddingBottom: Math.max(10, insets.bottom) }]}>
      {/* 1. 左侧：明细 Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate('Bills')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeRouteName === 'Bills' && styles.tabIconActive]}>
          📑
        </Text>
        <Text style={[styles.tabLabel, activeRouteName === 'Bills' && styles.tabLabelActive]}>
          明细
        </Text>
      </TouchableOpacity>

      {/* 2. 中间：核心凸起圆形记账加号按钮 */}
      <View style={styles.centerAddBox}>
        <TouchableOpacity
          style={styles.centerAddBtn}
          onPress={() => {
            dispatch(setEditingItem(null));
            dispatch(setAddModalVisible(true));
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.centerAddIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* 3. 右侧：我的 Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate('Mine')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeRouteName === 'Mine' && styles.tabIconActive]}>
          {currentUser ? '👤' : '⚙️'}
        </Text>
        <Text style={[styles.tabLabel, activeRouteName === 'Mine' && styles.tabLabelActive]}>
          我的
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const renderTabBar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;

export const RootNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Bills" component={BillsScreen} />
      <Tab.Screen name="AddPlaceholder" component={EmptyScreen} />
      <Tab.Screen name="Mine" component={MineScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
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
