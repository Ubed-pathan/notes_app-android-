import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { Appbar, Chip, Text, useTheme } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import {
  Note,
  listNotes,
  startOfDay,
  toggleComplete,
  deleteNote,
  togglePin,
  setPrivate,
} from '../../src/storage/notes';
import { NoteCard } from '../../src/components/NoteCard';
import { DateViewMode, DateViewModeToggle } from '../../src/components/DateViewModeToggle';
import { Screen } from '../../src/components/Screen';
import { AppTopBar } from '../../src/components/AppTopBar';
import { useScreenBottomInset } from '../../src/hooks/useScreenBottomInset';
import { openDatePicker } from '../../src/utils/datePicker';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { scrollPaddingBottom } = useScreenBottomInset(16);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(startOfDay(Date.now()));
  const [dateViewMode, setDateViewMode] = useState<DateViewMode>('due');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [allPublicNotes, setAllPublicNotes] = useState<Note[]>([]);

  const load = useCallback(async () => {
    const all = await listNotes({ onlyPublic: true });
    setAllPublicNotes(all);
    if (selectedDay != null) {
      const dayNotes =
        dateViewMode === 'due'
          ? await listNotes({ onlyPublic: true, dueDate: selectedDay })
          : await listNotes({ onlyPublic: true, createdDate: selectedDay });
      setNotes(dayNotes);
    } else {
      setNotes([]);
    }
  }, [selectedDay, dateViewMode]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const markedDays = useMemo(() => {
    const set = new Set<number>();
    for (const n of allPublicNotes) {
      if (dateViewMode === 'due') {
        if (n.dueDate) set.add(startOfDay(n.dueDate));
      } else {
        set.add(startOfDay(n.createdAt));
      }
    }
    return set;
  }, [allPublicNotes, dateViewMode]);

  const prevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const nextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  const pickMonthYear = () => {
    const handled = openDatePicker({
      value: viewDate,
      onSelect: date => {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        setViewDate(d);
      },
    });
    if (!handled) setShowMonthPicker(true);
  };

  const onMonthPickerChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'ios') setShowMonthPicker(false);
    if (!date) return;
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setViewDate(d);
  };

  const selectDay = async (day: number) => {
    const ts = startOfDay(new Date(year, month, day).getTime());
    setSelectedDay(ts);
    await Haptics.selectionAsync();
  };

  const onToggleComplete = async (id: string) => {
    await toggleComplete(id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  const onDelete = async (id: string) => {
    await deleteNote(id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    load();
  };

  const onTogglePin = async (id: string) => {
    await togglePin(id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  const onTogglePrivate = async (id: string) => {
    const note = notes.find(n => n.id === id);
    await setPrivate(id, !note?.isPrivate);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStart = startOfDay(Date.now());

  return (
    <Screen style={{ backgroundColor: theme.colors.background }}>
      <AppTopBar
        title="Calendar"
        subtitle={dateViewMode === 'due' ? 'Tasks by due date' : 'Notes by created date'}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
      >
        <View style={{ paddingHorizontal: 12 }}>
          <DateViewModeToggle value={dateViewMode} onChange={setDateViewMode} />
        </View>

        <View
          style={{
            marginHorizontal: 12,
            marginBottom: 12,
            padding: 16,
            borderRadius: 20,
            backgroundColor: theme.colors.surface,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Appbar.Action icon="chevron-left" onPress={prevMonth} />
          <Pressable onPress={pickMonthYear} hitSlop={12} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700', textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </Text>
          </Pressable>
          <Appbar.Action icon="chevron-right" onPress={nextMonth} />
          </View>

          {Platform.OS === 'ios' && showMonthPicker ? (
            <DateTimePicker
              value={viewDate}
              mode="date"
              display="spinner"
              onChange={onMonthPickerChange}
            />
          ) : null}

          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {WEEKDAYS.map(w => (
              <View key={w} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="labelSmall" style={{ opacity: 0.5, fontWeight: '700' }}>{w}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((day, idx) => {
            if (day == null) return <View key={`e-${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
            const ts = startOfDay(new Date(year, month, day).getTime());
            const isSelected = selectedDay === ts;
            const isToday = ts === todayStart;
            const hasNotes = markedDays.has(ts);
            const dayDueNotes = allPublicNotes.filter(
              n => n.dueDate != null && startOfDay(n.dueDate) === ts
            );
            const allDone =
              dateViewMode === 'due' &&
              dayDueNotes.length > 0 &&
              dayDueNotes.every(n => n.completed);
            const dotColor =
              dateViewMode === 'created'
                ? theme.colors.tertiary
                : isSelected
                  ? theme.colors.primary
                  : allDone
                    ? '#4CAF50'
                    : theme.colors.primary;

            return (
              <Pressable
                key={day}
                onPress={() => selectDay(day)}
                style={{
                  width: '14.28%',
                  aspectRatio: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : isToday
                        ? theme.colors.primaryContainer
                        : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontWeight: isToday || isSelected ? '700' : '500',
                      fontSize: 15,
                      lineHeight: 20,
                      textAlign: 'center',
                      textAlignVertical: 'center',
                      includeFontPadding: false,
                      color: isSelected
                        ? theme.colors.onPrimary
                        : isToday
                          ? theme.colors.primary
                          : theme.colors.onSurface,
                    }}
                  >
                    {day}
                  </Text>
                </View>
                {hasNotes ? (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 5,
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: dotColor,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text variant="titleSmall" style={{ fontWeight: '700', flex: 1, paddingRight: 8 }}>
              {selectedDay
                ? new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a day'}
            </Text>
            {selectedDay === todayStart ? (
              <Chip
                compact
                icon="star"
                style={{ alignSelf: 'center' }}
                textStyle={{ lineHeight: 20, includeFontPadding: false, marginVertical: 0 }}
              >
                Today
              </Chip>
            ) : null}
          </View>

          {notes.length > 0 ? (
            notes.map(item => (
              <NoteCard
                key={item.id}
                note={item}
                onDelete={() => onDelete(item.id)}
                onTogglePin={() => onTogglePin(item.id)}
                onTogglePrivate={() => onTogglePrivate(item.id)}
                onToggleComplete={() => onToggleComplete(item.id)}
                onPress={() => router.push({ pathname: '/note', params: { id: item.id } })}
              />
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📅</Text>
              <Text variant="bodyMedium" style={{ opacity: 0.6, textAlign: 'center' }}>
                {dateViewMode === 'due'
                  ? 'No tasks due on this day'
                  : 'No notes created on this day'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
