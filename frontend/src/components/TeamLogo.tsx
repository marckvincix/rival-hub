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
        style={[styles.image, { width: dimension, height: dimension, borderRadius: dimension / 4 }]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: dimension, height: dimension, borderRadius: dimension / 4 }]}>
      <Text style={[styles.initial, { fontSize: dimension / 2.5 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
  },
  placeholder: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFF',
    fontWeight: '700',
  }
});
