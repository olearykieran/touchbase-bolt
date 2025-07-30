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
import { facebookAds } from '@/services/facebookAds';
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

function useProtectedRoute(user: any, initializing: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything while initializing
    if (initializing) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onResetPasswordPage = segments.join('/').includes('reset-password');

    if (user === false && !inAuthGroup) {
      // User is not logged in and not on auth page, redirect to sign-in
      console.log('Redirecting to sign-in: user not authenticated');
      router.replace('/sign-in');
    } else if (user && inAuthGroup && !onResetPasswordPage) {
      // User is logged in but on auth page (not reset-password), redirect to home
      console.log('Redirecting to home: user authenticated but on auth page');
      router.replace('/');
    }
  }, [user, segments, initializing]);
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
        // RevenueCat payment service initialized
      } catch (error) {
        console.error('Error initializing payment service:', error);
        captureException(error);
      }
    };

    initializePayment();

    // Initialize react-native-iap for StoreKit operations
    const initStoreKit = async () => {
      try {
        const IAP = require('react-native-iap');
        await IAP.initConnection();
        // StoreKit connection initialized
      } catch (error) {
        console.error('Error initializing StoreKit:', error);
      }
    };
    
    initStoreKit();

    // Clean up on unmount
    return () => {
      const IAP = require('react-native-iap');
      IAP.endConnection().catch((err: any) => {
        console.error('Error ending StoreKit connection:', err);
      });
    };
  }, []);

  // Initialize Facebook SDK
  useEffect(() => {
    const initFacebookSDK = async () => {
      try {
        await facebookAds.initialize();
        await facebookAds.trackAppActivation();
      } catch (error) {
        console.error('Error initializing Facebook SDK:', error);
        captureException(error);
      }
    };

    initFacebookSDK();
  }, []);

  // Get user session
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    
    // Get initial session with retry
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Try to recover session from storage
          const { data: { session: recoveredSession } } = await supabase.auth.refreshSession();
          if (mounted) {
            console.log('Recovered session:', recoveredSession ? 'exists' : 'missing');
            setUser(recoveredSession?.user ?? false);
            setInitializing(false);
          }
        } else {
          if (mounted) {
            console.log('Initial session:', session ? 'exists' : 'missing');
            setUser(session?.user ?? false);
            setInitializing(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(false);
          setInitializing(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes including PASSWORD_RECOVERY events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session ? 'has session' : 'no session');
      
      // Handle PASSWORD_RECOVERY event specifically
      if (_event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event detected');
        // The session should already be set, navigate to reset password
        router.replace('/reset-password');
      }
      
      if (mounted) {
        setUser(session?.user ?? false);
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

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
  useProtectedRoute(user, initializing, isPasswordReset);

  // Listen for deep links (Stripe and password reset)
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      console.log('Deep link received:', url);
      
      if (url.includes('payment-success')) {
        console.log('Payment success deep link received:', url);
        router.replace('/(tabs)');
      } else if (url.includes('payment-cancel')) {
        console.log('Payment cancel deep link received:', url);
        router.replace('/(tabs)');
      } else if (url.includes('reset-password')) {
        console.log('Password reset deep link received:', url);
        
        try {
          // Try multiple URL parsing strategies
          let access_token = null;
          let refresh_token = null;
          let type = null;
          let error_code = null;
          let error_description = null;
          
          // Strategy 1: Hash fragments (#)
          let code = null;
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hashParams = url.substring(hashIndex + 1);
            const params = new URLSearchParams(hashParams);
            access_token = params.get('access_token');
            refresh_token = params.get('refresh_token');
            type = params.get('type');
            code = params.get('code'); // Authorization code
            error_code = params.get('error_code');
            error_description = params.get('error_description');
            
            console.log('Hash params:', {
              access_token: access_token ? 'present' : 'missing',
              refresh_token: refresh_token ? 'present' : 'missing',
              code: code ? 'present' : 'missing',
              type,
              error_code,
              error_description
            });
          }
          
          // Strategy 2: Query parameters (?)
          if (!access_token && !code) {
            const queryIndex = url.indexOf('?');
            if (queryIndex !== -1) {
              const queryParams = url.substring(queryIndex + 1);
              const params = new URLSearchParams(queryParams);
              access_token = params.get('access_token');
              refresh_token = params.get('refresh_token');
              type = params.get('type');
              code = params.get('code'); // Authorization code
              error_code = params.get('error_code');
              error_description = params.get('error_description');
              
              console.log('Query params:', {
                access_token: access_token ? 'present' : 'missing',
                refresh_token: refresh_token ? 'present' : 'missing',
                code: code ? 'present' : 'missing',
                type,
                error_code,
                error_description
              });
            }
          }
          
          // Check for errors in the URL
          if (error_code || error_description) {
            console.error('Password reset error in URL:', { error_code, error_description });
            Alert.alert(
              'Password Reset Error',
              error_description || 'The password reset link is invalid or has expired. Please request a new one.',
              [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
            );
            return;
          }
          
          // Handle authorization code flow (PKCE)
          if (code && !access_token) {
            console.log('Authorization code found, exchanging for session');
            console.log('Code:', code);
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              
              if (!error && data.session) {
                console.log('Code exchanged successfully, session established');
                console.log('Session user:', data.session.user.email);
                // Mark this as a password reset flow
                setIsPasswordReset(true);
                // Navigate to reset password screen
                setTimeout(() => {
                  router.replace('/reset-password');
                }, 100);
              } else {
                console.error('Error exchanging code for session:', error);
                console.error('Error details:', error?.message, error?.status);
                Alert.alert(
                  'Invalid or Expired Link',
                  error?.message || 'This password reset link is invalid or has expired. Please request a new one.',
                  [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
                );
              }
            } catch (err) {
              console.error('Error in code exchange:', err);
              Alert.alert(
                'Error',
                'Failed to process reset link. Please request a new one.',
                [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
              );
            }
          }
          // Try to set session if we have tokens
          else if (access_token) {
            console.log('Attempting to set session with tokens');
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });
            
            if (!error && data.session) {
              console.log('Session set successfully');
              // Navigate to reset password screen
              router.replace('/reset-password');
            } else {
              console.error('Error setting recovery session:', error);
              Alert.alert(
                'Session Error',
                error?.message || 'Could not establish session. Please request a new password reset link.',
                [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
              );
            }
          } else {
            console.log('No access token or code found in URL');
            // Sometimes the link just opens the app without tokens
            // Check if there's already a recovery session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log('Existing session found, navigating to reset password');
              router.replace('/reset-password');
            } else {
              Alert.alert(
                'Invalid Link',
                'The password reset link appears to be incomplete. Please request a new one.',
                [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
              );
            }
          }
        } catch (err) {
          console.error('Error handling password reset deep link:', err);
          Alert.alert(
            'Error',
            'An error occurred while processing the reset link. Please try again.',
            [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
          );
        }
      }
    };
    
    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    // Listen for new URLs
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [router]);

  // *** Dynamically create styles based on theme ***
  const modalStyles = getModalStyles(colors, colorScheme);

  // Show loading screen during initial auth check
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ThemedText style={{ fontSize: 24, fontWeight: '600', color: colors.accent }}>KeepTouch</ThemedText>
      </View>
    );
  }

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
