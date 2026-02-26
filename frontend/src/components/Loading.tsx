import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  }
});
