import type { GrammarQuestion } from "./grammar";
import type { StudyWord } from "./vocabulary";

export type Mode = "cards" | "meaning" | "example" | "list";
export type Section = "textbook" | "extra" | "all" | "grammar";

export type Navigation = { section: Section; day: number; mode: Mode };
export type WordSession = {
  queue: StudyWord[];
  index: number;
  flipped: boolean;
  answer: boolean | null;
  selected: string | null;
  missed: StudyWord[];
  score: number;
  choices: string[];
  search: string;
  knownIds: string[];
};
export type GrammarSession = {
  queue: GrammarQuestion[];
  index: number;
  selected: boolean | null;
  score: number;
  missed: GrammarQuestion[];
};

const NAVIGATION_KEY = "voca-app.navigation.v1";
const WORD_SESSION_PREFIX = "voca-app.word-session.v1:";
const GRAMMAR_SESSION_KEY = "voca-app.grammar-session.v1";
const sections: Section[] = ["textbook", "extra", "all", "grammar"];
const modes: Mode[] = ["cards", "meaning", "example", "list"];

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function read(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The current session remains usable when storage is unavailable.
  }
}
function idsOf<T extends { id: string }>(items: T[]): string[] {
  return items.map((item) => item.id);
}
function versionOf(items: unknown[]) {
  const text = JSON.stringify(items);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}
function sameIds(value: unknown, items: { id: string }[]) {
  return (
    Array.isArray(value) &&
    value.length === items.length &&
    value.every((id, index) => id === items[index].id)
  );
}
function restoreItems<T extends { id: string }>(
  value: unknown,
  items: T[],
): T[] | null {
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string"))
    return null;
  const byId = new Map(items.map((item) => [item.id, item]));
  const result = value.map((id) => byId.get(id));
  return new Set(value).size === value.length &&
    result.every((item) => item !== undefined)
    ? (result as T[])
    : null;
}

export function loadNavigation(): Navigation {
  const saved = read(NAVIGATION_KEY);
  return {
    section:
      object(saved) && sections.includes(saved.section as Section)
        ? (saved.section as Section)
        : "textbook",
    day:
      object(saved) &&
      Number.isInteger(saved.day) &&
      Number(saved.day) >= 1 &&
      Number(saved.day) <= 20
        ? Number(saved.day)
        : 1,
    mode:
      object(saved) && modes.includes(saved.mode as Mode)
        ? (saved.mode as Mode)
        : "cards",
  };
}
export function saveNavigation(value: Navigation) {
  write(NAVIGATION_KEY, value);
}
export function wordSessionKey(
  section: Exclude<Section, "grammar">,
  day: number,
  mode: Mode,
) {
  return `${WORD_SESSION_PREFIX}${section}:${section === "textbook" ? day : 0}:${mode}`;
}
export function loadWordSession(
  key: string,
  source: StudyWord[],
  mode: Mode,
): WordSession | null {
  const saved = read(key);
  if (
    !object(saved) ||
    !sameIds(saved.sourceIds, source) ||
    saved.sourceVersion !== versionOf(source)
  )
    return null;
  const queue = restoreItems(saved.queueIds, source);
  const missed = restoreItems(saved.missedIds, source);
  if (
    !queue ||
    !missed ||
    !Number.isInteger(saved.index) ||
    Number(saved.index) < 0 ||
    Number(saved.index) > queue.length ||
    typeof saved.flipped !== "boolean" ||
    !(saved.answer === null || typeof saved.answer === "boolean") ||
    !(saved.selected === null || typeof saved.selected === "string") ||
    !Number.isInteger(saved.score) ||
    Number(saved.score) < 0 ||
    Number(saved.score) > queue.length ||
    !Array.isArray(saved.choices) ||
    !saved.choices.every((choice) => typeof choice === "string") ||
    typeof saved.search !== "string" ||
    (saved.knownIds !== undefined &&
      (!Array.isArray(saved.knownIds) ||
        !saved.knownIds.every((id) => typeof id === "string") ||
        new Set(saved.knownIds).size !== saved.knownIds.length ||
        !saved.knownIds.every((id) =>
          source.some((word) => word.id === id),
        )))
  )
    return null;
  if (mode === "cards" && queue.some((word) => !source.includes(word))) return null;
  if (mode === "list" && !sameIds(saved.queueIds, source)) return null;
  if (mode === "example" && queue.some((word) => !word.example?.trim()))
    return null;
  return {
    queue,
    missed,
    index: Number(saved.index),
    flipped: saved.flipped,
    answer: saved.answer,
    selected: saved.selected,
    score: Number(saved.score),
    choices: saved.choices,
    search: saved.search,
    knownIds: Array.isArray(saved.knownIds) ? saved.knownIds : [],
  };
}
export function saveWordSession(
  key: string,
  source: StudyWord[],
  session: WordSession,
) {
  write(key, {
    sourceIds: idsOf(source),
    sourceVersion: versionOf(source),
    queueIds: idsOf(session.queue),
    missedIds: idsOf(session.missed),
    index: session.index,
    flipped: session.flipped,
    answer: session.answer,
    selected: session.selected,
    score: session.score,
    choices: session.choices,
    search: session.search,
    knownIds: session.knownIds,
  });
}
export function loadGrammarSession(
  source: GrammarQuestion[],
): GrammarSession | null {
  const saved = read(GRAMMAR_SESSION_KEY);
  if (
    !object(saved) ||
    !sameIds(saved.sourceIds, source) ||
    saved.sourceVersion !== versionOf(source)
  )
    return null;
  const queue = restoreItems(saved.queueIds, source);
  const missed = restoreItems(saved.missedIds, source);
  if (
    !queue ||
    !missed ||
    !Number.isInteger(saved.index) ||
    Number(saved.index) < 0 ||
    Number(saved.index) > queue.length ||
    !(saved.selected === null || typeof saved.selected === "boolean") ||
    !Number.isInteger(saved.score) ||
    Number(saved.score) < 0 ||
    Number(saved.score) > queue.length
  )
    return null;
  return {
    queue,
    missed,
    index: Number(saved.index),
    selected: saved.selected,
    score: Number(saved.score),
  };
}
export function saveGrammarSession(
  source: GrammarQuestion[],
  session: GrammarSession,
) {
  write(GRAMMAR_SESSION_KEY, {
    sourceIds: idsOf(source),
    sourceVersion: versionOf(source),
    queueIds: idsOf(session.queue),
    missedIds: idsOf(session.missed),
    index: session.index,
    selected: session.selected,
    score: session.score,
  });
}
