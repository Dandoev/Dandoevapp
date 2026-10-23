import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react-native';
import { BIKE_ASSETS } from '../lib/bike-assets';
import { ScreenType } from '../../App';
import BrandMark from '../components/BrandMark';

interface Props {
  onComplete: () => void;
  onDemoLogin?: () => void;
  navigateTo: (screen: ScreenType) => void;
}

const slides = [
  { eyebrow: 'MOVE DIFFERENTLY', title: 'The city is\nyours to explore.', body: 'Discover electric rides built for your everyday. Quiet power, effortless movement, and a better way forward.', image: BIKE_ASSETS['bike-g90'], detail: '01  /  ELECTRIC MOBILITY', stat: 'Made for everyday rides' },
  { eyebrow: 'YOUR RIDE, YOUR PACE', title: 'Own the ride.\nPay your way.', body: 'Find a plan that fits your life, with clear repayment options and an easy path from browsing to ownership.', image: BIKE_ASSETS['bike-g90-lite'], detail: '02  /  FLEXIBLE OWNERSHIP', stat: 'Flexible payment plans' },
  { eyebrow: 'BUILT FOR WHAT’S NEXT', title: 'Ride further.\nBuild more.', body: 'Track your progress, manage repayments, and grow your savings from one beautifully simple place.', image: BIKE_ASSETS['bike-g90'], detail: '03  /  ALL IN ONE PLACE', stat: 'A smarter journey' },
] as const;

export default function OnboardingScreen({ onComplete, onDemoLogin }: Props) {
  const [index, setIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const slide = slides[index];
  const compact = height < 720;
  const heroHeight = Math.min(Math.max(height * 0.38, 260), 390);
  const advance = () => index === slides.length - 1 ? onComplete() : setIndex(index + 1);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: '#0A154F' }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 25, paddingTop: compact ? 22 : 36, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 27 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <BrandMark size={34} />
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.7 }}>Dando<Text style={{ color: '#26FEDC' }}>EV</Text></Text>
        </View>
        <Pressable onPress={onComplete} accessibilityRole="button" accessibilityLabel="Sign in" style={{ padding: 10 }}><Text style={{ color: '#B6C6DC', fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Sign in</Text></Pressable>
      </View>

      <View style={{ height: heroHeight, borderRadius: 31, overflow: 'hidden', backgroundColor: index === 1 ? '#E9F0FF' : '#EAF4FF', padding: 23, borderCurve: 'continuous' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
          <View style={{ backgroundColor: '#0A154F', borderRadius: 100, paddingHorizontal: 13, paddingVertical: 9 }}><Text style={{ color: '#26FEDC', fontSize: 10, letterSpacing: 1.5, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{slide.detail}</Text></View>
          <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#8292B7', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={17} color="#2E3192" /></View>
        </View>
        <View style={{ position: 'absolute', width: width * 0.72, height: width * 0.72, maxWidth: 345, maxHeight: 345, borderRadius: 999, backgroundColor: '#26FEDC', opacity: 0.62, alignSelf: 'center', top: heroHeight * 0.14 }} />
        <Image source={slide.image} resizeMode="contain" style={{ width: '115%', height: '74%', alignSelf: 'center', position: 'absolute', bottom: 5 }} />
        <View style={{ position: 'absolute', bottom: 20, left: 22, right: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 7 }}><ShieldCheck size={15} color="#2E3192" /><Text style={{ color: '#2E3192', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>{slide.stat}</Text></View>
          <Text style={{ color: '#2E3192', fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>DANDO EV</Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingTop: compact ? 24 : 30, paddingBottom: 20 }}>
        <Text style={{ color: '#26FEDC', fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 2, marginBottom: 12 }}>{slide.eyebrow}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: Math.min(width * 0.115, 47), lineHeight: Math.min(width * 0.124, 52), fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -2.2 }}>{slide.title}</Text>
        <Text style={{ color: '#B6C6DC', fontSize: 15, lineHeight: 23, fontFamily: 'Inter_400Regular', marginTop: 13, maxWidth: 430 }}>{slide.body}</Text>
      </View>

      <View style={{ gap: 17 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 7 }}>{slides.map((item, dot) => <Pressable key={item.detail} onPress={() => setIndex(dot)} accessibilityRole="button" accessibilityState={{ selected: dot === index }} accessibilityLabel={`Go to introduction page ${dot + 1}`} hitSlop={12} style={{ width: dot === index ? 27 : 8, height: 8, borderRadius: 8, backgroundColor: dot === index ? '#26FEDC' : '#6B7DA9' }} />)}</View>
          <Text style={{ color: '#AFC3C0', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>{String(index + 1).padStart(2, '0')} / 03</Text>
        </View>
        <Pressable onPress={advance} accessibilityRole="button" style={{ backgroundColor: '#26FEDC', borderRadius: 19, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 21 }}><Text style={{ color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17 }}>{index === slides.length - 1 ? 'Get started' : 'Continue'}</Text><ArrowRight size={22} color="#0A154F" /></Pressable>
        {index > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
            <Pressable onPress={() => setIndex(index - 1)} accessibilityRole="button" hitSlop={12} style={{ paddingVertical: 5 }}>
              <Text style={{ color: '#B6C6DC', fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
