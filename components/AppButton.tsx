import { ActivityIndicator, Pressable, Text } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function AppButton({ label, onPress, loading = false, variant = 'primary' }: Props) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={{
        backgroundColor: isPrimary ? Colors.primary : '#e5e7eb',
        paddingVertical: 13,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: loading ? 0.7 : 1,
        marginTop: 4,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : Colors.text} />
      ) : (
        <Text style={{ color: isPrimary ? '#fff' : Colors.text, fontWeight: '700', fontSize: 15 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
