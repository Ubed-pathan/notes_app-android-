import { memo, useMemo, useState } from 'react';
import { Checkbox, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { Image, Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Note } from '../storage/notes';
import { formatDueDate } from '../utils/formatting';
import { markdownToRich, RichText } from '../utils/richText';
import { ImageLightbox } from './ImageLightbox';

type Props = {
  note: Note;
  onPress?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onTogglePrivate?: () => void;
  onToggleComplete?: () => void;
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MetaTag({
  icon,
  label,
  color,
  bg,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 6,
        marginBottom: 4,
      }}
    >
      <MaterialCommunityIcons name={icon} size={12} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '600', color, marginLeft: 4 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const NoteCard = memo(function NoteCard({
  note,
  onPress,
  onDelete,
  onTogglePin,
  onTogglePrivate,
  onToggleComplete,
}: Props) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const overdueDay =
    note.dueDate != null &&
    !note.completed &&
    new Date(note.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  const checklist = note.checklist ?? [];
  const checklistDone = checklist.filter(c => c.checked).length;
  const checklistTotal = checklist.length;
  const checklistPct = checklistTotal ? (checklistDone / checklistTotal) * 100 : 0;

  const previewRich = useMemo(() => markdownToRich(note.content ?? ''), [note.content]);
  const preview = previewRich.plain.trim();
  const images = note.images ?? [];
  const hasReminder = note.reminderAt != null && note.reminderAt > Date.now();

  const accentColor = note.completed
    ? '#81C784'
    : overdueDay
      ? '#EF5350'
      : note.pinned
        ? theme.colors.primary
        : theme.colors.primaryContainer;

  const cardBg = note.completed
    ? theme.colors.surfaceVariant
    : theme.colors.surface;

  return (
    <>
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginBottom: 14,
        borderRadius: 18,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: note.pinned && !note.completed
          ? theme.colors.primary + '40'
          : theme.colors.outlineVariant,
        overflow: 'hidden',
        opacity: note.completed ? 0.88 : pressed ? 0.96 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
        shadowColor: '#1a1033',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.dark ? 0.35 : 0.08,
        shadowRadius: 12,
        elevation: note.pinned ? 4 : 2,
      })}
    >
      {/* Status accent strip */}
      <View style={{ height: 4, backgroundColor: accentColor }} />

      <View style={{ padding: 14, paddingTop: 12 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {onToggleComplete ? (
            <Pressable
              onPress={onToggleComplete}
              hitSlop={8}
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 2,
                borderColor: note.completed ? theme.colors.primary : theme.colors.outline,
                backgroundColor: note.completed ? theme.colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
                marginTop: 2,
              }}
            >
              {note.completed ? (
                <MaterialCommunityIcons name="check" size={14} color={theme.colors.onPrimary} />
              ) : null}
            </Pressable>
          ) : null}

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                variant="titleMedium"
                numberOfLines={2}
                style={{
                  flex: 1,
                  fontWeight: '800',
                  fontSize: 16,
                  lineHeight: 22,
                  letterSpacing: -0.2,
                  textDecorationLine: note.completed ? 'line-through' : 'none',
                  color: note.completed ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
                }}
              >
                {note.title || 'Untitled'}
              </Text>
              {note.pinned ? (
                <MaterialCommunityIcons name="pin" size={16} color={theme.colors.primary} />
              ) : null}
              {note.isPrivate ? (
                <MaterialCommunityIcons name="lock" size={15} color={theme.colors.onSurfaceVariant} />
              ) : null}
            </View>

            {preview ? (
              <RichText
                content={previewRich}
                numberOfLines={2}
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 19,
                  color: theme.colors.onSurfaceVariant,
                  opacity: note.completed ? 0.55 : 0.85,
                }}
              />
            ) : null}
          </View>

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                style={{ margin: -8 }}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => { setMenuVisible(false); onToggleComplete?.(); }}
              title={note.completed ? 'Mark incomplete' : 'Mark completed'}
              leadingIcon={note.completed ? 'checkbox-blank-circle-outline' : 'check-circle'}
            />
            <Menu.Item
              onPress={() => { setMenuVisible(false); onTogglePrivate?.(); }}
              title={note.isPrivate ? 'Make public' : 'Make private'}
              leadingIcon={note.isPrivate ? 'lock-open-variant' : 'lock'}
            />
            <Menu.Item
              onPress={() => { setMenuVisible(false); onTogglePin?.(); }}
              title={note.pinned ? 'Unpin' : 'Pin'}
              leadingIcon={note.pinned ? 'pin-off' : 'pin-outline'}
            />
            <Menu.Item
              onPress={() => { setMenuVisible(false); onDelete?.(); }}
              title="Delete"
              leadingIcon="delete"
            />
          </Menu>
        </View>

        {/* Images */}
        {images.length > 0 ? (
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            {images.slice(0, 3).map((uri, i) => (
              <Pressable
                key={uri}
                onPress={() => setPreviewImage(uri)}
                style={{
                  borderRadius: 10,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                }}
              >
                <Image source={{ uri }} style={{ width: 64, height: 64 }} />
                {i === 2 && images.length > 3 ? (
                  <View
                    style={{
                      ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>+{images.length - 3}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Checklist progress */}
        {checklistTotal > 0 ? (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text variant="labelSmall" style={{ fontWeight: '600', opacity: 0.7 }}>
                Checklist
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

        {/* Meta tags */}
        {(note.dueDate || hasReminder || note.completed) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
            {note.completed ? (
              <MetaTag icon="check-circle" label="Completed" color="#2E7D32" bg="#E8F5E9" />
            ) : null}
            {note.dueDate ? (
              <MetaTag
                icon={overdueDay ? 'alert-circle' : 'calendar'}
                label={formatDueDate(note.dueDate)}
                color={overdueDay ? theme.colors.error : theme.colors.onSurfaceVariant}
                bg={overdueDay ? theme.colors.errorContainer : theme.colors.surfaceVariant}
              />
            ) : null}
            {hasReminder ? (
              <MetaTag
                icon="bell-outline"
                label={new Date(note.reminderAt!).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                color="#6A1B9A"
                bg="#F3E5F5"
              />
            ) : null}
          </View>
        ) : null}

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: theme.colors.outlineVariant + '80',
          }}
        >
          <Text variant="labelSmall" style={{ opacity: 0.45, fontSize: 11 }}>
            {relativeTime(note.updatedAt)}
          </Text>
          {note.completed && note.completedAt ? (
            <Text variant="labelSmall" style={{ opacity: 0.45, fontSize: 11 }}>
              Done {relativeTime(note.completedAt)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
    <ImageLightbox uri={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
});
