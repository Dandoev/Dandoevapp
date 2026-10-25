import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions, StyleSheet, Platform } from 'react-native';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { BIKE_ASSETS } from '../lib/bike-assets';
import { ScreenType } from '../../App';
import BrandMark from '../components/BrandMark';

interface Props {
  onComplete: () => void;
  onDemoLogin?: () => void;
  navigateTo: (screen: ScreenType) => void;
}

const slides = [
  {
    eyebrow: 'MOVE DIFFERENTLY',
    title: 'Ride smarter.\nMove further.',
    body: 'Electric bike built for your daily work and movement. More earnings, lower running costs, and a cleaner tomorrow.',
    image: BIKE_ASSETS['bike-g90'],
    detailNum: '01',
    detailLabel: 'ELECTRIC MOBILITY',
    stat: 'Made for everyday riders',
  },
  {
    eyebrow: 'YOUR RIDE, YOUR PACE',
    title: 'Own the ride.\nPay your way.',
    body: 'Find a plan that fits your life, with clear repayment options and an easy path from browsing to ownership.',
    image: BIKE_ASSETS['bike-g90-lite'],
    detailNum: '02',
    detailLabel: 'FLEXIBLE OWNERSHIP',
    stat: 'Flexible payment plans',
  },
  {
    eyebrow: 'BUILT FOR WHAT’S NEXT',
    title: 'Ride further.\nBuild more.',
    body: 'Track your progress, manage repayments, and grow your savings from one beautifully simple place.',
    image: BIKE_ASSETS['bike-x5'],
    detailNum: '03',
    detailLabel: 'ALL IN ONE PLACE',
    stat: 'A smarter journey',
  },
] as const;

export default function OnboardingScreen({ onComplete, onDemoLogin }: Props) {
  const [index, setIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const slide = slides[index];
  const compact = height < 720;
  const heroHeight = Math.min(Math.max(height * 0.38, 270), 390);
  const advance = () => index === slides.length - 1 ? onComplete() : setIndex(index + 1);

  return (
    <View
      style={[
        { flex: 1, backgroundColor: '#7ECCFD' },
        Platform.OS === 'web' && ({
          backgroundImage: 'linear-gradient(180deg, #7ECCFD 0%, #A6DEFD 42%, #E4F4FE 100%)',
        } as any),
      ]}
    >
      {/* Native SVG Linear Gradient for Android / iOS */}
      <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
        <Defs>
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#7ECCFD" />
            <Stop offset="35%" stopColor="#9BD7FD" />
            <Stop offset="70%" stopColor="#D2ECFE" />
            <Stop offset="100%" stopColor="#E8F6FE" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bgGrad)" />
      </Svg>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: compact ? 20 : 36,
          paddingBottom: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BrandMark size={36} backgroundColor="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.6 }}>
              DandoEv
            </Text>
          </View>
          <Pressable onPress={onComplete} accessibilityRole="button" accessibilityLabel="Sign in" style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text style={{ color: '#0A154F', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>
              Sign in
            </Text>
          </Pressable>
        </View>

        {/* Hero Card */}
        <View
          style={{
            height: heroHeight,
            borderRadius: 32,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            padding: 22,
            borderCurve: 'continuous',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.9)',
            shadowColor: '#1768D1',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 6,
          }}
        >
          {/* Card Top Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
            <View
              style={{
                backgroundColor: '#0A154F',
                borderRadius: 100,
                paddingHorizontal: 14,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#36C0FE', fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1.2 }}>
                {slide.detailNum}{' '}
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1.2 }}>
                / {slide.detailLabel}
              </Text>
            </View>

            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#D7EDFC',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
              }}
            >
              <Sparkles size={17} color="#0A154F" />
            </View>
          </View>

          {/* Blue Sphere Halo Behind Bike (Exact Match to Image) */}
          <View
            style={{
              position: 'absolute',
              width: width * 0.72,
              height: width * 0.72,
              maxWidth: 320,
              maxHeight: 320,
              borderRadius: 999,
              backgroundColor: '#8AD1FD',
              alignSelf: 'center',
              top: heroHeight * 0.12,
            }}
          />

          {/* Bike Image */}
          <Image
            source={slide.image}
            resizeMode="contain"
            style={{
              width: '115%',
              height: '76%',
              alignSelf: 'center',
              position: 'absolute',
              bottom: 6,
            }}
          />

          {/* Card Bottom Row */}
          <View
            style={{
              position: 'absolute',
              bottom: 18,
              left: 20,
              right: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                borderWidth: 1,
                borderColor: '#EDF5FC',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <ShieldCheck size={16} color="#0A154F" />
              <Text style={{ color: '#0A154F', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
                {slide.stat}
              </Text>
            </View>

            <Text style={{ color: '#0A154F', fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.2 }}>
              DandoEv
            </Text>
          </View>
        </View>

        {/* Text Section */}
        <View style={{ flex: 1, justifyContent: 'center', paddingTop: compact ? 20 : 28, paddingBottom: 16 }}>
          <Text
            style={{
              color: '#1768D1',
              fontSize: 12,
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              letterSpacing: 2,
              marginBottom: 10,
            }}
          >
            {slide.eyebrow}
          </Text>
          <Text
            style={{
              color: '#0A154F',
              fontSize: Math.min(width * 0.115, 46),
              lineHeight: Math.min(width * 0.124, 50),
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              letterSpacing: -1.8,
            }}
          >
            {slide.title}
          </Text>
          <Text
            style={{
              color: '#334155',
              fontSize: 16,
              lineHeight: 25,
              fontFamily: 'Inter_400Regular',
              marginTop: 12,
              maxWidth: 430,
            }}
          >
            {slide.body}
          </Text>
        </View>

        {/* Controls, Pagination & Actions */}
        <View style={{ gap: 16 }}>
          {/* Dots & Counter */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {slides.map((item, dot) => (
                <Pressable
                  key={item.eyebrow}
                  onPress={() => setIndex(dot)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dot === index }}
                  accessibilityLabel={`Go to introduction page ${dot + 1}`}
                  hitSlop={12}
                  style={{
                    width: dot === index ? 28 : 7,
                    height: 7,
                    borderRadius: 7,
                    backgroundColor: dot === index ? '#36C0FE' : '#BFDBFE',
                  }}
                />
              ))}
            </View>
            <Text style={{ color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14 }}>
              {String(index + 1).padStart(2, '0')} / 03
            </Text>
          </View>

          {/* Primary Action Button */}
          <Pressable
            onPress={advance}
            accessibilityRole="button"
            style={{
              backgroundColor: '#36C0FE',
              borderRadius: 22,
              minHeight: 58,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 22,
              shadowColor: '#36C0FE',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 14,
              elevation: 4,
            }}
          >
            <Text style={{ color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16 }}>
              {index === slides.length - 1 ? 'Get started' : 'Continue'}
            </Text>
            <ArrowRight size={22} color="#0A154F" strokeWidth={2.4} />
          </Pressable>

          {/* Footer Demo / Back Actions */}
          <View style={{ alignItems: 'center', gap: 6, paddingTop: 2 }}>
            <Pressable
              onPress={onDemoLogin || onComplete}
              accessibilityRole="button"
              hitSlop={10}
              style={{ paddingVertical: 6 }}
            >
              <Text style={{ color: '#0A154F', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>
                Explore demo
              </Text>
            </Pressable>

            {index > 0 && (
              <Pressable
                onPress={() => setIndex(index - 1)}
                accessibilityRole="button"
                hitSlop={12}
                style={{ paddingVertical: 4 }}
              >
                <Text style={{ color: '#64748B', fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                  Back
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
