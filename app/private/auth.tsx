import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Appbar, Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { changePasswordWithAnswers, getQuestions, getRandomQuestion, isConfigured, verifyAnswer, verifyPassword } from '../../src/storage/private';

export default function PrivateAuthScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<{ id: string; q: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [forgotMode, setForgotMode] = useState(false);
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
  const [qs, setQs] = useState<{ id: string; q: string }[]>([]);

  useEffect(() => {
    (async () => {
      if (!(await isConfigured())) {
        router.replace('/private/setup');
      }
      const allQs = await getQuestions();
      setQs(allQs);
    })();
  }, [router]);

  const unlock = async () => {
    setError(null);
    const ok = await verifyPassword(password);
    if (!ok) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (!question) {
        const q = await getRandomQuestion();
        setQuestion(q);
      }
      setError('Incorrect password');
      return;
    }
    // If a challenge question is shown, also require it
    if (question) {
      const ansOk = await verifyAnswer(question.id, answer);
      if (!ansOk) {
        setError('Security answer does not match');
        return;
      }
    }
    const target = typeof redirect === 'string' && redirect ? `${redirect}?unlocked=1` : '/private/notes?unlocked=1';
    router.replace(target);
  };

  const startForgot = async () => {
    setForgotMode(true);
    setError(null);
    if (!qs.length) {
      const allQs = await getQuestions();
      setQs(allQs);
    }
  };

  const resetPassword = async () => {
    setError(null);
    const entries = Object.entries(answersMap).filter(([_, v]) => (v || '').trim().length > 0);
    if (entries.length === 0) {
      setError('Please answer at least one security question.');
      return;
    }
    const ok = await changePasswordWithAnswers(password, entries.map(([id, answer]) => ({ id, answer })));
    if (!ok) {
      setError('Answers do not match our records.');
      return;
    }
    setForgotMode(false);
    setPassword('');
    setAnswersMap({});
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Unlock Private Chat" />
      </Appbar.Header>
      <View style={{ padding: 16 }}>
        {!forgotMode ? (
          <>
            <TextInput
              mode="flat"
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? <HelperText type="error">{error}</HelperText> : null}

            {question ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ marginBottom: 6 }}>{question.q}</Text>
                <TextInput
                  mode="flat"
                  label="Your Answer"
                  value={answer}
                  onChangeText={setAnswer}
                />
              </View>
            ) : null}

            <Button mode="contained" style={{ marginTop: 16 }} onPress={unlock}>
              Unlock
            </Button>
            <Button style={{ marginTop: 8 }} onPress={startForgot}>Forgot password?</Button>
          </>
        ) : (
          <>
            <Text style={{ marginBottom: 8 }}>Answer your security question(s) to set a new password.</Text>
            {qs.map(q => (
              <View key={q.id} style={{ marginBottom: 8 }}>
                <Text style={{ marginBottom: 6 }}>{q.q}</Text>
                <TextInput
                  mode="flat"
                  label="Your Answer"
                  value={answersMap[q.id] || ''}
                  onChangeText={t => setAnswersMap(prev => ({ ...prev, [q.id]: t }))}
                />
              </View>
            ))}
            <TextInput
              mode="flat"
              label="New Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={{ marginTop: 8 }}
            />
            {error ? <HelperText type="error">{error}</HelperText> : null}
            <Button mode="contained" style={{ marginTop: 12 }} onPress={resetPassword}>Set New Password</Button>
            <Button style={{ marginTop: 8 }} onPress={() => setForgotMode(false)}>Back to unlock</Button>
          </>
        )}
      </View>
    </View>
  );
}
