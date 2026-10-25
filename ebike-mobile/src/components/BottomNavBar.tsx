import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, ShoppingBag, CreditCard, User } from 'lucide-react-native';

export type TabType = 'home' | 'bikes' | 'loans' | 'profile';

interface BottomNavBarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  badgeCount?: { loans?: number };
}

export default function BottomNavBar({ currentTab, onSelectTab, badgeCount }: BottomNavBarProps) {
  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'bikes', label: 'Shop', icon: ShoppingBag },
    { key: 'loans', label: 'Loans', icon: CreditCard },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => onSelectTab(tab.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={styles.iconContainer}>
                <IconComponent
                  size={22}
                  color={isActive ? '#FFFFFF' : '#B6C6DC'}
                  strokeWidth={isActive ? 2.3 : 1.9}
                />
                {tab.key === 'loans' && badgeCount?.loans ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount.loans}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F6F7FC',
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    paddingTop: 6,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#0A154F',
    borderRadius: 24,
    paddingVertical: 9,
    paddingHorizontal: 7,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 18,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#2E3192',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#B6C6DC',
    marginTop: 2,
  },
  labelActive: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2E3192',
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
});
