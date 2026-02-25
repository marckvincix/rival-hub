import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface TeamLogoProps {
  logo?: string;
  name: string;
  size?: 'small' | 'medium' | 'large';
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ logo, name, size = 'medium' }) => {
  const getSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'medium': return 48;
      case 'large': return 64;
      default: return 48;
    }
  };

  const dimension = getSize();

  if (logo) {
    return (
      <Image
        source={{ uri: logo }}
        style={[styles.image, { width: dimension, height: dimension }]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: dimension, height: dimension }]}>
      <Text style={[styles.initial, { fontSize: dimension / 2.5 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  placeholder: {
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '700',
  }
});
