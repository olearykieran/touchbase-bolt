import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedText } from './ThemedText';
import { useTheme } from './ThemeProvider';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setUser(session?.user ?? false);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setUser(false);
          setIsReady(true);
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    // Only redirect if we're in the wrong place
    if (user === false && inTabsGroup) {
      router.replace('/sign-in');
    }
  }, [user, segments, isReady]);

  // Show loading screen while checking auth
  if (!isReady || (user === false && segments[0] === '(tabs)')) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <ThemedText style={{ marginTop: 16, color: colors.text }}>
          Loading...
        </ThemedText>
      </View>
    );
  }

  return <>{children}</>;
}