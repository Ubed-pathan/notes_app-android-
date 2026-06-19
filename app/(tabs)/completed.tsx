import { useRouter, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { Searchbar, Text, useTheme } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Note, listNotes, deleteNote, togglePin, setPrivate, toggleComplete } from '../../src/storage/notes';
import { NoteCard } from '../../src/components/NoteCard';
import { Screen } from '../../src/components/Screen';
import { AppTopBar } from '../../src/components/AppTopBar';
import { useScreenBottomInset } from '../../src/hooks/useScreenBottomInset';

export default function CompletedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { listPaddingBottom } = useScreenBottomInset(12);
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);

  const load = useCallback(async () => {
    const data = await listNotes({ query: q, onlyPublic: true, completed: true });
    setNotes(data);
  }, [q]);

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
    const note = notes.find(n => n.id === id);
    await setPrivate(id, !note?.isPrivate);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  const onToggleComplete = async (id: string) => {
    await toggleComplete(id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        note={item}
        onDelete={() => onDelete(item.id)}
        onTogglePin={() => onTogglePin(item.id)}
        onTogglePrivate={() => onTogglePrivate(item.id)}
        onToggleComplete={() => onToggleComplete(item.id)}
        onPress={() => router.push({ pathname: '/note', params: { id: item.id } })}
      />
    ),
    [router, notes]
  );

  return (
    <Screen style={{ backgroundColor: theme.colors.background }}>
      <AppTopBar title="Completed" subtitle="Finished notes & tasks" />

      <Searchbar
        placeholder="Search completed notes..."
        value={q}
        onChangeText={setQ}
        style={{ margin: 12, marginBottom: 8, borderRadius: 12 }}
        elevation={1}
      />

      <View style={{ flex: 1, paddingHorizontal: 12, minHeight: 0 }}>
        {notes.length > 0 ? (
          <FlashList
            data={notes}
            renderItem={renderItem}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingBottom: listPaddingBottom, paddingTop: 4 }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: listPaddingBottom }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
            <Text variant="titleMedium" style={{ opacity: 0.7, textAlign: 'center' }}>
              {q.trim() ? 'No matching completed notes' : 'No completed notes yet'}
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.5, marginTop: 4, textAlign: 'center' }}>
              Mark notes done from the Notes tab
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
