import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/context/ThemeContext';

/** Fills the system status-bar region with chrome (distinct from app headers). */
export function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  if (insets.top <= 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.fill,
        {
          height: insets.top,
          backgroundColor: colors.chrome,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
});
