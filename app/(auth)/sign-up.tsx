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
  Animated,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '../../components/ThemeProvider';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { facebookAds } from '@/services/facebookAds';

function SignUpInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors, colorScheme } = useTheme();
  const router = useRouter();

  const AnimatedThemedText = Animated.createAnimatedComponent(ThemedText);

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

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      
      // Track successful registration with Facebook
      await facebookAds.trackRegistration('email');
      
      // Set user data for better ad targeting
      if (data.user) {
        await facebookAds.setUserData(data.user.id, email);
      }
      
      setSuccess(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
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
              Create Account
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: colors.secondaryText }]}
            >
              Join KeepTouch to stay connected!
            </ThemedText>
            {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
            {success && (
              <ThemedText style={styles.successText}>
                Account created! Check your email for a confirmation link.
              </ThemedText>
            )}
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
              textContentType="newPassword"
              autoComplete="password"
              placeholderTextColor={colors.secondaryText}
            />
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.accent },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  Create Account
                </ThemedText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/sign-in')}
              disabled={loading}
            >
              <ThemedText
                style={[styles.secondaryButtonText, { color: colors.accent }]}
              >
                Already have an account? Sign in
              </ThemedText>
            </TouchableOpacity>
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
                <AnimatedThemedText
                  style={[
                    styles.appName,
                    { color: colors.accent, opacity: fadeAnim },
                  ]}
                >
                  KeepTouch
                </AnimatedThemedText>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

export default function SignUp() {
  return (
    <ThemeProvider>
      <SignUpInner />
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
  successText: {
    color: '#34C759',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
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
});
