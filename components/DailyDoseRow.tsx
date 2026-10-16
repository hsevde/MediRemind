import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TodayDose } from '@/types/models';

type Props = {
  dose: TodayDose;
  onToggle: (taken: boolean) => void;
};

export function DailyDoseRow({ dose, onToggle }: Props) {
  return (
    <Pressable
      onPress={() => onToggle(!dose.taken)}
      style={[styles.row, dose.taken && styles.rowTaken]}
    >
      <View style={[styles.checkbox, dose.taken && styles.checkboxFilled]}>
        {dose.taken && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, dose.taken && styles.nameTaken]}>{dose.medicationName}</Text>
        <Text style={styles.meta}>
          {dose.dose} · {dose.reminderTime}
        </Text>
      </View>
      <Text style={[styles.status, dose.taken ? styles.statusTaken : styles.statusPending]}>
        {dose.taken ? 'Alındı' : 'Bekliyor'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  rowTaken: {
    backgroundColor: '#f5f3ff',
    borderColor: '#c4b5fd',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#5C4ECC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxFilled: {
    backgroundColor: '#5C4ECC',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  nameTaken: {
    color: '#5C4ECC',
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b7280',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTaken: {
    color: '#5C4ECC',
  },
  statusPending: {
    color: '#9ca3af',
  },
});
