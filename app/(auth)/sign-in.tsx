import React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '../../components/ThemeProvider';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { facebookAds } from '@/services/facebookAds';

function SignInInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors, colorScheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    Asset.loadAsync(require('../../assets/images/icon.png')).then(() =>
      setLogoReady(true)
    );
  }, []);

  useEffect(() => {
    if (logoReady) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [logoReady]);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // Set user data for better ad targeting after successful sign-in
      if (data.user) {
        await facebookAds.setUserData(data.user.id, email);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[styles.formContainer, { backgroundColor: colors.card }]}
          >
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Welcome Back
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: colors.secondaryText }]}
            >
              Sign in to continue
            </ThemedText>
            {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#181818' : colors.white,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCorrect={false}
              placeholderTextColor={colors.secondaryText}
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#181818' : colors.white,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              placeholderTextColor={colors.secondaryText}
            />
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.accent },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText style={styles.buttonText}>Sign In</ThemedText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/sign-up')}
              disabled={loading}
            >
              <ThemedText
                style={[styles.secondaryButtonText, { color: colors.accent }]}
              >
                Don't have an account? Create one
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={async () => {
                if (!email) {
                  setError('Please enter your email first');
                  return;
                }
                setLoading(true);
                setError(null);
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email);
                  if (error) throw error;
                  
                  setResetEmail(email);
                  setShowOtpInput(true);
                  Alert.alert(
                    'Check Your Email',
                    'We sent you a 6-digit code to reset your password. Enter the code below.',
                    [{ text: 'OK' }]
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'An error occurred');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <ThemedText
                style={[styles.forgotPasswordText, { color: colors.secondaryText }]}
              >
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>
            
            {showOtpInput && (
              <View style={{ marginTop: 20 }}>
                <ThemedText style={[styles.subtitle, { color: colors.secondaryText, marginBottom: 12 }]}>
                  Enter the 6-digit code from your email
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#181818' : colors.white,
                      borderWidth: 1,
                      borderColor: colors.border,
                      color: colors.text,
                      fontSize: 24,
                      textAlign: 'center',
                      letterSpacing: 8,
                    },
                  ]}
                  placeholder="000000"
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={colors.secondaryText}
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.accent },
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={async () => {
                    if (otp.length !== 6) {
                      setError('Please enter the 6-digit code');
                      return;
                    }
                    setLoading(true);
                    setError(null);
                    try {
                      // Verify OTP and get session
                      const { data, error } = await supabase.auth.verifyOtp({
                        email: resetEmail,
                        token: otp,
                        type: 'recovery',
                      });
                      
                      if (error) throw error;
                      
                      // OTP verified, navigate to reset password screen
                      router.replace('/reset-password');
                    } catch (err: any) {
                      setError('Invalid code. Please check and try again.');
                      console.error('OTP error:', err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Verify Code</ThemedText>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 12, alignItems: 'center' }}
                  onPress={() => {
                    setShowOtpInput(false);
                    setOtp('');
                    setError(null);
                  }}
                >
                  <ThemedText style={{ color: colors.secondaryText }}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.logoContainer}>
            {!logoReady ? (
              <ActivityIndicator
                size="large"
                color={colors.accent}
                style={{ marginVertical: 32 }}
              />
            ) : (
              <>
                <Animated.Image
                  source={require('../../assets/images/icon.png')}
                  style={[styles.logo, { opacity: fadeAnim }]}
                  resizeMode="contain"
                />
                <Animated.Text
                  style={[
                    styles.appName,
                    { color: colors.accent, opacity: fadeAnim },
                  ]}
                >
                  KeepTouch
                </Animated.Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

export default function SignIn() {
  return (
    <ThemeProvider>
      <SignInInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 160,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  button: {
    backgroundColor: '#9d9e9e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9d9e9e',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  logo: {
    width: 160,
    height: 80,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#9d9e9e',
    marginTop: 0,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  forgotPasswordButton: {
    padding: 12,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
