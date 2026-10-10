import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | any;
  maxWidth?: number;
}

export default function LiquidGlassCard({
  children,
  style,
  maxWidth = 368,
}: LiquidGlassCardProps) {
  const { isDark } = useAppTheme();

  const webStyles =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          boxShadow: isDark
            ? '0 24px 48px -12px rgba(0, 0, 0, 0.85), 0 0 24px rgba(249, 115, 22, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.18), inset 0 -1px 1px rgba(0, 0, 0, 0.5)'
            : '0 16px 32px -12px rgba(15, 23, 42, 0.1), 0 0 20px rgba(255, 255, 255, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.85), inset 0 -1px 2px rgba(0, 0, 0, 0.03)',
          background: isDark
            ? 'linear-gradient(135deg, rgba(20, 20, 20, 0.92) 0%, rgba(12, 12, 12, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(244, 244, 245, 0.85) 100%)',
          border: isDark
            ? '1px solid rgba(249, 115, 22, 0.22)'
            : '1px solid rgba(228, 228, 231, 0.9)',
        } as any)
      : {
          backgroundColor: isDark
            ? 'rgba(18, 18, 18, 0.94)'
            : 'rgba(255, 255, 255, 0.94)',
          borderColor: isDark
            ? 'rgba(249, 115, 22, 0.25)'
            : 'rgba(228, 228, 231, 0.9)',
          borderWidth: 1,
        };

  return (
    <View
      style={[
        styles.card,
        {
          maxWidth,
        },
        webStyles,
        style,
      ]}
    >
      {/* Top subtle liquid glare sheen */}
      <View
        style={[
          styles.liquidSheen,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(255, 255, 255, 0.30)',
          },
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  liquidSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
});
