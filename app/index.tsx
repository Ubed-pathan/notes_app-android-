import { Link, useRouter, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { Appbar, FAB, Searchbar, Text, useTheme } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Note, listNotes, deleteNote, togglePin } from '../src/storage/notes';
import { NoteCard } from '../src/components/NoteCard';

export default function NotesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);

  const load = useCallback(async () => {
    const data = await listNotes({ query: q });
    setNotes(data);
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // listNotes already returns pinned first and then by updatedAt desc
  const sorted = notes; // keep name for clarity

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

  const renderItem = useCallback(({ item }: { item: Note }) => (
    <NoteCard
      note={item}
      onDelete={() => onDelete(item.id)}
      onTogglePin={() => onTogglePin(item.id)}
      onPress={() => router.push({ pathname: '/note', params: { id: item.id } })}
    />
  ), [router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.Content title={'Al Kitab'} />
        <Appbar.Action icon="cog" onPress={() => router.push('/settings')} />
      </Appbar.Header>
      <Searchbar
        placeholder="Search notes"
        value={q}
        onChangeText={setQ}
        style={{ margin: 12, marginBottom: 0 }}
        inputStyle={{}}
      />

      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }}>
  {/* Single vertical list: pinned notes already appear first */}
        <FlashList
          data={sorted}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          numColumns={1}
          contentContainerStyle={{ paddingBottom: 96 }}
        />
        {sorted.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 48 }}>
            <Text variant="bodyMedium" style={{ opacity: 0.6 }}>No notes yet. Tap + to create one.</Text>
          </View>
        )}
      </View>

      <FAB icon="plus" style={{ position: 'absolute', right: 24, bottom: 24 }} onPress={() => router.push('/note')} />
    </View>
  );
}
