import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
const copilot = require('react-native-copilot');
const walkthroughable = copilot.walkthroughable;
const CopilotStep = copilot.CopilotStep;

const WalkthroughableView = walkthroughable(View);

const OnboardingWalkthroughComponent = ({ start, copilotEvents, isFirstTime, onFinish }: any) => {
  React.useEffect(() => {
    if (isFirstTime) {
      start();
    }
    if (copilotEvents && onFinish) {
      copilotEvents.on('stop', onFinish);
    }
  }, [isFirstTime]);

  return null; // This component only triggers the walkthrough
};

const styles = StyleSheet.create({
  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 320,
  },
  stepNumber: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tooltipText: {
    color: '#222',
    fontSize: 16,
  },
});

const OnboardingWalkthrough = copilot.copilot({
  overlay: 'svg',
  animated: true,
  tooltipStyle: styles.tooltip,
  stepNumberTextStyle: styles.stepNumber,
  tooltipTextStyle: styles.tooltipText,
})(OnboardingWalkthroughComponent);

export { OnboardingWalkthrough, CopilotStep, WalkthroughableView };
