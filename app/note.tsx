import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {
  Appbar,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { nanoid } from 'nanoid/non-secure';
import { ChecklistItem, deleteNote, getNote, upsertNote } from '../src/storage/notes';
import { cancelNoteReminder, scheduleNoteReminder, reminderEnvironmentHint } from '../src/services/notifications';
import { markerToFlag } from '../src/utils/richText';
import { FormattedNoteInput, FormattedNoteInputHandle } from '../src/components/FormattedNoteInput';
import { ImageLightbox } from '../src/components/ImageLightbox';
import { openDatePicker, openDateTimePicker } from '../src/utils/datePicker';

function DismissibleChip({
  icon,
  label,
  onPress,
  onDismiss,
  dismissible,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  onDismiss: () => void;
  dismissible: boolean;
}) {
  return (
    <Chip
      icon={icon}
      onPress={onPress}
      onClose={dismissible ? onDismiss : undefined}
      selected={dismissible}
      showSelectedCheck={false}
      style={{ borderRadius: 20 }}
    >
      {label}
    </Chip>
  );
}

export default function NoteScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const contentRef = useRef('');
  const contentInputRef = useRef<FormattedNoteInputHandle>(null);
  const [loadedId, setLoadedId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [completed, setCompleted] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checklistDone = checklist.filter(c => c.checked).length;
  const checklistTotal = checklist.length;
  const checklistPct = checklistTotal ? (checklistDone / checklistTotal) * 100 : 0;

  useEffect(() => {
    (async () => {
      if (!id) return;
      const n = await getNote(id);
      if (n) {
        setTitle(n.title);
        setInitialContent(n.content);
        contentRef.current = n.content;
        setLoadedId(n.id);
        setDueDate(n.dueDate ? new Date(n.dueDate) : null);
        setReminderAt(n.reminderAt ? new Date(n.reminderAt) : null);
        setCompleted(!!n.completed);
        setImages(n.images ?? []);
        setChecklist(n.checklist ?? []);
        // Ensure OS alarm exists for saved future reminders
        if (n.reminderAt && n.reminderAt > Date.now() && !n.completed) {
          await scheduleNoteReminder(n.id, n.title, n.reminderAt);
        }
      }
    })();
  }, [id]);

  const syncReminder = useCallback(async (noteId: string, noteTitle: string, at: Date | null) => {
    if (at === null) {
      await cancelNoteReminder(noteId);
      return;
    }
    if (at.getTime() <= Date.now()) {
      Alert.alert('Invalid time', 'Please pick a future date and time.');
      return;
    }
    const result = await scheduleNoteReminder(noteId, noteTitle, at.getTime());
    if (!result.ok) {
      Alert.alert('Reminder not set', result.message);
      return;
    }
    const hint = reminderEnvironmentHint();
    if (hint) {
      Alert.alert(
        'Alarm scheduled',
        `Alarm set for ${at.toLocaleString()}.\n\n${hint}`
      );
    }
  }, []);

  const persist = useCallback(
    async (patch: {
      title?: string;
      content?: string;
      dueDate?: Date | null;
      reminderAt?: Date | null;
      completed?: boolean;
      images?: string[];
      checklist?: ChecklistItem[];
    }) => {
      const note = await upsertNote({
        id: loadedId,
        title: patch.title ?? title,
        content: patch.content ?? contentRef.current,
        dueDate: patch.dueDate !== undefined ? (patch.dueDate?.getTime() ?? null) : (dueDate?.getTime() ?? null),
        reminderAt: patch.reminderAt !== undefined ? (patch.reminderAt?.getTime() ?? null) : (reminderAt?.getTime() ?? null),
        completed: patch.completed ?? completed,
        images: patch.images ?? images,
        checklist: patch.checklist ?? checklist,
      });
      setLoadedId(note.id);

      const isCompleted = patch.completed ?? completed;
      if (isCompleted && note.reminderAt) {
        await cancelNoteReminder(note.id);
        return note;
      }

      if (patch.reminderAt !== undefined) {
        setReminderAt(patch.reminderAt);
        await syncReminder(note.id, note.title, patch.reminderAt);
      }
      return note;
    },
    [loadedId, title, dueDate, reminderAt, completed, images, checklist, syncReminder]
  );

  const debouncedSave = useCallback(
    (patch: Parameters<typeof persist>[0]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => persist(patch), 300);
    },
    [persist]
  );

  const onChangeTitle = (t: string) => {
    setTitle(t);
    debouncedSave({ title: t });
  };

  const onMarkdownChange = useCallback(
    (md: string) => {
      contentRef.current = md;
      debouncedSave({ content: md });
    },
    [debouncedSave]
  );

  const applyFormat = (marker: string) => {
    contentInputRef.current?.applyFormat(markerToFlag(marker));
    Haptics.selectionAsync();
  };

  const insertBulletList = () => {
    contentInputRef.current?.insertList('bullet');
    Haptics.selectionAsync();
  };

  const insertNumberList = () => {
    contentInputRef.current?.insertList('number');
    Haptics.selectionAsync();
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const dir = `${FileSystem.documentDirectory}note-images/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = `${dir}${nanoid(10)}.jpg`;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });

    const next = [...images, dest];
    setImages(next);
    await persist({ images: next });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeImage = async (uri: string) => {
    const next = images.filter(i => i !== uri);
    setImages(next);
    await persist({ images: next });
  };

  const addCheckItem = async () => {
    const text = newCheckItem.trim();
    if (!text) return;
    const item: ChecklistItem = { id: nanoid(8), text, checked: false };
    const next = [...checklist, item];
    setChecklist(next);
    setNewCheckItem('');
    await persist({ checklist: next });
  };

  const toggleCheckItem = async (itemId: string) => {
    const next = checklist.map(c => (c.id === itemId ? { ...c, checked: !c.checked } : c));
    setChecklist(next);
    await persist({ checklist: next });
    await Haptics.selectionAsync();
  };

  const removeCheckItem = async (itemId: string) => {
    const next = checklist.filter(c => c.id !== itemId);
    setChecklist(next);
    await persist({ checklist: next });
  };

  const onDueChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setDueDate(date);
      debouncedSave({ dueDate: date });
    }
    if (Platform.OS === 'ios') setShowDuePicker(false);
  };

  const onReminderChange = async (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'ios') setShowReminderPicker(false);
    if (!date) return;
    await persist({ reminderAt: date });
  };

  const pickDueDate = () => {
    const handled = openDatePicker({
      value: dueDate ?? new Date(),
      onSelect: date => {
        setDueDate(date);
        debouncedSave({ dueDate: date });
      },
    });
    if (!handled) setShowDuePicker(true);
  };

  const pickReminder = () => {
    const handled = openDateTimePicker({
      value: reminderAt ?? new Date(Date.now() + 3600000),
      minimumDate: new Date(),
      onSelect: async date => {
        await persist({ reminderAt: date });
      },
    });
    if (!handled) setShowReminderPicker(true);
  };

  const clearDueDate = async () => {
    setDueDate(null);
    await persist({ dueDate: null });
  };

  const clearReminder = async () => {
    setReminderAt(null);
    await persist({ reminderAt: null });
    if (loadedId) await cancelNoteReminder(loadedId);
  };

  const toggleCompleted = async () => {
    const next = !completed;
    setCompleted(next);
    await persist({ completed: next });
    await Haptics.notificationAsync(
      next ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
  };

  const onDelete = async () => {
    if (loadedId) {
      await cancelNoteReminder(loadedId);
      await deleteNote(loadedId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const canDelete = useMemo(() => !!loadedId, [loadedId]);

  const formatTools = [
    { icon: 'format-bold', action: () => applyFormat('**'), list: false },
    { icon: 'format-italic', action: () => applyFormat('*'), list: false },
    { icon: 'format-underline', action: () => applyFormat('__'), list: false },
    { icon: 'format-strikethrough', action: () => applyFormat('~~'), list: false },
    { icon: 'format-list-bulleted', action: insertBulletList, list: true },
    { icon: 'format-list-numbered', action: insertNumberList, list: true },
    { icon: 'image', action: pickImage, list: false },
  ] as const;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={loadedId ? 'Edit Note' : 'New Note'} />
        <Appbar.Action icon={completed ? 'check-circle' : 'check-circle-outline'} onPress={toggleCompleted} />
        {canDelete ? <Appbar.Action icon="delete" onPress={onDelete} /> : null}
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TextInput
          mode="outlined"
          placeholder="Title"
          value={title}
          onChangeText={onChangeTitle}
          style={{ marginBottom: 12, fontSize: 20, fontWeight: '700' }}
          outlineStyle={{ borderRadius: 12 }}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <DismissibleChip
            icon="calendar"
            label={dueDate ? dueDate.toLocaleDateString() : 'Set due date'}
            onPress={pickDueDate}
            onDismiss={clearDueDate}
            dismissible={!!dueDate}
          />
          <DismissibleChip
            icon="bell"
            label={
              reminderAt
                ? reminderAt.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Set reminder'
            }
            onPress={pickReminder}
            onDismiss={clearReminder}
            dismissible={!!reminderAt}
          />
          {completed ? (
            <Chip icon="check" style={{ borderRadius: 20, backgroundColor: '#E8F5E9' }} textStyle={{ color: '#2E7D32' }}>
              Completed
            </Chip>
          ) : null}
        </View>

        {Platform.OS === 'ios' && showDuePicker ? (
          <DateTimePicker value={dueDate ?? new Date()} mode="date" display="spinner" onChange={onDueChange} />
        ) : null}
        {Platform.OS === 'ios' && showReminderPicker ? (
          <DateTimePicker
            value={reminderAt ?? new Date(Date.now() + 3600000)}
            mode="datetime"
            display="spinner"
            minimumDate={new Date()}
            onChange={onReminderChange}
          />
        ) : null}

        <Surface style={{ borderRadius: 16, marginBottom: 12, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 4, backgroundColor: theme.colors.surfaceVariant }}
            onStartShouldSetResponder={() => true}
          >
            {formatTools.map(t => (
              <IconButton
                key={t.icon}
                icon={t.icon}
                size={20}
                onPressIn={t.icon === 'image' ? undefined : () => t.action()}
                onPress={t.icon === 'image' ? t.action : undefined}
              />
            ))}
          </View>
          <FormattedNoteInput
            ref={contentInputRef}
            key={loadedId ?? 'new-note'}
            initialContent={initialContent}
            onMarkdownChange={onMarkdownChange}
            placeholder="Write your note..."
          />
        </Surface>

        {images.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <Text variant="labelLarge" style={{ marginBottom: 8, fontWeight: '700' }}>Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {images.map(uri => (
                <View key={uri} style={{ position: 'relative' }}>
                  <Pressable onPress={() => setPreviewImage(uri)}>
                    <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: 12 }} />
                  </Pressable>
                  <Pressable
                    onPress={() => removeImage(uri)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: 12,
                      padding: 2,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, paddingHorizontal: 4 }}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Divider style={{ marginVertical: 8 }} />

        <Text variant="labelLarge" style={{ marginBottom: 8, fontWeight: '700' }}>Checklist</Text>
        {checklistTotal > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text variant="labelSmall" style={{ fontWeight: '600', opacity: 0.7 }}>
                Progress
              </Text>
              <Text variant="labelSmall" style={{ fontWeight: '700', opacity: 0.7 }}>
                {checklistDone}/{checklistTotal}
              </Text>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${checklistPct}%`,
                  height: '100%',
                  backgroundColor: checklistPct === 100 ? theme.colors.tertiary : theme.colors.outlineVariant,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        ) : null}
        {checklist.map(item => (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Checkbox
              status={item.checked ? 'checked' : 'unchecked'}
              onPress={() => toggleCheckItem(item.id)}
              color={theme.colors.tertiary}
              uncheckedColor={theme.colors.outline}
            />
            <Text
              style={{
                flex: 1,
                textDecorationLine: item.checked ? 'line-through' : 'none',
                opacity: item.checked ? 0.5 : 1,
              }}
            >
              {item.text}
            </Text>
            <IconButton icon="close" size={18} onPress={() => removeCheckItem(item.id)} />
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <TextInput
            mode="outlined"
            placeholder="Add checklist item..."
            value={newCheckItem}
            onChangeText={setNewCheckItem}
            style={{ flex: 1 }}
            dense
            outlineStyle={{ borderRadius: 12 }}
            onSubmitEditing={addCheckItem}
          />
          <Button mode="contained-tonal" onPress={addCheckItem} compact>
            Add
          </Button>
        </View>
      </ScrollView>
      <ImageLightbox uri={previewImage} onClose={() => setPreviewImage(null)} />
    </KeyboardAvoidingView>
  );
}
