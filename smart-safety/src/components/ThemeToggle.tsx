import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

export default function ThemeToggle({ style }: { style?: any }) {
  const { isDark, toggleTheme, colors } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: colors.toggleBg,
          borderColor: colors.toggleBorder,
        },
        style,
      ]}
    >
      <Ionicons
        name={isDark ? 'sunny' : 'moon'}
        size={18}
        color={isDark ? '#facc15' : '#475569'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
