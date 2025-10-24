import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Appbar, Button, TextInput } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { deleteNote, getNote, upsertNote } from '../src/storage/notes';

export default function NoteScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loadedId, setLoadedId] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const n = await getNote(id);
      if (n) {
        setTitle(n.title);
        setContent(n.content);
        setLoadedId(n.id);
      }
    })();
  }, [id]);

  const save = useCallback(async (nextTitle: string, nextContent: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const note = await upsertNote({ id: loadedId, title: nextTitle, content: nextContent });
      setLoadedId(note.id);
    }, 300);
  }, [loadedId]);

  const onChangeTitle = (t: string) => { setTitle(t); save(t, content); };
  const onChangeContent = (t: string) => { setContent(t); save(title, t); };

  const canDelete = useMemo(() => !!loadedId, [loadedId]);

  const onDelete = async () => {
    if (loadedId) {
      await deleteNote(loadedId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={loadedId ? 'Edit Note' : 'New Note'} />
        {canDelete ? <Appbar.Action icon="delete" onPress={onDelete} /> : null}
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <TextInput
          mode="flat"
          placeholder="Title"
          value={title}
          onChangeText={onChangeTitle}
          style={{ marginBottom: 12 }}
        />
        <TextInput
          mode="flat"
          placeholder="Write your note..."
          value={content}
          onChangeText={onChangeContent}
          multiline
          numberOfLines={12}
          style={{ minHeight: 240 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
