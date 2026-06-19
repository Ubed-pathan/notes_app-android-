import { useRouter, useFocusEffect } from 'expo-router';
import { View, NativeSyntheticEvent, NativeScrollEvent, Pressable, ScrollView, Platform } from 'react-native';
import { FAB, Searchbar, Text, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useRef, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Note, listNotes, deleteNote, togglePin, setPrivate, toggleComplete, startOfDay as dayStart } from '../../src/storage/notes';
import { NoteCard } from '../../src/components/NoteCard';
import { DateViewMode, DateViewModeToggle } from '../../src/components/DateViewModeToggle';
import { Screen } from '../../src/components/Screen';
import { AppTopBar } from '../../src/components/AppTopBar';
import { openDatePicker } from '../../src/utils/datePicker';
import { useScreenBottomInset } from '../../src/hooks/useScreenBottomInset';

type FilterMode = 'all' | 'pending' | 'completed' | 'byDate' | 'overdue';

const FILTER_BOX_W = 76;
const FILTER_BOX_H = 68;
const DATE_BOX_W = 88;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function NotesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { fabBottom, listPaddingBottom } = useScreenBottomInset(12);
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedDueDate, setSelectedDueDate] = useState(() => startOfDay(new Date()));
  const [byDateMode, setByDateMode] = useState<DateViewMode>('due');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [triggeredPrivate, setTriggeredPrivate] = useState(false);
  const hasScrolledRef = useRef(false);

  const load = useCallback(async () => {
    const opts: Parameters<typeof listNotes>[0] = { query: q, onlyPublic: true };
    if (filter === 'completed') opts.completed = true;
    if (filter === 'pending') opts.completed = false;
    if (filter === 'byDate') {
      if (byDateMode === 'due') opts.dueDate = selectedDueDate.getTime();
      else opts.createdDate = selectedDueDate.getTime();
    }
    if (filter === 'overdue') opts.completed = false;
    let data = await listNotes(opts);
    if (filter === 'overdue') {
      const today = startOfDay(new Date()).getTime();
      data = data.filter(n => !n.completed && n.dueDate != null && dayStart(n.dueDate) < today);
    }
    setNotes(data);
  }, [q, filter, selectedDueDate, byDateMode]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    const n = notes.find(n => n.id === id);
    await setPrivate(id, !n?.isPrivate);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  const onToggleComplete = async (id: string) => {
    await toggleComplete(id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  const renderItem = useCallback(({ item }: { item: Note }) => (
    <NoteCard
      note={item}
      onDelete={() => onDelete(item.id)}
      onTogglePin={() => onTogglePin(item.id)}
      onTogglePrivate={() => onTogglePrivate(item.id)}
      onToggleComplete={() => onToggleComplete(item.id)}
      onPress={() => router.push({ pathname: '/note', params: { id: item.id } })}
    />
  ), [router, notes]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 50) hasScrolledRef.current = true;
    if (!triggeredPrivate && y > 300) {
      setTriggeredPrivate(true);
      router.push('/private/notes');
    }
  };

  const onEndReached = () => {
    if (triggeredPrivate || !hasScrolledRef.current) return;
    setTriggeredPrivate(true);
    router.push('/private/notes');
  };

  const filters: { key: FilterMode; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; wide?: boolean }[] = [
    { key: 'all', label: 'All', icon: 'format-list-bulleted' },
    { key: 'pending', label: 'Pending', icon: 'clock-outline' },
    { key: 'completed', label: 'Done', icon: 'check-circle' },
    { key: 'byDate', label: 'By Date', icon: 'calendar-month', wide: true },
    { key: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
  ];

  const onFilterChange = (key: Exclude<FilterMode, 'byDate'>) => {
    setFilter(key);
    Haptics.selectionAsync();
  };

  const openByDatePicker = () => {
    const handled = openDatePicker({
      value: selectedDueDate,
      onSelect: date => {
        setSelectedDueDate(startOfDay(date));
        setFilter('byDate');
      },
    });
    if (!handled) setShowDatePicker(true);
  };

  const onPickerChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'ios') setShowDatePicker(false);
    if (date) {
      setSelectedDueDate(startOfDay(date));
      setFilter('byDate');
    }
  };

  const dateFilterLabel =
    filter === 'byDate'
      ? selectedDueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : 'By Date';

  return (
    <Screen style={{ backgroundColor: theme.colors.background }}>
      <AppTopBar
        title={
          <Pressable onLongPress={() => router.push('/private/notes')}>
            <Text variant="titleLarge" style={{ fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
              AL-KITAB
            </Text>
          </Pressable>
        }
        right={<IconButton icon="cog" onPress={() => router.push('/settings')} />}
      />

      <Searchbar
        placeholder="Search notes & tasks..."
        value={q}
        onChangeText={setQ}
        style={{ margin: 12, marginBottom: 8, borderRadius: 12 }}
        elevation={1}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 10 }}
        style={{ maxHeight: FILTER_BOX_H + 16, marginBottom: 4 }}
        decelerationRate="fast"
      >
        {filters.map(f => {
          const selected = filter === f.key;
          const label = f.key === 'byDate' ? dateFilterLabel : f.label;
          const boxW = f.wide ? DATE_BOX_W : FILTER_BOX_W;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                if (f.key === 'byDate') {
                  setFilter('byDate');
                  Haptics.selectionAsync();
                  openByDatePicker();
                } else {
                  onFilterChange(f.key);
                }
              }}
              style={({ pressed }) => ({
                width: boxW,
                height: FILTER_BOX_H,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
                backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                borderWidth: selected ? 0 : 1,
                borderColor: theme.colors.outlineVariant,
                elevation: selected ? 3 : 0,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <MaterialCommunityIcons
                name={f.icon}
                size={22}
                color={selected ? theme.colors.onPrimary : theme.colors.primary}
              />
              <Text
                variant="labelSmall"
                numberOfLines={1}
                style={{
                  marginTop: 6,
                  fontWeight: selected ? '700' : '500',
                  color: selected ? theme.colors.onPrimary : theme.colors.onSurface,
                  fontSize: 11,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {Platform.OS === 'ios' && showDatePicker ? (
        <DateTimePicker
          value={selectedDueDate}
          mode="date"
          display="default"
          onChange={onPickerChange}
        />
      ) : null}

      {filter === 'byDate' ? (
        <View style={{ paddingHorizontal: 12, marginBottom: 4 }}>
          <DateViewModeToggle value={byDateMode} onChange={setByDateMode} />
        </View>
      ) : null}

      <View style={{ flex: 1, paddingHorizontal: 12, minHeight: 0 }}>
        {notes.length > 0 ? (
          <FlashList
            data={notes}
            renderItem={renderItem}
            keyExtractor={i => i.id}
            onScroll={onScroll}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.2}
            contentContainerStyle={{ paddingBottom: listPaddingBottom, paddingTop: 4 }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: listPaddingBottom }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📝</Text>
            <Text variant="titleMedium" style={{ opacity: 0.7, textAlign: 'center' }}>
              {filter === 'all'
                ? 'No notes yet'
                : filter === 'byDate'
                  ? byDateMode === 'due'
                    ? `No tasks due ${selectedDueDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
                    : `No notes created ${selectedDueDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
                  : filter === 'overdue'
                    ? 'No overdue tasks'
                    : `No ${filter} tasks`}
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.5, marginTop: 4, textAlign: 'center' }}>
              Tap + to create your first note
            </Text>
          </View>
        )}
      </View>

      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 20, bottom: fabBottom, borderRadius: 16 }}
        onPress={() => router.push('/note')}
        label="New"
      />
    </Screen>
  );
}
