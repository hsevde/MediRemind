import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { DailyDoseRow } from '@/components/DailyDoseRow';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getTodayDoses, toggleDoseTaken } from '@/services/intakeService';
import { getMyProfile } from '@/services/profileService';
import { TodayDose } from '@/types/models';

export function DashboardScreen() {
  const { session } = useAuth();
  const [doses, setDoses] = useState<TodayDose[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!session?.user.id) {
      setLoading(false);
      return;
    }
    const [data, profile] = await Promise.all([
      getTodayDoses(session.user.id),
      getMyProfile(session.user.id).catch(() => null),
    ]);
    setDoses(data);
    setUserName(profile?.full_name?.split(' ')[0] ?? '');
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData()
        .catch(() => setDoses([]))
        .finally(() => setLoading(false));
    }, [loadData])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggle = async (dose: TodayDose, taken: boolean) => {
    if (!session?.user.id) return;
    const key = `${dose.medicationId}_${dose.reminderTime}`;
    setTogglingKey(key);

    setDoses((prev) =>
      prev.map((d) =>
        d.medicationId === dose.medicationId && d.reminderTime === dose.reminderTime
          ? { ...d, taken }
          : d
      )
    );

    try {
      await toggleDoseTaken(session.user.id, dose.medicationId, dose.reminderTime, taken);
    } catch (error) {
      setDoses((prev) =>
        prev.map((d) =>
          d.medicationId === dose.medicationId && d.reminderTime === dose.reminderTime
            ? { ...d, taken: !taken }
            : d
        )
      );
      Alert.alert(
        'Kayıt hatası',
        error instanceof Error ? error.message : 'İlaç durumu kaydedilemedi.'
      );
    } finally {
      setTogglingKey(null);
    }
  };

  const takenCount = doses.filter((d) => d.taken).length;
  const progress = doses.length > 0 ? (takenCount / doses.length) * 100 : 0;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>
          Merhaba{userName ? `, ${userName}` : ''} 👋
        </Text>
        <Text style={styles.subtitle}>
          Bugün {doses.length} ilaç hatırlatman var
          {doses.length > 0 ? ` · ${takenCount}/${doses.length} alındı` : ''}.
        </Text>

        {doses.length > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Bugünkü İlerleme</Text>
              <Text style={styles.progressPercent}>%{Math.round(progress)}</Text>
            </View>
            <ProgressBar progress={progress} />
          </View>
        )}

        <Text style={styles.sectionTitle}>Bugünkü İlaçlar</Text>
        <Text style={styles.sectionHint}>Alınan ilaçları işaretlemek için kutuya dokun</Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : doses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyTitle}>Henüz ilaç yok</Text>
            <Text style={styles.emptyText}>İlaç ekleyerek hatırlatmaları başlat.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {doses.map((dose) => {
              const key = `${dose.medicationId}_${dose.reminderTime}`;
              return (
                <DailyDoseRow
                  key={key}
                  dose={dose}
                  onToggle={(taken) => {
                    if (togglingKey !== key) handleToggle(dose, taken);
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: Spacing.md,
    paddingBottom: 100,
    gap: 10,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    color: Colors.text,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  list: { gap: 10 },
  loader: { marginTop: 20 },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
