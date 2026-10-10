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
            ? '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(249, 115, 22, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 -1px 1px rgba(0, 0, 0, 0.4)'
            : '0 12px 28px -10px rgba(15, 23, 42, 0.1), 0 0 16px rgba(255, 255, 255, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.8), inset 0 -1px 2px rgba(0, 0, 0, 0.03)',
          background: isDark
            ? 'linear-gradient(135deg, rgba(14, 14, 14, 0.72) 0%, rgba(8, 8, 8, 0.78) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(244, 244, 245, 0.70) 100%)',
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
