import { memo, useState } from 'react';
import { Card, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { View } from 'react-native';
import { Note } from '../storage/notes';

type Props = {
  note: Note;
  onPress?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onTogglePrivate?: () => void;
};

export const NoteCard = memo(function NoteCard({ note, onPress, onDelete, onTogglePin, onTogglePrivate }: Props) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const bg = note.pinned
    ? (theme.isV3 ? theme.colors.secondaryContainer : theme.colors.backdrop)
    : (theme.isV3 ? theme.colors.surfaceVariant : theme.colors.surface);
  const accent = theme.colors.primary;
  const onSurfaceVariant = (theme as any).colors?.onSurfaceVariant ?? '#6b6b6b';

  const dateLabel = new Date(note.updatedAt).toLocaleString();
  const subtitle = (
    <Text style={{ color: onSurfaceVariant, fontSize: 12 }}>
      {dateLabel}
      {note.pinned ? <Text style={{ color: accent }}>{'  • Pinned'}</Text> : null}
    </Text>
  );
  return (
    <Card
      mode={note.pinned ? 'elevated' : 'contained'}
      style={{
        marginRight: 12,
        marginBottom: 12,
        backgroundColor: bg,
        borderLeftWidth: note.pinned ? 4 : 0,
        borderLeftColor: note.pinned ? accent : 'transparent',
        elevation: note.pinned ? 3 : 1,
      }}
      onPress={onPress}
    >
      <Card.Title
        title={note.title || 'Untitled'}
        subtitle={subtitle}
        right={(props) => (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton {...props} icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
          >
            <Menu.Item
              onPress={() => { setMenuVisible(false); onTogglePrivate && onTogglePrivate(); }}
              title={note.isPrivate ? 'Make public' : 'Make private'}
              leadingIcon={note.isPrivate ? 'lock-open-variant' : 'lock'}
            />
            <Menu.Item
              onPress={() => { setMenuVisible(false); onTogglePin && onTogglePin(); }}
              title={note.pinned ? 'Unpin' : 'Pin'}
              leadingIcon={note.pinned ? 'pin-off' : 'pin-outline'}
            />
            <Menu.Item
              onPress={() => { setMenuVisible(false); onDelete && onDelete(); }}
              title="Delete"
              leadingIcon="delete"
            />
          </Menu>
        )}
      />
      {note.content ? (
        <Card.Content>
          <Text numberOfLines={4}>
            {note.content}
          </Text>
        </Card.Content>
      ) : null}
    </Card>
  );
});
