import React from 'react';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Home, Users, UserPlus, Flame, Settings } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeProvider';
import IndexScreen from '.'; // Assuming index.tsx is the contacts list
import AddScreen from './add';
import SettingsScreen from './settings';
import StreakScreen from './streak'; // Import the new screen

export default function TabLayout() {
  const { colors, colorScheme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          borderBottomColor: colors.border,
        },
        headerTransparent: true,
        headerBackground: () => (
          <BlurView
            intensity={20} // Adjust intensity as needed (0-100)
            tint={colorScheme} // Match theme
            style={{ flex: 1, backgroundColor: `${colors.card}40` }} // Apply semi-transparent bg ON the blur
          />
        ),
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <Home color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <Users color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <UserPlus color={color} />,
        }}
      />
      <Tabs.Screen
        name="streak"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <Flame color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <Settings color={color} />,
        }}
      />
    </Tabs>
  );
}
