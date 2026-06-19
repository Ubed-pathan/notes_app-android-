export type ActiveAlarm = {
  noteId: string;
  title: string;
  notificationId?: string;
};

type Listener = (alarm: ActiveAlarm | null) => void;

let activeAlarm: ActiveAlarm | null = null;
const listeners = new Set<Listener>();

export function subscribeAlarmAlert(listener: Listener): () => void {
  listeners.add(listener);
  listener(activeAlarm);
  return () => listeners.delete(listener);
}

export function showAlarmAlert(alarm: ActiveAlarm): void {
  activeAlarm = alarm;
  listeners.forEach(listener => listener(activeAlarm));
}

export function clearAlarmAlert(): void {
  activeAlarm = null;
  listeners.forEach(listener => listener(null));
}

export function getActiveAlarm(): ActiveAlarm | null {
  return activeAlarm;
}
