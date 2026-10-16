import { View, StyleSheet, ViewStyle } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

type Props = {
  progress: number;
  style?: ViewStyle;
};

export function ProgressBar({ progress, style }: Props) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View style={[styles.track, style]}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
});
