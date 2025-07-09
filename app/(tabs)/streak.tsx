import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView, // Use ScrollView for potential content overflow
} from 'react-native';
import { useContactStore } from '@/lib/store'; // Adjust path if necessary
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/components/ThemeProvider'; // Import useTheme
import { ThemedText } from '@/components/ThemedText'; // Import ThemedText
import { supabase } from '@/lib/supabase'; // Import supabase client
import { useHeaderHeight } from '@react-navigation/elements';

const StreakScreen = () => {
  const { colors } = useTheme(); // Get theme colors
  const headerHeight = useHeaderHeight();

  // State for Global Streak
  const [globalStreak, setGlobalStreak] = useState<number>(0);
  const [globalStreakLoading, setGlobalStreakLoading] = useState<boolean>(true);
  const [globalStreakError, setGlobalStreakError] = useState<string | null>(
    null
  );

  // State for Contacts (for loading and error only)
  const { loading: contactsLoading, error: contactsError } = useContactStore(
    (state) => ({
      loading: state.loading,
      error: state.error,
    })
  );

  // Define fetchGlobalStreak outside useEffect for reusability
  const fetchGlobalStreak = async () => {
    setGlobalStreakLoading(true);
    setGlobalStreakError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First, try to fix streaks
      console.log('Running streak fix...');
      const { data: fixData, error: fixError } = await supabase.functions.invoke('fix-streaks');
      if (fixError) {
        console.error('Error fixing streaks:', fixError);
      } else {
        console.log('Streaks fixed:', fixData);
      }

      // Then fetch the updated global streak
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('global_streak')
        .eq('id', user.id)
        .single();

      if (error) {
        // Handle case where profile might not exist yet for older users
        if (error.code === 'PGRST116') {
          // code for 'Resource Not Found'
          console.warn(
            'User profile not found. Defaulting global streak to 0.'
          );
          setGlobalStreak(0); // Default to 0 if no profile
        } else {
          throw error; // Rethrow other errors
        }
      } else {
        setGlobalStreak(profile?.global_streak ?? 0);
      }
    } catch (err) {
      console.error('Error fetching global streak:', err);
      setGlobalStreakError(
        err instanceof Error ? err.message : 'Failed to fetch global streak'
      );
      setGlobalStreak(0); // Default on error
    } finally {
      setGlobalStreakLoading(false);
    }
  };

  // Fetch global streak from profile on mount
  useEffect(() => {
    fetchGlobalStreak();
  }, []); // Fetch only once on mount

  // Combined loading state
  if (contactsLoading || globalStreakLoading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: headerHeight },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: headerHeight },
      ]}
    >
      {/* Global Consistency Streak Section */}
      <View style={styles.streakSection}>
        <MaterialIcons name="event-available" size={60} color={colors.accent} />
        <ThemedText style={[styles.title, { color: colors.text }]}>
          Daily Consistency
        </ThemedText>
        {globalStreakError ? (
          <ThemedText style={styles.errorText}>{globalStreakError}</ThemedText>
        ) : (
          <>
            <ThemedText style={[styles.streakNumber, { color: colors.accent }]}>
              {globalStreak}
            </ThemedText>
            <ThemedText style={[styles.daysText, { color: colors.secondaryText }]}>
              days
            </ThemedText>
          </>
        )}
        <ThemedText style={[styles.subText, { color: colors.secondaryText }]}>
          Days in a row you've reached out to everyone due.
        </ThemedText>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, // Needed for ScrollView content alignment
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40, // Add more vertical padding
    // backgroundColor is now set dynamically
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakSection: {
    alignItems: 'center',
    marginBottom: 30, // Space between sections
    width: '100%', // Ensure section takes width for text alignment
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    // color is now set dynamically
    textAlign: 'center',
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    // color is now set dynamically
    // marginBottom adjusted below
  },
  daysText: {
    fontSize: 18,
    // color is now set dynamically
    marginTop: -10, // Pull it closer to the number
    marginBottom: 20, // Add spacing below 'days'
  },
  subText: {
    fontSize: 16,
    // color is now set dynamically
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default StreakScreen;
