import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';

const ACTIVE_COLOR = '#5C4ECC';
const INACTIVE_COLOR = '#9CA3AF';
const TAB_ROW_HEIGHT = 52;
const CENTER_BUTTON_SIZE = 58;

type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  isCenter?: boolean;
};

const TAB_CONFIG: TabConfig[] = [
  { name: 'home', label: 'Ana', icon: 'home-outline', iconFocused: 'home' },
  { name: 'medications', label: 'İlaçlarım', icon: 'medical-outline', iconFocused: 'medical' },
  { name: 'scan', label: 'Tara', icon: 'scan-outline', iconFocused: 'scan', isCenter: true },
  { name: 'bot', label: 'MediBot', icon: 'chatbubble-ellipses-outline', iconFocused: 'chatbubble-ellipses' },
  { name: 'profile', label: 'Profil', icon: 'person-outline', iconFocused: 'person' },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const centerRoute = state.routes.find((route) => TAB_CONFIG.find((t) => t.name === route.name)?.isCenter);
  const centerIndex = centerRoute ? state.routes.indexOf(centerRoute) : -1;
  const isCenterFocused = state.index === centerIndex;

  const onTabPress = (routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {centerRoute && (
        <TouchableOpacity
          onPress={() => onTabPress(centerRoute.name, centerRoute.key, isCenterFocused)}
          style={styles.centerButton}
          activeOpacity={0.85}
        >
          <View style={[styles.centerCircle, isCenterFocused && styles.centerCircleFocused]}>
            <Ionicons name="scan" size={28} color="#fff" />
          </View>
          <Text style={[styles.label, isCenterFocused && styles.labelActive]}>Tara</Text>
        </TouchableOpacity>
      )}

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG.find((tab) => tab.name === route.name);
          if (config?.isCenter) {
            return <View key={route.key} style={styles.centerSpacer} />;
          }

          const isFocused = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => onTabPress(route.name, route.key, isFocused)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFocused ? config?.iconFocused ?? 'ellipse' : config?.icon ?? 'ellipse-outline'}
                size={23}
                color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>{config?.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="medications" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="bot" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_ROW_HEIGHT,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  centerSpacer: {
    flex: 1,
  },
  centerButton: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centerCircle: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: ACTIVE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: ACTIVE_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  centerCircleFocused: {
    transform: [{ scale: 1.04 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: INACTIVE_COLOR,
    marginTop: 2,
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
});
