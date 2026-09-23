export const STUDY_STATE_CHANGED = "voca-app:study-state-changed";
const STORAGE_PREFIX = "voca-app.";
export const USER_CONTENT_STATE_KEYS = [
  "voca-app.extra-words.v1",
  "voca-app.grammar-questions.v1",
] as const;

export type StoredStudyState = {
  version: 1;
  entries: Record<string, string>;
};

export function notifyStudyStateChanged() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(STUDY_STATE_CHANGED));
}

export function captureStudyState(): StoredStudyState {
  const entries: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return { version: 1, entries };
}

export function parseStoredStudyState(value: unknown): StoredStudyState | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    (value as { version?: unknown }).version !== 1
  )
    return null;
  const entries = (value as { entries?: unknown }).entries;
  if (typeof entries !== "object" || entries === null || Array.isArray(entries))
    return null;
  const pairs = Object.entries(entries);
  if (
    !pairs.every(
      ([key, entry]) =>
        key.startsWith(STORAGE_PREFIX) && typeof entry === "string",
    )
  )
    return null;
  return { version: 1, entries: Object.fromEntries(pairs) };
}

export function restoreStudyState(state: StoredStudyState) {
  const currentKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) currentKeys.push(key);
  }
  for (const key of currentKeys) localStorage.removeItem(key);
  for (const [key, value] of Object.entries(state.entries)) {
    localStorage.setItem(key, value);
  }
}

export function sameStudyState(left: StoredStudyState, right: StoredStudyState) {
  const leftKeys = Object.keys(left.entries).sort();
  const rightKeys = Object.keys(right.entries).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && left.entries[key] === right.entries[key],
    )
  );
}

export function addMissingStudyStateEntries(
  remote: StoredStudyState,
  local: StoredStudyState,
) {
  const entries = { ...remote.entries };
  let changed = false;
  for (const key of USER_CONTENT_STATE_KEYS) {
    if (entries[key] === undefined && local.entries[key] !== undefined) {
      entries[key] = local.entries[key];
      changed = true;
    }
  }
  return { state: { version: 1 as const, entries }, changed };
}
