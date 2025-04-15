import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';
import {
  Platform,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import React from 'react';

function useProtectedRoute(user: any) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/sign-in');
    } else if (user && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace('/');
    }
  }, [user, segments]);
}

export default function RootLayout() {
  useFrameworkReady();
  const [user, setUser] = useState<any>(null);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifChecked, setNotifChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Onboarding notification permission logic for iOS
  useEffect(() => {
    async function checkNotifPermissions() {
      if (Platform.OS === 'ios' && !notifChecked) {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          setShowNotifModal(true);
        }
        setNotifChecked(true);
      }
    }
    checkNotifPermissions();
  }, [notifChecked]);

  const handleRequestNotifications = async () => {
    setShowNotifModal(false);
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'You can enable notifications later in your device settings to receive reminders.'
      );
    }
  };

  useProtectedRoute(user);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
      <StatusBar style="auto" />
      {/* Notification Permission Modal for iOS */}
      <Modal
        visible={showNotifModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalBox}>
            <Text style={modalStyles.title}>Enable Notifications</Text>
            <Text style={modalStyles.body}>
              We use notifications to remind you to reach out to your contacts
              and celebrate birthdays. Please enable notifications to stay
              connected!
            </Text>
            <TouchableOpacity
              style={modalStyles.button}
              onPress={handleRequestNotifications}
            >
              <Text style={modalStyles.buttonText}>Enable Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
