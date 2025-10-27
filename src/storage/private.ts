import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { nanoid } from 'nanoid/non-secure';

// Keys
const SETUP_KEY = 'private.setup.v1';
const MESSAGES_KEY = 'private.messages.v1';

export type SecurityQuestion = { id: string; q: string };
export const DefaultQuestions: SecurityQuestion[] = [
  { id: 'pet', q: 'What was the name of your first pet?' },
  { id: 'city', q: 'In which city were you born?' },
  { id: 'teacher', q: 'What is your favorite teacher’s name?' },
  { id: 'book', q: 'What is your favorite book?' },
  { id: 'mother', q: "What is your mother's maiden name?" },
];

export type PrivateSetup = {
  enabled: boolean;
  passwordHash: string; // sha256
  questions: { id: string; q: string; aHash: string }[]; // store hashed answers
};

export type PrivateMessage = {
  id: string;
  text: string;
  timestamp: number;
  sender: 'me';
};

const sha256 = async (text: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);

// Setup management
export async function getSetup(): Promise<PrivateSetup | null> {
  try {
    const raw = await SecureStore.getItemAsync(SETUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PrivateSetup;
  } catch {
    return null;
  }
}

export async function isConfigured(): Promise<boolean> {
  const s = await getSetup();
  return !!(s && s.enabled && s.passwordHash);
}

export async function getQuestions(): Promise<{ id: string; q: string }[]> {
  const s = await getSetup();
  return s?.questions?.map(({ id, q }) => ({ id, q })) ?? [];
}

export async function saveSetup(input: { password: string; answers: { id: string; answer: string }[] }): Promise<void> {
  const passwordHash = await sha256(input.password);
  // Map answers to configured questions with hash
  const questionsWithHash = input.answers.map(({ id, answer }) => {
    const meta = DefaultQuestions.find(q => q.id === id)!;
    return { id, q: meta.q, aHash: '' };
  });
  // Compute hashes in sequence to avoid race
  for (let i = 0; i < questionsWithHash.length; i++) {
    questionsWithHash[i].aHash = await sha256(input.answers[i].answer.trim().toLowerCase());
  }
  const setup: PrivateSetup = { enabled: true, passwordHash, questions: questionsWithHash };
  await SecureStore.setItemAsync(SETUP_KEY, JSON.stringify(setup));
}

export async function clearSetup(): Promise<void> {
  await SecureStore.deleteItemAsync(SETUP_KEY);
}

export async function verifyPassword(pw: string): Promise<boolean> {
  const s = await getSetup();
  if (!s) return false;
  const h = await sha256(pw);
  return h === s.passwordHash;
}

export async function getRandomQuestion(): Promise<{ id: string; q: string } | null> {
  const s = await getSetup();
  if (!s || !s.questions.length) return null;
  const idx = Math.floor(Math.random() * s.questions.length);
  const { id, q } = s.questions[idx];
  return { id, q };
}

export async function verifyAnswer(id: string, answer: string): Promise<boolean> {
  const s = await getSetup();
  if (!s) return false;
  const q = s.questions.find(x => x.id === id);
  if (!q) return false;
  const h = await sha256(answer.trim().toLowerCase());
  return h === q.aHash;
}

export async function verifyAnswers(answers: { id: string; answer: string }[]): Promise<boolean> {
  // All provided answers must match
  for (const a of answers) {
    const ok = await verifyAnswer(a.id, a.answer);
    if (!ok) return false;
  }
  return true;
}

export async function changePasswordWithAnswers(newPassword: string, answers: { id: string; answer: string }[]): Promise<boolean> {
  const s = await getSetup();
  if (!s) return false;
  const ok = await verifyAnswers(answers);
  if (!ok) return false;
  const passwordHash = await sha256(newPassword);
  const updated: PrivateSetup = { ...s, passwordHash };
  await SecureStore.setItemAsync(SETUP_KEY, JSON.stringify(updated));
  return true;
}

// Messages management (stored locally; gated by auth, not encrypted)
async function readMessages(): Promise<PrivateMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PrivateMessage[];
  } catch {
    return [];
  }
}

async function writeMessages(list: PrivateMessage[]) {
  await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(list));
}

export async function listPrivateMessages(): Promise<PrivateMessage[]> {
  const list = await readMessages();
  // newest last for chat
  return list.sort((a, b) => a.timestamp - b.timestamp);
}

export async function addPrivateMessage(text: string): Promise<PrivateMessage> {
  const list = await readMessages();
  const msg: PrivateMessage = { id: nanoid(12), text, timestamp: Date.now(), sender: 'me' };
  list.push(msg);
  await writeMessages(list);
  return msg;
}

export async function clearPrivateMessages() {
  await AsyncStorage.removeItem(MESSAGES_KEY);
}
