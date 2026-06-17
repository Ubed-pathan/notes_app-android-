import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
};

export function ProgressRing({ progress, size = 120, strokeWidth = 10, label, sublabel, color }: Props) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clamped / 100) * circumference;
  const ringColor = color ?? theme.colors.primary;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceVariant}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {label ? (
          <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
            {label}
          </Text>
        ) : null}
        {sublabel ? (
          <Text variant="labelSmall" style={{ opacity: 0.6 }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
