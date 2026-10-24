import React from 'react';
import { Image, View } from 'react-native';
import { BRAND_ASSETS } from '../lib/bike-assets';

interface BrandMarkProps {
  size?: number;
  backgroundColor?: string;
  variant?: 'emblem' | 'full';
}

export default function BrandMark({
  size = 36,
  backgroundColor = '#FFFFFF',
  variant = 'emblem',
}: BrandMarkProps) {
  const isEmblem = variant === 'emblem';
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="DandoEv logo"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        backgroundColor,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Math.round(size * 0.1),
      }}
    >
      <Image
        source={isEmblem ? BRAND_ASSETS.emblem : BRAND_ASSETS.logo}
        resizeMode="contain"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </View>
  );
}
