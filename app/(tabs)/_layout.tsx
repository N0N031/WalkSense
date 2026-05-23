import { Tabs } from 'expo-router';
import React from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/src/components/haptic-tab';
import { COLORS } from '@/src/constants/colors';

function TabIcon({ name, color, focused }: { name: React.ComponentProps<typeof Ionicons>['name'], color: string, focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {focused && (
        <View style={{
          position: 'absolute',
          top: -11,
          width: 28,
          height: 3,
          borderRadius: 2,
          backgroundColor: COLORS.accent,
          shadowColor: COLORS.accent,
          shadowOpacity: 0.9,
          shadowRadius: 8,
          elevation: 4,
        }} />
      )}
      <Ionicons name={name} size={23} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "rgba(2,7,4,0.88)",
          borderTopColor: COLORS.divider,
          borderTopWidth: 1,
          height: 64 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="time-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Terrain',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="compass-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
