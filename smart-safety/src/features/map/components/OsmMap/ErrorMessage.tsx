import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';

interface ErrorMessageProps {
  errorMsg: string | null;
  onRetry: () => void;
}

const ErrorMessage = ({ errorMsg, onRetry }: ErrorMessageProps) => {
  if (!errorMsg) return null;

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{errorMsg}</Text>
      <Button mode="outlined" onPress={onRetry} compact>
        Retry
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#d32f2f",
    flex: 1,
    marginRight: 8,
  },
});

export default ErrorMessage;
