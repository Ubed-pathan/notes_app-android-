export type AlarmToneId = 'custom';

export type AlarmTone = {
  id: AlarmToneId;
  label: string;
  description: string;
};

export const DEFAULT_ALARM_TONE_ID: AlarmToneId = 'custom';

export function getAlarmTone(_id?: AlarmToneId): AlarmTone {
  return {
    id: 'custom',
    label: 'My tone',
    description: 'Your chosen alarm audio file',
  };
}

export function getReminderChannelId(): string {
  return 'alkitab-my-tone-v3';
}
