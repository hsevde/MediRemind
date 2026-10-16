import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Bildirim izni gerekli.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  if (!Device.isDevice) {
    throw new Error('Bildirim testi için fiziksel cihaz gereklidir.');
  }
}

export async function scheduleDailyMedicationNotification(
  medicationName: string,
  dose: string,
  reminderTime: string
) {
  const [hourText, minuteText] = reminderTime.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('Saat formatı HH:mm olmalı.');
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'İlaç Hatırlatma ⏰',
      body: `${medicationName} (${dose}) alma zamanı.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'medication-reminders',
    },
  });
}
