import { Platform } from 'react-native';
import { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';

export function openDatePicker(options: {
  value: Date;
  minimumDate?: Date;
  onSelect: (date: Date) => void;
}): boolean {
  if (Platform.OS !== 'android') return false;

  DateTimePickerAndroid.open({
    value: options.value,
    mode: 'date',
    minimumDate: options.minimumDate,
    onChange: (event: DateTimePickerEvent, date?: Date) => {
      if (event.type === 'set' && date) options.onSelect(date);
    },
  });
  return true;
}

export function openDateTimePicker(options: {
  value: Date;
  minimumDate?: Date;
  onSelect: (date: Date) => void;
}): boolean {
  if (Platform.OS !== 'android') return false;

  DateTimePickerAndroid.open({
    value: options.value,
    mode: 'date',
    minimumDate: options.minimumDate,
    onChange: (event: DateTimePickerEvent, date?: Date) => {
      if (event.type !== 'set' || !date) return;
      DateTimePickerAndroid.open({
        value: date,
        mode: 'time',
        is24Hour: false,
        onChange: (timeEvent: DateTimePickerEvent, time?: Date) => {
          if (timeEvent.type === 'set' && time) {
            const combined = new Date(date);
            combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
            options.onSelect(combined);
          }
        },
      });
    },
  });
  return true;
}
