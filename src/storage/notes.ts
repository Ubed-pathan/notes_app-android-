import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';

export type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  pinned?: boolean;
  isPrivate?: boolean;
};

const NOTES_KEY = 'notes.v1';

type NotesState = Record<string, Note>;

async function readAll(): Promise<NotesState> {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as NotesState;
  } catch {
    return {};
  }
}

async function writeAll(state: NotesState): Promise<void> {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(state));
}

export async function listNotes(opts?: { query?: string; onlyPrivate?: boolean; onlyPublic?: boolean }): Promise<Note[]> {
  const state = await readAll();
  const all = Object.values(state).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
  let filtered = all;
  if (opts?.onlyPrivate) filtered = filtered.filter(n => !!n.isPrivate);
  if (opts?.onlyPublic) filtered = filtered.filter(n => !n.isPrivate);
  if (!opts?.query) return filtered;
  const q = opts.query.toLowerCase();
  return filtered.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
}

export async function getNote(id: string): Promise<Note | undefined> {
  const state = await readAll();
  return state[id];
}

export async function upsertNote(input: Partial<Note> & { id?: string }): Promise<Note> {
  const state = await readAll();
  const id = input.id ?? nanoid(12);
  const prev = state[id];
  const note: Note = {
    id,
    title: input.title ?? prev?.title ?? '',
    content: input.content ?? prev?.content ?? '',
    updatedAt: Date.now(),
    pinned: input.pinned ?? prev?.pinned ?? false,
    isPrivate: input.isPrivate ?? prev?.isPrivate ?? false,
  };
  state[id] = note;
  await writeAll(state);
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  const state = await readAll();
  delete state[id];
  await writeAll(state);
}

export async function togglePin(id: string): Promise<void> {
  const state = await readAll();
  const note = state[id];
  if (!note) return;
  note.pinned = !note.pinned;
  note.updatedAt = Date.now();
  await writeAll(state);
}

export async function setPrivate(id: string, isPrivate: boolean): Promise<void> {
  const state = await readAll();
  const note = state[id];
  if (!note) return;
  note.isPrivate = isPrivate;
  note.updatedAt = Date.now();
  await writeAll(state);
}
