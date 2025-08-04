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
          How to Use KeepTouch RE
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
            KeepTouch RE helps real estate professionals maintain strong relationships with clients, prospects, and referral partners.
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Adding Clients & Contacts
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            1. Tap the + button on the Contacts page
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            2. Import from your phone's contacts or CRM
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            3. Set follow-up frequency (weekly, monthly, quarterly, or yearly)
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            4. Add property details, transaction dates, and notes (optional)
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Client Communication
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Tap "Generate Message" to create AI-powered messages
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Choose from: Client Check-in, Market Update, Home Anniversary, Birthday, Maintenance Tips, and more
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Messages open directly in your messaging app
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Client is automatically marked as "contacted" after sending
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Tracking Client Engagement
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            🔥 Build engagement streaks by following up with clients on schedule
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Individual client streaks track your consistency with each relationship
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Global streak tracks your overall client relationship management
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            • Streaks reset if you miss a scheduled follow-up
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
            • Add up to 3 clients
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Generate 3 AI-powered messages per week
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText, marginTop: 8 }]}>
            Premium users get:
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Unlimited clients and contacts
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Unlimited AI-powered messages
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            • Priority support for real estate professionals
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Best Practices for Real Estate
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            💡 Set follow-up frequencies based on client type (active buyers weekly, past clients quarterly)
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            💡 Track birthdays and home anniversaries for personalized touchpoints
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            💡 Use custom messages for specific property updates or market insights
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            💡 Review daily to maintain consistent client relationships
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Troubleshooting
          </ThemedText>
          <ThemedText style={[styles.step, { color: colors.secondaryText }]}>
            🔧 Changing Reminder Times
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            If a contact's reminder is not scheduled for the correct time, you can:
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText, marginLeft: 32 }]}>
            1. Delete the contact (swipe left on the contact)
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText, marginLeft: 32 }]}>
            2. Add them again with the correct "First Reminder" time
          </ThemedText>
          <ThemedText style={[styles.substep, { color: colors.secondaryText }]}>
            Note: Currently, there's no way to edit reminder times after a contact is created.
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