import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { updateMedication, deleteMedication } from '@/services/medicationService';
import { ensureNotificationPermission, scheduleDailyMedicationNotification } from '@/services/notificationService';
import { formatReminderTimes, parseReminderTimesInput } from '@/utils/medicationUtils';

export function EditMedicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const id = params.id as string;

  const initialTimes =
    (params.reminder_times as string) || (params.reminder_time as string) || '08:00';

  const [name, setName] = useState((params.name as string) || '');
  const [dose, setDose] = useState((params.dose as string) || '');
  const [reminderTimesInput, setReminderTimesInput] = useState(
    initialTimes.includes(':') && !initialTimes.includes(',')
      ? initialTimes
      : initialTimes.replace(/,/g, ', ')
  );
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const onUpdate = async () => {
    if (!name.trim() || !dose.trim()) {
      Alert.alert('Eksik bilgi', 'İsim ve doz alanlarını doldur.');
      return;
    }

    const reminderTimes = parseReminderTimesInput(reminderTimesInput);
    if (reminderTimes.length === 0) {
      Alert.alert('Eksik bilgi', 'En az bir geçerli saat gir.');
      return;
    }

    try {
      setLoading(true);
      await updateMedication(id, {
        name: name.trim(),
        dose: dose.trim(),
        reminder_time: reminderTimes[0],
        reminder_times: reminderTimes,
        frequency: reminderTimes.length === 1 ? 'gunluk' : `${reminderTimes.length}_kez`,
      });

      await ensureNotificationPermission();
      for (const time of reminderTimes) {
        await scheduleDailyMedicationNotification(name.trim(), dose.trim(), time);
      }

      Alert.alert('Başarılı', 'İlaç güncellendi.');
      router.back();
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    Alert.alert('Onay', 'Bu ilacı silmek istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleteLoading(true);
            await deleteMedication(id);
            router.back();
          } catch {
            Alert.alert('Hata', 'Silinirken bir hata oluştu');
          } finally {
            setDeleteLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', marginBottom: 14 }}>İlacı Düzenle</Text>

      <AppInput label="İlaç Adı" placeholder="Parol" value={name} onChangeText={setName} />
      <AppInput label="Doz" placeholder="500 mg" value={dose} onChangeText={setDose} />
      <AppInput
        label="Saatler (virgülle ayır)"
        placeholder="08:00, 14:00, 20:00"
        keyboardType="numbers-and-punctuation"
        value={reminderTimesInput}
        onChangeText={setReminderTimesInput}
      />

      <AppButton label="Kaydet" loading={loading} onPress={onUpdate} />
      <AppButton label="İlacı Sil" variant="secondary" loading={deleteLoading} onPress={onDelete} />
    </ScrollView>
  );
}
