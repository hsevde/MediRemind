import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { MedicationScheduleCard } from '@/components/MedicationScheduleCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/hooks/useAuth';
import { listMyMedications } from '@/services/medicationService';
import { Medication } from '@/types/models';

export function MedicationsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!session?.user.id) {
      setLoading(false);
      return;
    }
    const data = await listMyMedications(session.user.id);
    setMedications(data);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData()
        .catch(() => setMedications([]))
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

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>İlaçlarım</Text>
        <Text style={styles.subtitle}>Aktif ilaçların ve kullanım saatlerin.</Text>

        <AppButton label="İlaç Ekle" onPress={() => router.push('/add-medication')} />

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#5C4ECC" />
        ) : medications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz ilaç eklenmedi.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {medications.map((medication) => (
              <MedicationScheduleCard key={medication.id} medication={medication} />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 4,
  },
  list: {
    gap: 10,
    marginTop: 4,
  },
  loader: {
    marginTop: 20,
  },
  empty: {
    paddingVertical: 18,
  },
  emptyText: {
    color: '#6b7280',
  },
});
