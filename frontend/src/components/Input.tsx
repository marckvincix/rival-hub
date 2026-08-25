import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style
        ]}
        placeholderTextColor="#999"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  error: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  }
});
