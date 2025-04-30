import { createClient } from '@supabase/supabase-js';
// Temporarily comment out the import if types aren't available
// import { Database } from '@/types/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { captureException } from './sentry';

// Try to get the environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Log to Sentry if environment variables are missing in production
if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Missing Supabase environment variables');
  captureException(error, {
    supabaseUrl: supabaseUrl ? 'defined' : 'undefined',
    supabaseAnonKey: supabaseAnonKey ? 'defined' : 'undefined',
    env: process.env.NODE_ENV,
  });
  console.error(
    'Environment variables missing in Supabase client setup:',
    !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL is missing' : '',
    !supabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing' : ''
  );
}

// Create client without type safety for now
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
