export type AlarmToneId =
  | 'default'
  | 'classic_alarm'
  | 'soft_chime'
  | 'digital_beep'
  | 'gentle_bell'
  | 'custom';

export type AlarmTone = {
  id: AlarmToneId;
  label: string;
  description: string;
  /** Bundled sound file for notifications, or null for system default / custom */
  file: string | null;
  /** Asset module for in-app full playback */
  preview?: number;
};

export const ALARM_TONES: AlarmTone[] = [
  {
    id: 'default',
    label: 'System default',
    description: 'Device default alarm sound',
    file: null,
  },
  {
    id: 'classic_alarm',
    label: 'Classic alarm',
    description: 'Full urgent alternating beeps (~6s)',
    file: 'classic_alarm.wav',
    preview: require('../../assets/sounds/classic_alarm.wav'),
  },
  {
    id: 'soft_chime',
    label: 'Soft chime',
    description: 'Full gentle chime melody (~6s)',
    file: 'soft_chime.wav',
    preview: require('../../assets/sounds/soft_chime.wav'),
  },
  {
    id: 'digital_beep',
    label: 'Digital beep',
    description: 'Full repeating digital tone (~6s)',
    file: 'digital_beep.wav',
    preview: require('../../assets/sounds/digital_beep.wav'),
  },
  {
    id: 'gentle_bell',
    label: 'Gentle bell',
    description: 'Full warm bell rings (~6s)',
    file: 'gentle_bell.wav',
    preview: require('../../assets/sounds/gentle_bell.wav'),
  },
  {
    id: 'custom',
    label: 'My tone',
    description: 'Pick any audio file from your phone',
    file: null,
  },
];

export const DEFAULT_ALARM_TONE_ID: AlarmToneId = 'classic_alarm';

export function getAlarmTone(id: AlarmToneId): AlarmTone {
  return ALARM_TONES.find(t => t.id === id) ?? ALARM_TONES[0];
}

export function getReminderChannelId(toneId: AlarmToneId): string {
  return `reminders-v2-${toneId}`;
}

/** Sound key passed to expo-notifications content + Android channel */
export function getNotificationSound(tone: AlarmTone): string | true {
  if (tone.id === 'custom' || !tone.file) return 'default';
  return tone.file;
}

export function shouldPlayFullAlarmInApp(toneId: AlarmToneId): boolean {
  return toneId !== 'default';
}
