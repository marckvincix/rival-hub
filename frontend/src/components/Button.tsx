import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#999';
    switch (variant) {
      case 'primary': return '#000';
      case 'secondary': return '#000';
      case 'outline': return '#FFF';
      case 'danger': return '#000';
      default: return '#000';
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return '#000';
    return '#FFF';
  };

  const getBorderColor = () => {
    return '#000';
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 10, paddingHorizontal: 16 };
      case 'medium': return { paddingVertical: 14, paddingHorizontal: 24 };
      case 'large': return { paddingVertical: 18, paddingHorizontal: 32 };
      default: return { paddingVertical: 14, paddingHorizontal: 24 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 18;
      default: return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: 2,
          borderColor: getBorderColor(),
          width: fullWidth ? '100%' : undefined
        }
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons 
              name={icon} 
              size={getFontSize() + 2} 
              color={getTextColor()} 
              style={styles.icon} 
            />
          )}
          <Text style={[styles.text, { color: getTextColor(), fontSize: getFontSize() }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: '700',
  }
});
