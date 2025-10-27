import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Appbar, Button, Chip, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DefaultQuestions, saveSetup } from '../../src/storage/private';

export default function PrivateSetupScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return (
      password.length >= 4 &&
      password === confirm &&
      selected.length === 2 &&
      selected.every(id => (answers[id] || '').trim().length >= 2)
    );
  }, [password, confirm, selected, answers]);

  const toggleQuestion = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev; // max two
      return [...prev, id];
    });
  };

  const onSave = async () => {
    setError(null);
    if (!canSave) {
      setError('Please fill password and select two questions with answers.');
      return;
    }
    await saveSetup({
      password,
      answers: selected.map(id => ({ id, answer: answers[id].trim() })),
    });
    const target = typeof redirect === 'string' && redirect ? `${redirect}?unlocked=1` : '/private/notes?unlocked=1';
    router.replace(target);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Setup Private Chat" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Create a password</Text>
        <TextInput
          mode="flat"
          label="Password (min 4)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ marginBottom: 8 }}
        />
        <TextInput
          mode="flat"
          label="Confirm Password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
        {password && confirm && password !== confirm ? (
          <HelperText type="error">Passwords do not match</HelperText>
        ) : null}

        <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 8 }}>Pick two security questions</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DefaultQuestions.map(q => (
            <Chip
              key={q.id}
              selected={selected.includes(q.id)}
              onPress={() => toggleQuestion(q.id)}
              style={{ marginRight: 6, marginBottom: 6 }}
              icon={selected.includes(q.id) ? 'check' : undefined}
            >
              {q.q}
            </Chip>
          ))}
        </View>

        {selected.map(id => {
          const q = DefaultQuestions.find(x => x.id === id)!;
          return (
            <View key={id} style={{ marginTop: 12 }}>
              <Text style={{ marginBottom: 6 }}>{q.q}</Text>
              <TextInput
                mode="flat"
                label="Your Answer"
                value={answers[id] || ''}
                onChangeText={t => setAnswers(prev => ({ ...prev, [id]: t }))}
              />
            </View>
          );
        })}

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button mode="contained" style={{ marginTop: 16 }} onPress={onSave} disabled={!canSave}>
          Save and Open Private Chat
        </Button>
      </ScrollView>
    </View>
  );
}
