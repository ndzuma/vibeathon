import { router, Tabs } from 'expo-router';
import {
  House,
  MapPin,
  User,
} from 'phosphor-react-native';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Brand, FontFamily, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SPRING = { damping: 18, stiffness: 280, mass: 0.7 };

function TabIcon({
  Icon,
  focused,
  color,
}: {
  Icon: React.ComponentType<{ size: number; color: string; weight: 'regular' | 'fill' }>;
  focused: boolean;
  color: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, SPRING);
  }, [focused]);

  return (
    <Animated.View style={animStyle}>
      <Icon size={22} color={color} weight={focused ? 'fill' : 'regular'} />
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const theme = useTheme();

  const visibleRoutes = state.routes.filter((r: any) =>
    ['index', 'map', 'profile'].includes(r.name)
  );

  const ICONS: Record<string, React.ComponentType<any>> = {
    index: House,
    map: MapPin,
    profile: User,
  };

  const LABELS: Record<string, string> = {
    index: 'Home',
    map: 'Map',
    profile: 'Profile',
  };

  return (
    <View style={styles.tabBarOuter} pointerEvents="box-none">
      <View style={[styles.tabBarContainer, { borderColor: theme.tabBarBorder }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.tabBarBg }]} />
        <View style={styles.tabBarInner}>
          {visibleRoutes.map((route: any) => {
            const isFocused = state.index === state.routes.indexOf(route);
            const Icon = ICONS[route.name] ?? House;
            const color = isFocused ? Brand.accent : theme.textSecondary;

            function onPress() {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                hitSlop={4}
              >
                <View style={[
                  styles.tabContent,
                  isFocused && { backgroundColor: Brand.accent + '18' },
                ]}>
                  <TabIcon Icon={Icon} focused={isFocused} color={color} />
                  <Text style={[
                    styles.tabLabel,
                    { color },
                    isFocused && styles.tabLabelActive,
                  ]}>
                    {LABELS[route.name]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="place/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="place/add" options={{ href: null }} />
      <Tabs.Screen name="place/[id]/edit" options={{ href: null }} />
    </Tabs>
  );
}

const TAB_BAR_HEIGHT = 64;
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: BOTTOM_INSET,
    left: Spacing.six,
    right: Spacing.six,
  },
  tabBarContainer: {
    width: '100%',
    height: TAB_BAR_HEIGHT,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    ...Shadow.md,
  },
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    minWidth: 64,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    letterSpacing: 0.2,
    fontFamily: FontFamily.sansMedium,
  },
  tabLabelActive: {
    fontFamily: FontFamily.sansSemiBold,
  },
});
