import { Link, useRouter, useFocusEffect } from 'expo-router';
import { View, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';
import { Appbar, FAB, Searchbar, Text, useTheme } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Note, listNotes, deleteNote, togglePin, setPrivate } from '../src/storage/notes';
import { NoteCard } from '../src/components/NoteCard';

export default function NotesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [triggeredPrivate, setTriggeredPrivate] = useState(false);
  const hasScrolledRef = useRef(false);

  const load = useCallback(async () => {
    const data = await listNotes({ query: q, onlyPublic: true });
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

  const onTogglePrivate = async (id: string) => {
    const n = notes.find(n => n.id === id);
    await setPrivate(id, !n?.isPrivate);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  const renderItem = useCallback(({ item }: { item: Note }) => (
    <NoteCard
      note={item}
      onDelete={() => onDelete(item.id)}
      onTogglePin={() => onTogglePin(item.id)}
      onTogglePrivate={() => onTogglePrivate(item.id)}
      onPress={() => router.push({ pathname: '/note', params: { id: item.id } })}
    />
  ), [router]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 50) hasScrolledRef.current = true;
    if (!triggeredPrivate && y > 300) {
      setTriggeredPrivate(true);
      router.push('/private/notes');
    }
  };

  const onEndReached = () => {
    if (triggeredPrivate) return;
    if (!hasScrolledRef.current) return; // require some scroll first
    setTriggeredPrivate(true);
    router.push('/private/notes');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.Content
          title={
            <Pressable onLongPress={() => router.push('/private/notes')}>
              <Text
                variant="titleLarge"
                style={{ fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}
              >
                AL-KITAB
              </Text>
            </Pressable>
          }
        />
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
        {sorted.length > 0 ? (
          <FlashList
            data={sorted}
            renderItem={renderItem}
            keyExtractor={(i) => i.id}
            numColumns={1}
            onScroll={onScroll}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.2}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 96 }}>
            <Text variant="bodyMedium" style={{ opacity: 0.6, textAlign: 'center' }}>
              No notes yet. Tap + to create one.
            </Text>
          </View>
        )}
      </View>

      <FAB icon="plus" style={{ position: 'absolute', right: 24, bottom: 24 }} onPress={() => router.push('/note')} />
    </View>
  );
}
