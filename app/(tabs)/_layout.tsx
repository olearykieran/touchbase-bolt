import React from 'react';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Home, Users, UserPlus, Flame, Settings } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeProvider';
import { View } from 'react-native';
import IndexScreen from '.'; // Assuming index.tsx is the contacts list
import AddScreen from './add';
import SettingsScreen from './settings';
import StreakScreen from './streak'; // Import the new screen

// Define types for the TabBarIcon component
interface TabBarIconProps {
  Icon: React.ElementType;
  focused: boolean;
  color: string;
}

export default function TabLayout() {
  const { colors, colorScheme } = useTheme();

  // Custom tab bar icon with active state highlight
  const TabBarIcon = ({ Icon, focused, color }: TabBarIconProps) => {
    return (
      <View style={{ 
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 16,
        backgroundColor: focused ? `${colors.accent}20` : 'transparent', // Light background when active
      }}>
        <Icon color={color} size={22} />
      </View>
    );
  };

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
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={Home} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={Users} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={UserPlus} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="streak"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={Flame} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={Settings} focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
