import React from 'react';
import { Image, View } from 'react-native';
import { BRAND_ASSETS } from '../lib/bike-assets';

interface BrandMarkProps {
  size?: number;
  backgroundColor?: string;
}

// The supplied wordmark contains the symbol in its upper portion. Frame that
// symbol consistently without creating a separate, divergent logo asset.
export default function BrandMark({ size = 36, backgroundColor = '#26FEDC' }: BrandMarkProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="DandoEV logo"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        source={BRAND_ASSETS.logo}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: size * 1.46,
          height: size * 1.33,
          left: -size * 0.22,
          top: -size * 0.05,
        }}
      />
    </View>
  );
}
