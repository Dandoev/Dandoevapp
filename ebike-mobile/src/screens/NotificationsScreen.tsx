import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {
  ArrowLeft,
  CreditCard,
  MessageSquare,
  Bell,
  CheckCheck,
  Zap,
  Info,
} from 'lucide-react-native';
import { demoStore, DemoNotification } from '../lib/demo-data';
import { MobileApi } from '../lib/api';

interface NotificationsScreenProps {
  onBack: () => void;
  token?: string | null;
}

export default function NotificationsScreen({ onBack, token }: NotificationsScreenProps) {
  const isDemoUser = Boolean(token?.startsWith('demo-'));
  const [notifications, setNotifications] = useState<DemoNotification[]>(isDemoUser ? demoStore.getNotifications() : []);
  const [filter, setFilter] = useState<'all' | 'payment' | 'message' | 'update'>('all');

  useEffect(() => {
    if (token && !isDemoUser) {
      MobileApi.getNotifications(token).then((res) => setNotifications(res.data.map((n) => ({ ...n, timestamp: new Date(n.createdAt).toLocaleDateString(), type: n.type === 'payment' ? 'payment' : 'update' })) as DemoNotification[])).catch(() => {});
      return;
    }
    const unsub = demoStore.subscribe(() => {
      setNotifications(demoStore.getNotifications());
    });
    return unsub;
  }, [token, isDemoUser]);

  const handleMarkAll = () => {
    demoStore.markAllNotificationsAsRead();
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard size={18} color="#087F75" />;
      case 'message':
        return <MessageSquare size={18} color="#0284C7" />;
      case 'update':
      default:
        return <Zap size={18} color="#D97706" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'payment':
        return '#EEF2FF';
      case 'message':
        return '#F0F9FF';
      case 'update':
      default:
        return '#FFFBEB';
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Header */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Notifications</Text>
        <TouchableOpacity style={styles.markBtn} onPress={handleMarkAll} activeOpacity={0.7}>
          <CheckCheck size={16} color="#2E3192" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'payment', label: 'Payments' },
          { key: 'message', label: 'Messages' },
          { key: 'update', label: 'Updates' },
        ].map((t) => {
          const isActive = filter === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              onPress={() => setFilter(t.key as any)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Bell size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>You are all caught up!</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <View
              key={item.id}
              style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
            >
              <View style={[styles.iconCircle, { backgroundColor: getBadgeColor(item.type) }]}>
                {getIcon(item.type)}
              </View>

              <View style={styles.notifBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifTime}>{item.timestamp}</Text>
                </View>

                <Text style={styles.notifMessage}>{item.message}</Text>

                {item.amount && (
                  <View style={styles.amountTag}>
                    <Text style={styles.amountTagText}>₦{item.amount.toLocaleString()}</Text>
                  </View>
                )}
              </View>

              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F6F7FC',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBE2F0',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  markBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EDF2FA',
  },
  tabChipActive: {
    backgroundColor: '#2E3192',
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#66728A',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#DBE2F0',
    position: 'relative',
  },
  notifCardUnread: {
    borderColor: '#C7D2FE',
    backgroundColor: '#FAFAFF',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    flex: 1,
  },
  notifTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'Inter_500Medium',
    marginLeft: 6,
  },
  notifMessage: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  amountTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  amountTagText: {
    color: '#2E3192',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A50AE',
    position: 'absolute',
    top: 14,
    right: 14,
  },
});
