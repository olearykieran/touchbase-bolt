// components/ThemedText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider'; // Adjust path if necessary

type ThemedTextProps = TextProps & {
  // Add any custom props specific to your themed text if needed
  // For example, type?: 'default' | 'title' | 'link';
};

export function ThemedText({ style, ...restProps }: ThemedTextProps) {
  const { colors, defaultFontFamily } = useTheme();

  return (
    <Text
      style={[
        { fontFamily: defaultFontFamily, color: colors.text }, // Apply default font and color
        styles.default, // Base styles if any
        style, // Apply any styles passed via props (overrides defaults)
      ]}
      {...restProps} // Pass down other Text props
    />
  );
}

const styles = StyleSheet.create({
  default: {
    // Add any base text styles you want for all ThemedText instances
    // e.g., fontSize: 16,
  },
  // Add other styles for different types if you implement the 'type' prop
  // title: { fontSize: 24, fontWeight: 'bold' },
  // link: { color: 'blue', textDecorationLine: 'underline' },
});
