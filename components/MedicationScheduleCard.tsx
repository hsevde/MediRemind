import { useRouter } from 'expo-router';

import { Pressable, StyleSheet, Text, View } from 'react-native';



import { Medication } from '@/types/models';

import {

  getDurationLabel,

  getFrequencyLabel,

  getMealTimingLabel,

  getReminderTimes,

  isMedicationActiveOnDate,

  getTodayDateString,

} from '@/utils/medicationUtils';



type Props = {

  medication: Medication;

};



export function MedicationScheduleCard({ medication }: Props) {

  const router = useRouter();

  const times = getReminderTimes(medication);

  const isActive = isMedicationActiveOnDate(medication, getTodayDateString());



  const handlePress = () => {

    router.push({

      pathname: '/edit-medication',

      params: {

        id: medication.id,

        name: medication.name,

        dose: medication.dose,

        reminder_time: medication.reminder_time,

        reminder_times: times.join(','),

        frequency: medication.frequency ?? 'gunluk',

      },

    });

  };



  return (

    <Pressable onPress={handlePress} style={styles.card}>

      <View style={styles.header}>

        <Text style={styles.name}>{medication.name}</Text>

        <View style={[styles.badge, !isActive && styles.badgeInactive]}>

          <Text style={[styles.badgeText, !isActive && styles.badgeTextInactive]}>

            {isActive ? 'Aktif' : 'Süresi doldu'}

          </Text>

        </View>

      </View>

      <Text style={styles.meta}>{getMealTimingLabel(medication.meal_timing)}</Text>

      <Text style={styles.frequency}>{getFrequencyLabel(medication)}</Text>

      <Text style={styles.duration}>{getDurationLabel(medication)}</Text>

      <View style={styles.timesRow}>

        {times.map((time) => (

          <View key={time} style={styles.timeChip}>

            <Text style={styles.timeText}>{time}</Text>

          </View>

        ))}

      </View>

    </Pressable>

  );

}



const styles = StyleSheet.create({

  card: {

    backgroundColor: '#fff',

    borderRadius: 14,

    padding: 16,

    borderWidth: 1,

    borderColor: '#e5e7eb',

    gap: 6,

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

  },

  name: {

    fontSize: 17,

    fontWeight: '700',

    color: '#111827',

    flex: 1,

  },

  badge: {

    backgroundColor: '#ede9fe',

    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: 20,

  },

  badgeInactive: {

    backgroundColor: '#f3f4f6',

  },

  badgeText: {

    color: '#5C4ECC',

    fontSize: 12,

    fontWeight: '700',

  },

  badgeTextInactive: {

    color: '#6b7280',

  },

  meta: {

    fontSize: 14,

    color: '#4b5563',

  },

  frequency: {

    fontSize: 14,

    fontWeight: '600',

    color: '#5C4ECC',

    marginTop: 2,

  },

  duration: {

    fontSize: 13,

    color: '#6b7280',

  },

  timesRow: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 8,

    marginTop: 6,

  },

  timeChip: {

    backgroundColor: '#f3f4f6',

    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: 8,

  },

  timeText: {

    fontSize: 14,

    fontWeight: '600',

    color: '#374151',

  },

});


