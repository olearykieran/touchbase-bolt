import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function InstructionsScreen() {
  const { colors, colorScheme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
          How to Use KeepTouch
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Getting Started
          </ThemedText>
          <ThemedText style={[styles.sectionText, { color: colors.secondaryText }]}>
            KeepTouch helps you maintain meaningful connections with the important people in your life.
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Adding Contacts
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            1. Tap the + button on the Contacts page
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            2. Import from your phone's contacts or enter manually
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            3. Set how often you want to be reminded (daily, weekly, monthly, or quarterly)
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            4. Add birthday and first reminder time (optional)
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Staying in Touch
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Tap "Generate Message" to create AI-powered messages
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Choose from different message types: Regular, Love, Gratitude, Birthday, Joke, Fact, or Custom
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Messages open directly in your messaging app
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Contact is automatically marked as "contacted" after sending
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Understanding Streaks
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            🔥 Build streaks by contacting people on time
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Personal streaks track consistency with each contact
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Global streak tracks overall consistency
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Streaks reset if you miss a scheduled contact
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Premium Features
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            Free users can:
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Add up to 3 contacts
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Generate 3 AI messages per week
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText, marginTop: 8 }]}>
            Premium users get:
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Unlimited contacts
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Unlimited AI messages
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Priority support
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Tips for Success
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            💡 Set realistic contact frequencies - quality over quantity
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            💡 Add birthdays to never miss important dates
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            💡 Use custom messages for more personal touches
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            💡 Check the app regularly to see who needs attention
          </ThemedText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  step: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  substep: {
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 16,
    marginBottom: 4,
  },
});