import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Appbar, Searchbar, Text, useTheme } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Note, deleteNote, listNotes, setPrivate, togglePin } from '../../src/storage/notes';
import { NoteCard } from '../../src/components/NoteCard';
import { isConfigured } from '../../src/storage/private';

export default function PrivateNotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { unlocked } = useLocalSearchParams<{ unlocked?: string }>();
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);

  const load = useCallback(async () => {
    const list = await listNotes({ query: q, onlyPrivate: true });
    setNotes(list);
  }, [q]);

  useEffect(() => {
    (async () => {
      const configured = await isConfigured();
      if (!configured) {
        router.replace('/private/setup?redirect=/private/notes');
        return;
      }
      if (!unlocked) {
        router.replace('/private/auth?redirect=/private/notes');
        return;
      }
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, unlocked, q]);

  useFocusEffect(
    useCallback(() => {
      // Reload when returning from editing a note so changes reflect
      load();
    }, [load])
  );

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
    await setPrivate(id, false); // moving back to public
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={'Private Notes'} />
      </Appbar.Header>
      <Searchbar
        placeholder="Search private notes"
        value={q}
        onChangeText={setQ}
        style={{ margin: 12, marginBottom: 0 }}
      />
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }}>
        {notes.length > 0 ? (
          <FlashList
            data={notes}
            renderItem={({ item }) => (
              <NoteCard
                note={item}
                onDelete={() => onDelete(item.id)}
                onTogglePin={() => onTogglePin(item.id)}
                onTogglePrivate={() => onTogglePrivate(item.id)}
                onPress={() => router.push({ pathname: '/note', params: { id: item.id } })}
              />
            )}
            keyExtractor={(i) => i.id}
            numColumns={1}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 96 }}>
            <Text variant="bodyMedium" style={{ opacity: 0.6, textAlign: 'center' }}>No private notes.</Text>
          </View>
        )}
      </View>
    </View>
  );
}
