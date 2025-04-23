import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { useContactStore, Contact } from '@/lib/store';
import { router } from 'expo-router';
import {
  Users,
  UserPlus,
  Flame,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { formatDistanceToNow, isPast, isValid } from 'date-fns';
import { useHeaderHeight } from '@react-navigation/elements';
import { ThemedText } from '@/components/ThemedText';

export default function HomeScreen() {
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const contacts = useContactStore((state) => state.contacts);

  // Sort contacts to find the next upcoming one
  const sortedContacts = [...contacts]
    // Filter for valid Date objects
    .filter((c) => c.nextContact instanceof Date && isValid(c.nextContact))
    .sort((a, b) => {
      // a.nextContact and b.nextContact are Date objects here
      const aDate = a.nextContact;
      const bDate = b.nextContact;
      // Prioritize non-past dates
      const aIsFuture = !isPast(aDate);
      const bIsFuture = !isPast(bDate);
      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;
      // Compare time directly
      return aDate.getTime() - bDate.getTime();
    });

  const nextContact = sortedContacts.length > 0 ? sortedContacts[0] : null;

  const renderNextContactInfo = () => {
    // Check if nextContact and its nextContact property (Date) exist
    if (
      !nextContact ||
      !(nextContact.nextContact instanceof Date) ||
      !isValid(nextContact.nextContact)
    ) {
      return (
        <ThemedText style={[styles.infoText, { color: colors.secondaryText }]}>
          No upcoming reminders.
        </ThemedText>
      );
    }

    const nextContactDate = nextContact.nextContact; // It's already a Date object

    const timeDistance = formatDistanceToNow(nextContactDate, {
      addSuffix: true,
    });
    const dateStyle = isPast(nextContactDate)
      ? { color: colors.error }
      : { color: colors.accent };

    return (
      <View style={styles.nextContactContainer}>
        <ThemedText style={[styles.nextContactLabel, { color: colors.text }]}>
          Next Contact:
        </ThemedText>
        <ThemedText style={[styles.nextContactName, { color: colors.text }]}>
          {nextContact.name}
        </ThemedText>
        <ThemedText style={[styles.nextContactDate, dateStyle]}>{timeDistance}</ThemedText>
      </View>
    );
  };

  const navButtons = [
    { name: 'Contacts', icon: Users, path: '/(tabs)/' },
    { name: 'Add Contact', icon: UserPlus, path: '/(tabs)/add' },
    { name: 'Streaks', icon: Flame, path: '/(tabs)/streak' }, // Assuming streak.tsx exists
    { name: 'Settings', icon: SettingsIcon, path: '/(tabs)/settings' }, // Assuming settings.tsx exists
  ];

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: headerHeight },
      ]}
    >
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
        />
        <ThemedText style={[styles.title, { color: colors.text }]}>KeepTouch</ThemedText>
      </View>

      <View style={styles.infoSection}>
        <ThemedText style={[styles.infoText, { color: colors.text }]}>
          Total Contacts: {contacts.length}
        </ThemedText>
        {renderNextContactInfo()}
      </View>

      <View style={styles.navGrid}>
        {navButtons.map((button) => (
          <TouchableOpacity
            key={button.name}
            style={[styles.navButton, { backgroundColor: colors.card }]}
            onPress={() => router.push(button.path as any)}
          >
            <button.icon size={32} color={colors.accent} />
            <ThemedText style={[styles.navButtonText, { color: colors.text }]}>
              {button.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 18,
    marginBottom: 20,
  },
  nextContactContainer: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)', // Subtle background
    borderRadius: 10,
  },
  nextContactLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  nextContactName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  nextContactDate: {
    fontSize: 16,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  navButton: {
    width: '45%', // Two columns
    aspectRatio: 1, // Make them square-ish
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    padding: 10,
    // Add shadow/elevation if needed based on theme
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  navButtonText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
