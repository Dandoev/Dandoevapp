import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft,
  CreditCard,
  MessageSquare,
  Bell,
  CheckCheck,
  Zap,
  ShieldCheck,
  Check,
} from 'lucide-react-native';
import { demoStore, DemoNotification } from '../lib/demo-data';
import { MobileApi } from '../lib/api';
import { supabase } from '../lib/supabase';

interface NotificationsScreenProps {
  onBack: () => void;
  token?: string | null;
}

function formatNotificationTime(dateStr?: string | Date): string {
  if (!dateStr) return 'Recent';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

function mapNotificationCategory(type?: string): 'payment' | 'message' | 'update' {
  const t = (type || '').toLowerCase();
  if (t.includes('payment') || t.includes('repayment') || t.includes('wallet') || t.includes('mandate') || t.includes('saving')) {
    return 'payment';
  }
  if (t.includes('message') || t.includes('announcement') || t.includes('support')) {
    return 'message';
  }
  return 'update'; // kyc, loan, order, security, bike, system
}

export default function NotificationsScreen({ onBack, token }: NotificationsScreenProps) {
  const isDemoUser = Boolean(token?.startsWith('demo-'));
  const [notifications, setNotifications] = useState<DemoNotification[]>(
    isDemoUser ? demoStore.getNotifications() : []
  );
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'payment' | 'message' | 'update'>('all');

  const fetchRealNotifications = useCallback(async () => {
    if (!token || isDemoUser) return;
    try {
      const res = await MobileApi.getNotifications(token);
      if (res.success && Array.isArray(res.data)) {
        const mapped: DemoNotification[] = res.data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: mapNotificationCategory(n.type),
          isRead: Boolean(n.isRead),
          timestamp: formatNotificationTime(n.createdAt),
          amount: n.amount ? Number(n.amount) : undefined,
        }));
        setNotifications(mapped);
        setLoadError(false);
      }
    } catch {
      setLoadError(true);
    }
  }, [token, isDemoUser]);

  useEffect(() => {
    if (token && !isDemoUser) {
      void fetchRealNotifications();

      // Subscribe to real-time notifications for active user
      let channel: any = null;
      supabase.auth.getSession().then(({ data }) => {
        const userId = data.session?.user?.id;
        if (userId) {
          channel = supabase
            .channel(`notifications:user:${userId}`)
            .on('broadcast', { event: 'new_notification' }, (event: any) => {
              const payload = event.payload;
              if (payload) {
                const incoming: DemoNotification = {
                  id: payload.id || `realtime-${Date.now()}`,
                  title: payload.title || 'New notification',
                  message: payload.message || '',
                  type: mapNotificationCategory(payload.type),
                  isRead: false,
                  timestamp: 'Just now',
                  amount: payload.data?.amount,
                };
                setNotifications((prev) => [incoming, ...prev]);
              }
            })
            .subscribe();
        }
      });

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }

    const unsub = demoStore.subscribe(() => {
      setNotifications(demoStore.getNotifications());
    });
    return unsub;
  }, [token, isDemoUser, fetchRealNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (token && !isDemoUser) {
      await fetchRealNotifications();
    } else {
      setNotifications(demoStore.getNotifications());
    }
    setRefreshing(false);
  };

  const handleMarkAll = () => {
    if (token && !isDemoUser) {
      MobileApi.markNotificationsRead(token)
        .then(() => setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))))
        .catch(() => {});
    } else {
      demoStore.markAllNotificationsAsRead();
    }
  };

  const handleMarkSingle = (id: string) => {
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    if (token && !isDemoUser) {
      MobileApi.markNotificationsRead(token, id).catch(() => {});
    } else {
      demoStore.markNotificationAsRead(id);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
        <TouchableOpacity style={styles.navBtn} onPress={onBack} activeOpacity={0.7} accessibilityLabel="Go back">
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.navTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.markBtn, unreadCount === 0 && styles.markBtnDisabled]}
          onPress={handleMarkAll}
          activeOpacity={0.7}
          disabled={unreadCount === 0}
          accessibilityLabel="Mark all as read"
        >
          <CheckCheck size={16} color={unreadCount > 0 ? '#2E3192' : '#94A3B8'} />
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
          const count = t.key === 'all'
            ? notifications.length
            : notifications.filter((n) => n.type === t.key).length;

          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              onPress={() => setFilter(t.key as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabCounter, isActive && styles.tabCounterActive]}>
                  <Text style={[styles.tabCounterText, isActive && styles.tabCounterTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2E3192"
            colors={['#2E3192']}
          />
        }
      >
        {loadError && (
          <View style={styles.errorNotice}>
            <Text style={styles.notifMessage}>
              Unable to load live notifications. Pull down to retry.
            </Text>
          </View>
        )}
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Bell size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>
              {filter === 'all'
                ? "You're all caught up! Updates about your bike and payments will appear here."
                : `No ${filter} notifications found.`}
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
              onPress={() => handleMarkSingle(item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: getBadgeColor(item.type) }]}>
                {getIcon(item.type)}
              </View>

              <View style={styles.notifBody}>
                <View style={styles.titleRow}>
                  <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
                    {item.title}
                  </Text>
                  <Text style={styles.notifTime}>{item.timestamp}</Text>
                </View>

                <Text style={styles.notifMessage}>{item.message}</Text>

                {Boolean(item.amount) && (
                  <View style={styles.amountTag}>
                    <Text style={styles.amountTagText}>₦{Number(item.amount).toLocaleString()}</Text>
                  </View>
                )}
              </View>

              {!item.isRead ? (
                <View style={styles.unreadDot} />
              ) : (
                <Check size={14} color="#CBD5E1" style={styles.readCheck} />
              )}
            </TouchableOpacity>
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
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  headerBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Inter_600SemiBold',
  },
  markBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markBtnDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EDF2FA',
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: '#2E3192',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#66728A',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabCounter: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  tabCounterActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCounterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabCounterTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  errorNotice: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDF2FA',
    gap: 12,
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notifCardUnread: {
    backgroundColor: '#FAFCFF',
    borderColor: '#C7D2FE',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    color: '#0A154F',
    fontWeight: '800',
  },
  notifTime: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
  },
  notifMessage: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#475569',
    lineHeight: 18,
  },
  amountTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  amountTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E3192',
    marginTop: 6,
  },
  readCheck: {
    marginTop: 6,
  },
});
