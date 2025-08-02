import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { Bell, MessageCircle, X, Send, ChevronRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface NotificationToastProps {
  visible: boolean;
  type: 'reminder' | 'scheduled';
  title: string;
  body: string;
  contactName?: string;
  onAction: () => void;
  onDismiss: () => void;
}

export default function NotificationToast({
  visible,
  type,
  title,
  body,
  contactName,
  onAction,
  onDismiss,
}: NotificationToastProps) {
  const { colors, colorScheme } = useTheme();
  const [animation] = useState(new Animated.Value(0));
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto-dismiss after 10 seconds for regular reminders
      if (type === 'reminder') {
        const timer = setTimeout(() => {
          onDismiss();
        }, 10000);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, type]);

  if (!visible && animation._value === 0) {
    return null;
  }

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 0],
  });

  const Icon = type === 'scheduled' ? MessageCircle : Bell;
  const actionText = type === 'scheduled' ? 'Send Message' : 'View Contact';
  const ActionIcon = type === 'scheduled' ? Send : ChevronRight;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity: animation,
        },
      ]}
    >
      <BlurView
        intensity={95}
        tint={colorScheme}
        style={[
          styles.toast,
          {
            backgroundColor: colorScheme === 'dark' 
              ? 'rgba(30, 30, 30, 0.9)' 
              : 'rgba(255, 255, 255, 0.9)',
            borderColor: colors.border,
            width: screenWidth - 32,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color={colors.secondaryText} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Icon size={20} color={colors.accent} />
          <ThemedText style={[styles.title, { color: colors.text }]}>
            {title}
          </ThemedText>
        </View>

        {contactName && (
          <ThemedText style={[styles.contactName, { color: colors.accent }]}>
            {contactName}
          </ThemedText>
        )}

        <ThemedText 
          style={[styles.body, { color: colors.secondaryText }]}
          numberOfLines={3}
        >
          {body}
        </ThemedText>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.actionButton,
              { backgroundColor: colors.accent },
            ]}
            onPress={onAction}
          >
            <ActionIcon size={18} color="#fff" />
            <ThemedText style={styles.actionButtonText}>{actionText}</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.dismissActionButton,
              { 
                backgroundColor: 'transparent',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={onDismiss}
          >
            <ThemedText style={[styles.dismissActionText, { color: colors.secondaryText }]}>
              {type === 'scheduled' ? 'Later' : 'Dismiss'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 999,
  },
  toast: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  actionButton: {},
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  dismissActionButton: {},
  dismissActionText: {
    fontWeight: '500',
    fontSize: 14,
  },
});