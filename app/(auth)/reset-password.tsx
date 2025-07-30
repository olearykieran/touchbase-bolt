import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '../../components/ThemeProvider';
import { ThemedText } from '@/components/ThemedText';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  const params = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user has valid session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!session) {
          // No session - for OTP flow, this is normal
          console.log('No session found, waiting for OTP verification');
          setCheckingSession(false);
          // Don't show alert or redirect - user will arrive here after OTP verification
          setValidSession(true); // Allow password reset form to show
        } else {
          // Valid session found
          console.log('Valid session found for password reset');
          setValidSession(true);
          setCheckingSession(false);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        Alert.alert('Error', 'Something went wrong. Please try again.');
        router.replace('/sign-in');
      }
    };

    checkSession();
  }, [router]);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Clear the session and redirect to sign in
      await supabase.auth.signOut();
      
      Alert.alert(
        'Success',
        'Your password has been updated successfully!',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/sign-in')
          }
        ]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <ThemedText style={{ marginTop: 16, color: colors.text }}>Verifying reset link...</ThemedText>
      </View>
    );
  }

  if (!validSession) {
    return null; // Will redirect in useEffect
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.formContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Reset Password
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.secondaryText }]}>
            Enter your new password
          </ThemedText>

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === 'dark' ? '#181818' : colors.white,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="New Password"
            placeholderTextColor={colors.secondaryText}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === 'dark' ? '#181818' : colors.white,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Confirm Password"
            placeholderTextColor={colors.secondaryText}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.accent },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText style={styles.buttonText}>Reset Password</ThemedText>
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
              Back to Sign In
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  formContainer: {
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
});