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
  ImageBackground,
  SafeAreaView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '../../components/ThemeProvider';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { facebookAds } from '@/services/facebookAds';
import { Mail, Lock } from 'lucide-react-native';

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
    <ImageBackground 
      source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
      style={[styles.container, { backgroundColor: colors.background }]}
      imageStyle={{ opacity: 0.02 }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[styles.formContainer, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(40, 40, 40, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(20px)',
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                }]}
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
            <View style={styles.inputContainer}>
              <Mail size={20} color={colors.mutedText} style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    borderBottomWidth: 2,
                    borderBottomColor: colors.border,
                    color: colors.text,
                    paddingLeft: 40,
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
                placeholderTextColor={colors.mutedText}
              />
            </View>
            <View style={styles.inputContainer}>
              <Lock size={20} color={colors.mutedText} style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    borderBottomWidth: 2,
                    borderBottomColor: colors.border,
                    color: colors.text,
                    paddingLeft: 40,
                  },
                ]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password"
                placeholderTextColor={colors.mutedText}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.button,
                { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(113, 113, 122, 0.6)' : 'rgba(113, 113, 122, 0.5)',
                  borderWidth: 1,
                  borderColor: colors.accent,
                  backdropFilter: 'blur(20px)',
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 8,
                },
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
      </SafeAreaView>
    </ImageBackground>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 16,
  },
  formContainer: {
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 120,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
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
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 0,
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
