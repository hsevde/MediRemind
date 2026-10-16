import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { DatePickerField } from '@/components/DatePickerField';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { MealTimingField, MealTimingModal } from '@/components/MealTimingSelect';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TimePickerField } from '@/components/TimePickerField';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { addMedication } from '@/services/medicationService';
import { aiService } from '@/services/aiService';
import {
  ensureNotificationPermission,
  scheduleDailyMedicationNotification,
} from '@/services/notificationService';
import { DurationType, MealTiming } from '@/types/models';
import {
  addDaysToDateString,
  buildTimesForCount,
  getMealTimingLabel,
  getTodayDateString,
} from '@/utils/medicationUtils';

const DAILY_COUNT_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
] as const;

const DURATION_OPTIONS: { value: DurationType; label: string }[] = [
  { value: 'days', label: 'Gün sayısı' },
  { value: 'end_date', label: 'Bitiş tarihi' },
  { value: 'unlimited', label: 'Süresiz' },
];

export function AddMedicationScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [name, setName] = useState('');
  const [dailyCount, setDailyCount] = useState(1);
  const [times, setTimes] = useState<string[]>(buildTimesForCount(1));
  const [mealTiming, setMealTiming] = useState<MealTiming>('farketmez');
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [durationType, setDurationType] = useState<DurationType>('unlimited');
  const [durationDays, setDurationDays] = useState('7');
  const [endDate, setEndDate] = useState(addDaysToDateString(getTodayDateString(), 7));
  const [loading, setLoading] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const today = useMemo(() => getTodayDateString(), []);
  const minimumEndDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const handleDailyCountChange = (value: string) => {
    const count = Number(value);
    setDailyCount(count);
    setTimes((prev) => buildTimesForCount(count, prev));
  };

  const handleTimeChange = (index: number, value: string) => {
    setTimes((prev) => prev.map((time, i) => (i === index ? value : time)));
  };

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
      }
    } catch {
      Alert.alert('Hata', 'Mikrofona erişilemedi.');
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setRecording(null);
    setAiLoading(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        let mimeType = 'audio/mp4';
        if (uri.endsWith('.m4a')) mimeType = 'audio/m4a';
        else if (uri.endsWith('.wav')) mimeType = 'audio/wav';
        else if (uri.endsWith('.caf')) mimeType = 'audio/x-caf';

        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const transcribedText = await aiService.transcribeAudioRaw(base64, mimeType);

        if (transcribedText) {
          const parsedData = await aiService.parseTextToMedicationJSON(transcribedText);

          if (parsedData?.ilac) {
            setName(parsedData.ilac || '');
            if (parsedData.zamanlar?.length) {
              const count = Math.min(4, Math.max(1, parsedData.zamanlar.length));
              setDailyCount(count);
              setTimes(buildTimesForCount(count, parsedData.zamanlar));
            }
            Alert.alert('Ses Algılandı', `${parsedData.ilac} formu doldurdu.`);
          } else {
            setName(transcribedText.split(' ')[0] || '');
            Alert.alert('Söylenenler', transcribedText);
          }
        } else {
          Alert.alert('Anlaşılamadı', 'Sesi metne dökerken hata oluştu veya ses boş.');
        }
      }
    } catch {
      Alert.alert('Hata', 'Ses işlenirken bir sorun oluştu. İnternet bağlantınızı kontrol edin.');
    } finally {
      setAiLoading(false);
    }
  }

  const toggleRecording = async () => {
    if (recording) await stopRecording();
    else await startRecording();
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin Reddedildi', 'Kamera izni gerekiyor!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setAiLoading(true);
      try {
        const aiResponse = await aiService.extractMedicationInfoFromImage(
          result.assets[0].base64,
          result.assets[0].mimeType || 'image/jpeg'
        );

        if (aiResponse?.ilac) {
          setName(aiResponse.doz ? `${aiResponse.ilac} ${aiResponse.doz}` : aiResponse.ilac);
          Alert.alert('İlaç Bulundu', aiResponse.ilac);
        } else {
          Alert.alert('Analiz Başarısız', 'Kutudan ilaç adı çıkarılamadı.');
        }
      } catch {
        Alert.alert('Hata', 'Fotoğraf analiz edilemedi.');
      } finally {
        setAiLoading(false);
      }
    }
  };

  const onSave = async () => {
    const userId = session?.user.id;
    if (!userId) return;

    if (!name.trim()) {
      Alert.alert('Eksik bilgi', 'İlaç adını gir.');
      return;
    }

    if (times.length !== dailyCount) {
      Alert.alert('Eksik bilgi', 'Tüm saatleri seç.');
      return;
    }

    let parsedDurationDays: number | null = null;
    let parsedEndDate: string | null = null;

    if (durationType === 'days') {
      parsedDurationDays = Number(durationDays);
      if (!Number.isInteger(parsedDurationDays) || parsedDurationDays < 1 || parsedDurationDays > 365) {
        Alert.alert('Eksik bilgi', 'Gün sayısı 1 ile 365 arasında olmalı.');
        return;
      }
    }

    if (durationType === 'end_date') {
      if (!endDate || endDate < today) {
        Alert.alert('Eksik bilgi', 'Bitiş tarihi bugünden önce olamaz.');
        return;
      }
      parsedEndDate = endDate;
    }

    try {
      setLoading(true);
      await addMedication({
        user_id: userId,
        name: name.trim(),
        dose: '—',
        reminder_time: times[0],
        reminder_times: times,
        frequency: dailyCount === 1 ? 'gunluk' : `${dailyCount}_kez`,
        meal_timing: mealTiming,
        duration_type: durationType,
        duration_days: parsedDurationDays,
        end_date: parsedEndDate,
        start_date: today,
      });

      await ensureNotificationPermission();
      for (const time of times) {
        await scheduleDailyMedicationNotification(name.trim(), getMealTimingLabel(mealTiming), time);
      }

      Alert.alert('Başarılı', 'İlaç eklendi ve hatırlatma planlandı.');
      router.back();
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardScreen contentContainerStyle={styles.content}>
        <Text style={styles.title}>İlaç Ekle</Text>
        <Text style={styles.subtitle}>Manuel gir veya AI ile hızlıca doldur</Text>

        <View style={styles.aiBar}>
          <Text style={styles.aiText}>
            {recording
              ? 'Kayıt alınıyor... Durdurmak için mikrofona tekrar dokun.'
              : 'Sesle form doldur veya kutu fotoğrafı çek.'}
          </Text>

          {aiLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.aiActions}>
              <TouchableOpacity onPress={pickImage} style={styles.aiBtn}>
                <Text style={styles.aiBtnText}>📷</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleRecording}
                style={[styles.aiBtn, recording && styles.aiBtnRecording]}
              >
                <Text style={styles.aiBtnText}>🎤</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <AppInput
          label="İlaç adı"
          placeholder="ör. Parol 500mg"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.sectionLabel}>Günlük kaç kez?</Text>
        <SegmentedControl
          options={DAILY_COUNT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          value={String(dailyCount)}
          onChange={handleDailyCountChange}
        />

        <MealTimingField
          label="Ne zaman?"
          valueLabel={getMealTimingLabel(mealTiming)}
          onPress={() => setMealModalVisible(true)}
        />

        <Text style={styles.sectionLabel}>Saat(ler)</Text>
        <View style={styles.timesBox}>
          {times.map((time, index) => (
            <TimePickerField
              key={`${index}_${dailyCount}`}
              label={`${index + 1}. doz`}
              value={time}
              onChange={(value) => handleTimeChange(index, value)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Kullanım süresi</Text>
        <SegmentedControl
          options={DURATION_OPTIONS}
          value={durationType}
          onChange={setDurationType}
        />

        <View style={styles.durationBody}>
          {durationType === 'days' && (
            <AppInput
              label="Kaç gün kullanılacak?"
              placeholder="7"
              keyboardType="number-pad"
              value={durationDays}
              onChangeText={setDurationDays}
            />
          )}

          {durationType === 'end_date' && (
            <DatePickerField
              label="Bitiş tarihi"
              value={endDate}
              onChange={setEndDate}
              minimumDate={minimumEndDate}
            />
          )}

          {durationType === 'unlimited' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Bu ilaç süresiz olarak takip edilir. İstediğin zaman ilaç listesinden silebilirsin.
              </Text>
            </View>
          )}
        </View>

        <AppButton label="Kaydet" loading={loading} onPress={onSave} />
      </KeyboardScreen>

      <MealTimingModal
        value={mealTiming}
        onChange={setMealTiming}
        visible={mealModalVisible}
        onClose={() => setMealModalVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  aiBar: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  aiText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    marginRight: 8,
  },
  aiActions: {
    flexDirection: 'row',
    gap: 8,
  },
  aiBtn: {
    backgroundColor: Colors.surface,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtnRecording: {
    backgroundColor: Colors.danger,
  },
  aiBtnText: {
    fontSize: 20,
  },
  timesBox: {
    marginBottom: 8,
  },
  durationBody: {
    marginTop: 12,
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  infoText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },
});
