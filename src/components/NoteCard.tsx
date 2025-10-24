import { memo } from 'react';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';
import { View } from 'react-native';
import { Note } from '../storage/notes';

type Props = {
  note: Note;
  onPress?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
};

export const NoteCard = memo(function NoteCard({ note, onPress, onDelete, onTogglePin }: Props) {
  const theme = useTheme();
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
        <>
          <IconButton {...props} icon={note.pinned ? 'pin' : 'pin-outline'} onPress={onTogglePin} />
          <IconButton {...props} icon="delete" onPress={onDelete} />
        </>
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
