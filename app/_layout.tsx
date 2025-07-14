import { initSentry, captureException } from '@/lib/sentry';
initSentry();

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { checkEnvironmentVariables } from '@/lib/envCheck';
import { PaymentService } from '@/services/payment';
import { RevenueCatPaymentService } from '@/services/revenueCatPayment';
import {
  Platform,
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  AppState,
  Linking,
  Text,
  ErrorUtils,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import React from 'react';
import { useFonts } from 'expo-font';
import {
  ThemeProvider,
  useTheme,
  ThemeType,
} from '../components/ThemeProvider';
import {
  configureNotificationHandler,
  registerForPushNotificationsAsync,
} from '../lib/notificationUtils';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import * as Sentry from '@sentry/react-native';

// Check environment variables and capture any issues
checkEnvironmentVariables();

// Define or import the type for colors if not already available globally
type ThemeColors = ReturnType<typeof useTheme>['colors'];

// Props for RootLayoutNav to receive modal state/handlers
interface RootLayoutNavProps {
  showNotifModal: boolean;
  setShowNotifModal: (visible: boolean) => void;
  handleRequestNotifications: () => void;
}

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

// Root component that uses the theme - NOW handles the modal
function RootLayoutNav({
  showNotifModal,
  setShowNotifModal,
  handleRequestNotifications,
}: RootLayoutNavProps) {
  // <-- Receive props
  const { colorScheme, colors } = useTheme(); // <-- useTheme is safe here
  const router = useRouter();

  // Configure notification handler once
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Initialize PaymentService for IAP
  useEffect(() => {
    const initializePayment = async () => {
      try {
        // Initialize RevenueCat instead of react-native-iap
        await RevenueCatPaymentService.initialize();
        console.log('RevenueCat payment service initialized');
      } catch (error) {
        console.error('Error initializing payment service:', error);
        captureException(error);
      }
    };

    initializePayment();

    // Clean up on unmount
    return () => {
      PaymentService.endConnection().catch((err) => {
        console.error('Error ending payment connection:', err);
      });
    };
  }, []);

  // Get user session
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Register for push notifications when user is logged in
  useEffect(() => {
    if (user && Platform.OS !== 'web') {
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          // Optionally update token in backend if needed
          console.log('Push token registered/retrieved on load');
        }
      });
    }
  }, [user]);

  // *** Add this useEffect hook for clearing badge ***
  useEffect(() => {
    const clearBadge = async () => {
      await Notifications.setBadgeCountAsync(0);
    };

    // Clear badge on initial load
    clearBadge();

    // Clear badge when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        clearBadge();
      }
    });

    // Cleanup listener on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  // Protected route logic
  useProtectedRoute(user);

  // Listen for Stripe deep links
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      if (url.includes('payment-success')) {
        console.log('Payment success deep link received:', url);
        router.replace('/(tabs)');
      } else if (url.includes('payment-cancel')) {
        console.log('Payment cancel deep link received:', url);
        router.replace('/(tabs)');
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [router]);

  // *** Dynamically create styles based on theme ***
  const modalStyles = getModalStyles(colors, colorScheme);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Notification Permission Modal for iOS - Moved here */}
      <Modal
        visible={showNotifModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalBox}>
            <ThemedText style={modalStyles.title}>
              Enable Notifications
            </ThemedText>
            <ThemedText style={modalStyles.body}>
              We use notifications to remind you to reach out to your contacts
              and celebrate birthdays. Please enable notifications to stay
              connected!
            </ThemedText>
            <TouchableOpacity
              style={modalStyles.button}
              onPress={handleRequestNotifications}
            >
              <ThemedText style={modalStyles.buttonText}>
                Enable Notifications
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Error Fallback Component
function ErrorFallback({ error }: FallbackProps) {
  // Report error to Sentry
  useEffect(() => {
    captureException(error, { source: 'ErrorBoundary' });
  }, [error]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <Text style={{ color: 'red', marginBottom: 10, fontWeight: 'bold' }}>
        Oops! Something went wrong.
      </Text>
      <Text style={{ color: 'red', textAlign: 'center' }}>{error.message}</Text>
      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: '#ff6347',
          padding: 10,
          borderRadius: 5,
        }}
        onPress={() => {
          // Try to restart the app - in Expo this often means going to the home screen and back
          if (Platform.OS === 'ios' || Platform.OS === 'android') {
            Linking.openURL('app://');
          }
        }}
      >
        <Text style={{ color: 'white' }}>Restart App</Text>
      </TouchableOpacity>
    </View>
  );
}

export default Sentry.wrap(function RootLayout() {
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifChecked, setNotifChecked] = useState(false);

  // Load Satoshi fonts
  const [fontsLoaded, fontError] = useFonts({
    'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Italic': require('../assets/fonts/Satoshi-Italic.otf'),
    'Satoshi-Light': require('../assets/fonts/Satoshi-Light.otf'),
    'Satoshi-LightItalic': require('../assets/fonts/Satoshi-LightItalic.otf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.otf'),
    'Satoshi-MediumItalic': require('../assets/fonts/Satoshi-MediumItalic.otf'),
    'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.otf'),
    'Satoshi-BoldItalic': require('../assets/fonts/Satoshi-BoldItalic.otf'),
    'Satoshi-Black': require('../assets/fonts/Satoshi-Black.otf'),
    'Satoshi-BlackItalic': require('../assets/fonts/Satoshi-BlackItalic.otf'),
  });

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

  // Log font loading errors
  useEffect(() => {
    if (fontError instanceof Error) {
      console.error('Font loading error:', fontError);
      // Optionally, show an error message to the user
    }
  }, [fontError]);

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

  // Check for font errors
  if (fontError instanceof Error) {
    // Render a specific error message for font loading issues
    // Or potentially use the ErrorBoundary fallback directly?
    // For now, let's just show a simple text message.
    console.error('Font loading error:', fontError);
    return <Text>Error loading fonts. Please restart the app.</Text>;
  }

  // Wait until fonts are ready (removed framework check)
  if (!fontsLoaded) {
    // Render a loading indicator or null while waiting
    // This prevents rendering RootLayoutNav before everything is ready
    return null; // Or <ActivityIndicator />, etc.
  }

  return (
    <ThemeProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {/* Now we are sure fonts and framework are ready */}
        <RootLayoutNav
          showNotifModal={showNotifModal}
          setShowNotifModal={setShowNotifModal}
          handleRequestNotifications={handleRequestNotifications}
        />
      </ErrorBoundary>
    </ThemeProvider>
  );
});

// Function to generate styles based on theme colors
const getModalStyles = (colors: ThemeColors, colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor:
        colorScheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBox: {
      backgroundColor: colors.card,
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
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });
