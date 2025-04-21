import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Users, UserPlus, Flame, Settings } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeProvider';
import IndexScreen from '.'; // Assuming index.tsx is the contacts list
import AddScreen from './add';
import SettingsScreen from './settings';
import StreakScreen from './streak'; // Import the new screen

export default function TabLayout() {
  const { colors } = useTheme();

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
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color }) => <Users color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Contact',
          tabBarIcon: ({ color }) => <UserPlus color={color} />,
        }}
      />
      <Tabs.Screen
        name="streak"
        options={{
          title: 'Streaks',
          tabBarIcon: ({ color }) => <Flame color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} />,
        }}
      />
    </Tabs>
  );
}
