import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadNavigation,
  loadKnownWordIds,
  loadWordListPreferences,
  saveNavigation,
  saveKnownWordIds,
  saveWordListPreferences,
  wordSessionKey,
  loadWordSession,
  saveWordSession,
  loadGrammarSession,
  saveGrammarSession,
} from "../src/studySession.ts";
import type { StudyWord } from "../src/vocabulary.ts";
import type { GrammarQuestion } from "../src/grammar.ts";
const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  },
  configurable: true,
});
const words: StudyWord[] = [
  { id: "day01-a", word: "apple", meaning: "사과", group: "textbook", day: 1 },
  { id: "day01-b", word: "book", meaning: "책", group: "textbook", day: 1 },
];
const grammar: GrammarQuestion[] = [
  {
    id: "g1",
    before: "She ",
    underlined: "go",
    after: ".",
    isCorrect: false,
    correction: "goes",
    explanation: "3인칭 단수",
  },
  {
    id: "g2",
    before: "He ",
    underlined: "runs",
    after: ".",
    isCorrect: true,
    explanation: "올바른 동사",
  },
];
test("선택한 섹션, 일차, 탭을 복원하고 손상된 값은 기본값으로 돌린다", () => {
  values.clear();
  assert.deepEqual(loadNavigation(), {
    section: "textbook",
    day: 1,
    mode: "cards",
  });
  saveNavigation({ section: "grammar", day: 12, mode: "example" });
  assert.deepEqual(loadNavigation(), {
    section: "grammar",
    day: 12,
    mode: "example",
  });
  values.set(
    "voca-app.navigation.v1",
    '{"section":"invalid","day":42,"mode":"wrong"}',
  );
  assert.deepEqual(loadNavigation(), {
    section: "textbook",
    day: 1,
    mode: "cards",
  });
});
test("단어 목록의 연관 단어 표시 설정을 계속 유지한다", () => {
  values.clear();
  assert.deepEqual(loadWordListPreferences(), {
    showRelated: true,
  });
  saveWordListPreferences({ showRelated: false });
  assert.deepEqual(loadWordListPreferences(), {
    showRelated: false,
  });
  values.set("voca-app.word-list-preferences.v1", '{"showDerived":false}');
  assert.deepEqual(loadWordListPreferences(), {
    showRelated: false,
  });
});
test("아는 단어 표시는 모든 단어장 세션에서 공유한다", () => {
  values.clear();
  saveKnownWordIds(["day01-b"]);
  assert.deepEqual(loadKnownWordIds(words), ["day01-b"]);
  assert.deepEqual(loadKnownWordIds([words[0]]), []);
  values.set(
    "voca-app.known-word-ids.v1",
    '["day01-b", "day01-b"]',
  );
  assert.deepEqual(loadKnownWordIds(words), []);
});
test("단어 카드와 퀴즈 위치, 뒤집기, 정답 화면, 오답 목록을 복원한다", () => {
  values.clear();
  const key = wordSessionKey("textbook", 1, "meaning");
  saveWordSession(key, words, {
    queue: [words[1], words[0]],
    index: 1,
    flipped: true,
    answer: false,
    selected: "책",
    missed: [words[0]],
    score: 1,
    choices: ["책", "사과"],
    search: "app",
    knownIds: [],
  });
  const restored = loadWordSession(key, words, "meaning");
  assert.deepEqual(
    restored?.queue.map((word) => word.id),
    ["day01-b", "day01-a"],
  );
  assert.equal(restored?.index, 1);
  assert.equal(restored?.answer, false);
  assert.deepEqual(
    restored?.missed.map((word) => word.id),
    ["day01-a"],
  );
  assert.equal(restored?.search, "app");
  assert.equal(
    loadWordSession(wordSessionKey("textbook", 2, "meaning"), words, "meaning"),
    null,
  );
  assert.equal(
    loadWordSession(
      key,
      [{ ...words[0], meaning: "과일" }, words[1]],
      "meaning",
    ),
    null,
  );
  values.set(key, '{"sourceIds":["day01-a"]}');
  assert.equal(loadWordSession(key, words, "meaning"), null);
  const cardKey = wordSessionKey("textbook", 1, "cards");
  saveWordSession(cardKey, words, {
    queue: [words[1], words[0]],
    index: 1,
    flipped: true,
    answer: null,
    selected: null,
    missed: [],
    score: 0,
    choices: [],
    search: "",
    knownIds: ["day01-b"],
  });
  assert.deepEqual(
    loadWordSession(cardKey, words, "cards")?.queue.map((word) => word.id),
    ["day01-b", "day01-a"],
  );
  assert.equal(loadWordSession(cardKey, words, "cards")?.flipped, true);
  saveWordSession(cardKey, words, {
    queue: [words[0]],
    index: 0,
    flipped: false,
    answer: null,
    selected: null,
    missed: [],
    score: 0,
    choices: [],
    search: "",
    knownIds: [],
  });
  assert.deepEqual(
    loadWordSession(cardKey, words, "cards")?.queue.map((word) => word.id),
    ["day01-a"],
  );
});
test("문법 문제 순서, 응답과 점수를 복원하고 바뀐 문제는 재시작한다", () => {
  values.clear();
  saveGrammarSession(grammar, {
    queue: [grammar[1], grammar[0]],
    index: 1,
    selected: false,
    score: 1,
    missed: [grammar[1]],
  });
  const restored = loadGrammarSession(grammar);
  assert.deepEqual(
    restored?.queue.map((question) => question.id),
    ["g2", "g1"],
  );
  assert.equal(restored?.selected, false);
  assert.equal(restored?.score, 1);
  assert.equal(
    loadGrammarSession([{ ...grammar[0], explanation: "새 해설" }, grammar[1]]),
    null,
  );
});
