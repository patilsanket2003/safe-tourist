import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface LiquidGlassButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'destructive' | 'secondary';
  style?: ViewStyle | any;
  textStyle?: TextStyle | any;
}

export default function LiquidGlassButton({
  onPress,
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}: LiquidGlassButtonProps) {
  const { isDark } = useAppTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const getVariantColors = () => {
    switch (variant) {
      case 'destructive':
        return {
          bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.9) 100%)',
          border: 'rgba(254, 202, 202, 0.3)',
          glow: 'rgba(239, 68, 68, 0.5)',
          textColor: '#ffffff',
        };
      case 'secondary':
        return {
          bg: isDark
            ? 'linear-gradient(135deg, rgba(28, 28, 28, 0.95) 0%, rgba(18, 18, 18, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(244, 244, 245, 0.9) 100%)',
          border: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(228, 228, 231, 0.9)',
          glow: isDark ? 'rgba(249, 115, 22, 0.12)' : 'rgba(0, 0, 0, 0.06)',
          textColor: isDark ? '#FFFFFF' : '#09090B',
        };
      case 'primary':
      default:
        return {
          bg: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
          border: 'rgba(254, 215, 170, 0.35)',
          glow: 'rgba(249, 115, 22, 0.55)',
          textColor: '#ffffff',
        };
    }
  };

  const vColors = getVariantColors();

  const webShadow = isDark
    ? `0 4px 18px ${vColors.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.5)`
    : `0 4px 14px ${vColors.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 -1px 2px rgba(0, 0, 0, 0.06)`;

  const webStyles =
    Platform.OS === 'web'
      ? ({
          background: vColors.bg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1.5px solid ${vColors.border}`,
          boxShadow: isPressed
            ? `0 1px 4px ${vColors.glow}, inset 0 2px 6px rgba(0, 0, 0, 0.35)`
            : isHovered
            ? `0 8px 28px ${vColors.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.4)`
            : webShadow,
          transform: isPressed ? 'scale(0.97)' : isHovered ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        } as any)
      : {
          backgroundColor: variant === 'destructive' ? '#ef4444' : '#F97316',
        };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      {...((Platform.OS === 'web'
        ? {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => {
              setIsHovered(false);
              setIsPressed(false);
            },
          }
        : {}) as any)}
      style={[
        styles.button,
        webStyles,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {/* Specular Liquid Glare highlight on top half */}
      <View style={styles.topSheen} pointerEvents="none" />

      {loading ? (
        <ActivityIndicator color={vColors.textColor} size="small" />
      ) : typeof children === 'string' ? (
        <Text style={[styles.text, { color: vColors.textColor }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.65,
  },
});
