import { Text, TextInput, TextInputProps, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

type Props = TextInputProps & {
  label: string;
};

export function AppInput({ label, ...props }: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 14, marginBottom: 6, fontWeight: '600', color: Colors.text }}>
        {label}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: Radius.md,
          paddingHorizontal: 12,
          paddingVertical: 11,
          fontSize: 15,
          backgroundColor: Colors.surface,
          color: Colors.text,
        }}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
    </View>
  );
}
