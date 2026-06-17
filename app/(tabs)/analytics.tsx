import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Appbar, Divider, ProgressBar, Surface, Text, useTheme } from 'react-native-paper';
import { getNoteStats, NoteStats } from '../../src/storage/notes';
import { ProgressRing } from '../../src/components/ProgressRing';
import { StatCard } from '../../src/components/StatCard';
import { useScreenBottomInset } from '../../src/hooks/useScreenBottomInset';

export default function AnalyticsScreen() {
  const theme = useTheme();
  const [stats, setStats] = useState<NoteStats | null>(null);
  const { scrollPaddingBottom } = useScreenBottomInset(16);

  const load = useCallback(async () => {
    const s = await getNoteStats({ onlyPublic: true });
    setStats(s);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completionPct = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const checklistPct =
    stats && stats.checklistTotal > 0 ? Math.round((stats.checklistDone / stats.checklistTotal) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header elevated>
        <Appbar.Content title="Analytics" subtitle="Your productivity at a glance" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: scrollPaddingBottom }}>
        <Surface style={{ borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, backgroundColor: theme.colors.primaryContainer }}>
          <Text variant="labelLarge" style={{ opacity: 0.8, marginBottom: 16, color: theme.colors.onPrimaryContainer }}>
            Overall Progress
          </Text>
          <ProgressRing
            progress={completionPct}
            size={140}
            strokeWidth={12}
            label={`${completionPct}%`}
            sublabel="completed"
            color={theme.colors.primary}
          />
          <Text variant="bodyMedium" style={{ marginTop: 16, opacity: 0.8, color: theme.colors.onPrimaryContainer }}>
            {stats ? `${stats.completed} of ${stats.total} tasks done` : '—'}
          </Text>
        </Surface>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <StatCard icon="📋" label="Total Tasks" value={stats?.total ?? 0} color="#6750A4" />
          <StatCard icon="✅" label="Completed" value={stats?.completed ?? 0} color="#2E7D32" />
          <StatCard icon="⏳" label="Pending" value={stats?.pending ?? 0} color="#F57C00" />
          <StatCard icon="⚠️" label="Overdue" value={stats?.overdue ?? 0} color="#C62828" />
          <StatCard icon="📅" label="Due Today" value={stats?.dueToday ?? 0} color="#1565C0" />
          <StatCard icon="🔔" label="Reminders" value={stats?.withReminders ?? 0} color="#6A1B9A" />
        </View>

        <Surface style={{ borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 16 }}>
            Checklist Progress
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <ProgressRing
              progress={checklistPct}
              size={90}
              strokeWidth={8}
              label={`${checklistPct}%`}
              color="#00897B"
            />
            <View style={{ flex: 1 }}>
              <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                {stats?.checklistDone ?? 0} / {stats?.checklistTotal ?? 0}
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 4 }}>
                checklist items completed across all notes
              </Text>
              <ProgressBar progress={checklistPct / 100} style={{ marginTop: 12, height: 8, borderRadius: 4 }} />
            </View>
          </View>
        </Surface>

        <Surface style={{ borderRadius: 20, padding: 20 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 12 }}>
            Quick Insights
          </Text>
          <InsightRow
            label="Completion rate"
            value={`${completionPct}%`}
            hint={completionPct >= 75 ? 'Great job! 🎉' : completionPct >= 50 ? 'Keep going 💪' : 'You can do it!'}
          />
          <Divider style={{ marginVertical: 10, opacity: 0.1 }} />
          <InsightRow
            label="Pinned notes"
            value={String(stats?.pinned ?? 0)}
            hint="Important items at the top"
          />
          <Divider style={{ marginVertical: 10, opacity: 0.1 }} />
          <InsightRow
            label="Private notes"
            value={String(stats?.private ?? 0)}
            hint="Secured in your vault"
          />
          <Divider style={{ marginVertical: 10, opacity: 0.1 }} />
          <InsightRow
            label="Active reminders"
            value={String(stats?.withReminders ?? 0)}
            hint="Upcoming notifications"
          />
        </Surface>
      </ScrollView>
    </View>
  );
}

function InsightRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{label}</Text>
        <Text variant="labelSmall" style={{ opacity: 0.5, marginTop: 2 }}>{hint}</Text>
      </View>
      <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.primary }}>{value}</Text>
    </View>
  );
}
