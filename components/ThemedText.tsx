// components/ThemedText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider'; // Adjust path if necessary

type ThemedTextProps = TextProps;

export const ThemedText = React.forwardRef<Text, ThemedTextProps>(
  ({ style, ...restProps }, ref) => {
    const { colors, defaultFontFamily } = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          { fontFamily: defaultFontFamily, color: colors.text },
          styles.default,
          style,
        ]}
        {...restProps}
      />
    );
  }
);

const styles = StyleSheet.create({
  default: {
    // Add any base text styles you want for all ThemedText instances
    // e.g., fontSize: 16,
  },
  // Add other styles for different types if you implement the 'type' prop
  // title: { fontSize: 24, fontWeight: 'bold' },
  // link: { color: 'blue', textDecorationLine: 'underline' },
});
