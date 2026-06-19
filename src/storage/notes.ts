import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
  pinned?: boolean;
  isPrivate?: boolean;
  dueDate?: number | null;
  completed?: boolean;
  completedAt?: number | null;
  reminderAt?: number | null;
  notificationId?: string | null;
  upcomingNotificationId?: string | null;
  images?: string[];
  checklist?: ChecklistItem[];
};

export type NoteFilter = {
  query?: string;
  onlyPrivate?: boolean;
  onlyPublic?: boolean;
  dueDate?: number | null;
  completed?: boolean | null;
  hasReminder?: boolean;
};

const NOTES_KEY = 'notes.v1';

type NotesState = Record<string, Note>;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function readAll(): Promise<NotesState> {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NotesState;
    // migrate older notes missing createdAt
    let migrated = false;
    for (const id of Object.keys(parsed)) {
      const n = parsed[id];
      if (!n.createdAt) {
        n.createdAt = n.updatedAt || Date.now();
        migrated = true;
      }
      if (n.images === undefined) n.images = [];
      if (n.checklist === undefined) n.checklist = [];
    }
    if (migrated) await writeAll(parsed);
    return parsed;
  } catch {
    return {};
  }
}

async function writeAll(state: NotesState): Promise<void> {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(state));
}

function sortNotes(notes: Note[]): Note[] {
  return notes.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt;
  });
}

function applyFilters(all: Note[], opts?: NoteFilter): Note[] {
  let filtered = all;
  if (opts?.onlyPrivate) filtered = filtered.filter(n => !!n.isPrivate);
  if (opts?.onlyPublic) filtered = filtered.filter(n => !n.isPrivate);
  if (opts?.completed === true) filtered = filtered.filter(n => !!n.completed);
  if (opts?.completed === false) filtered = filtered.filter(n => !n.completed);
  if (opts?.hasReminder) filtered = filtered.filter(n => !!n.reminderAt && n.reminderAt > Date.now());
  if (opts?.dueDate != null) {
    const day = startOfDay(opts.dueDate);
    filtered = filtered.filter(n => n.dueDate != null && startOfDay(n.dueDate) === day);
  }
  if (opts?.query) {
    const q = opts.query.toLowerCase();
    filtered = filtered.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.checklist ?? []).some(c => c.text.toLowerCase().includes(q))
    );
  }
  return filtered;
}

export async function listNotes(opts?: NoteFilter): Promise<Note[]> {
  const state = await readAll();
  const all = sortNotes(Object.values(state));
  return applyFilters(all, opts);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const state = await readAll();
  return state[id];
}

export async function upsertNote(input: Partial<Note> & { id?: string }): Promise<Note> {
  const state = await readAll();
  const id = input.id ?? nanoid(12);
  const prev = state[id];
  const now = Date.now();
  const note: Note = {
    id,
    title: input.title ?? prev?.title ?? '',
    content: input.content ?? prev?.content ?? '',
    updatedAt: now,
    createdAt: prev?.createdAt ?? now,
    pinned: input.pinned ?? prev?.pinned ?? false,
    isPrivate: input.isPrivate ?? prev?.isPrivate ?? false,
    dueDate: input.dueDate !== undefined ? input.dueDate : (prev?.dueDate ?? null),
    completed: input.completed ?? prev?.completed ?? false,
    completedAt: input.completedAt !== undefined ? input.completedAt : (prev?.completedAt ?? null),
    reminderAt: input.reminderAt !== undefined ? input.reminderAt : (prev?.reminderAt ?? null),
    notificationId: input.notificationId !== undefined ? input.notificationId : (prev?.notificationId ?? null),
    upcomingNotificationId:
      input.upcomingNotificationId !== undefined
        ? input.upcomingNotificationId
        : (prev?.upcomingNotificationId ?? null),
    images: input.images ?? prev?.images ?? [],
    checklist: input.checklist ?? prev?.checklist ?? [],
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

export async function toggleComplete(id: string): Promise<Note | undefined> {
  const state = await readAll();
  const note = state[id];
  if (!note) return;
  note.completed = !note.completed;
  note.completedAt = note.completed ? Date.now() : null;
  note.updatedAt = Date.now();
  await writeAll(state);
  return note;
}

export async function setComplete(id: string, completed: boolean): Promise<Note | undefined> {
  const state = await readAll();
  const note = state[id];
  if (!note) return;
  note.completed = completed;
  note.completedAt = completed ? Date.now() : null;
  note.updatedAt = Date.now();
  await writeAll(state);
  return note;
}

export async function getNotesWithDueDates(): Promise<Note[]> {
  const state = await readAll();
  return Object.values(state).filter(n => n.dueDate != null && !n.isPrivate);
}

export async function getDueDatesInRange(start: number, end: number): Promise<number[]> {
  const notes = await getNotesWithDueDates();
  const days = new Set<number>();
  for (const n of notes) {
    if (n.dueDate == null) continue;
    const day = startOfDay(n.dueDate);
    if (day >= startOfDay(start) && day <= startOfDay(end)) days.add(day);
  }
  return Array.from(days).sort((a, b) => a - b);
}

export type NoteStats = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  dueToday: number;
  withReminders: number;
  pinned: number;
  private: number;
  checklistTotal: number;
  checklistDone: number;
};

export async function getNoteStats(opts?: { onlyPublic?: boolean }): Promise<NoteStats> {
  const state = await readAll();
  const today = startOfDay(Date.now());
  let notes = Object.values(state);
  if (opts?.onlyPublic) notes = notes.filter(n => !n.isPrivate);

  const stats: NoteStats = {
    total: notes.length,
    completed: 0,
    pending: 0,
    overdue: 0,
    dueToday: 0,
    withReminders: 0,
    pinned: 0,
    private: 0,
    checklistTotal: 0,
    checklistDone: 0,
  };

  for (const n of notes) {
    if (n.completed) stats.completed++;
    else stats.pending++;
    if (!n.completed && n.dueDate != null && startOfDay(n.dueDate) < today) stats.overdue++;
    if (!n.completed && n.dueDate != null && startOfDay(n.dueDate) === today) stats.dueToday++;
    if (n.reminderAt && n.reminderAt > Date.now()) stats.withReminders++;
    if (n.pinned) stats.pinned++;
    if (n.isPrivate) stats.private++;
    for (const c of n.checklist ?? []) {
      stats.checklistTotal++;
      if (c.checked) stats.checklistDone++;
    }
  }
  return stats;
}

export { startOfDay };
