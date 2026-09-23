import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadUserContent,
  saveUserContent,
  USER_EXTRA_WORDS_KEY,
  USER_GRAMMAR_QUESTIONS_KEY,
} from "../src/userContent.ts";
import type { Book, Extra } from "../src/vocabulary.ts";
import type { GrammarData } from "../src/grammar.ts";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  },
  configurable: true,
});

const textbook: Book = {
  title: "책",
  days: Array.from({ length: 20 }, (_, index) => ({ day: index + 1, words: [] })),
};
const extra: Extra = { words: [{ id: "extra-a", word: "apple", meaning: "사과" }] };
const grammar: GrammarData = { questions: [] };

test("개인 추가 단어와 문법 콘텐츠를 저장하고 다시 읽는다", () => {
  values.clear();
  saveUserContent({ extra, grammar });
  assert.deepEqual(JSON.parse(values.get(USER_EXTRA_WORDS_KEY) ?? ""), extra);
  assert.deepEqual(
    JSON.parse(values.get(USER_GRAMMAR_QUESTIONS_KEY) ?? ""),
    grammar,
  );
  assert.deepEqual(loadUserContent(textbook, extra, grammar), { extra, grammar });
});

test("잘못된 개인 콘텐츠는 기본 콘텐츠로 되돌린다", () => {
  values.clear();
  values.set(USER_EXTRA_WORDS_KEY, '{"words":[{"id":"bad"}]}');
  values.set(USER_GRAMMAR_QUESTIONS_KEY, '{"questions":[{"id":"bad"}]}');
  assert.deepEqual(loadUserContent(textbook, extra, grammar), { extra, grammar });
});
