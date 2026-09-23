import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectWords,
  meaningChoices,
  isRelatedWord,
  relatedWordType,
  parseProgress,
  selectWords,
  shuffle,
  validateData,
} from "../src/vocabulary.ts";
import type { Book } from "../src/vocabulary.ts";
const book: Book = {
  title: "테스트",
  days: Array.from({ length: 20 }, (_, i) => ({
    day: i + 1,
    words:
      i < 2
        ? [
            {
              id: `day-${i + 1}`,
              word: i === 0 ? "apple" : "pear",
              meaning: i === 0 ? "사과" : "배",
              example: "A test sentence.",
              exampleMeaning: "테스트 문장입니다.",
            },
          ]
        : [],
  })),
};
const extra = {
  words: [
    { id: "extra-1", word: "grape", meaning: "포도" },
    { id: "extra-2", word: "another grape", meaning: "포도" },
  ],
};
const words = collectWords(book, extra);

test("identifies only related-word entries marked with a base word", () => {
  assert.equal(
    relatedWordType({ note: "파생어 · 기준 단어: act" }),
    "derived",
  );
  assert.equal(
    relatedWordType({ note: "유의어 · 기준 단어: happy" }),
    "synonym",
  );
  assert.equal(
    relatedWordType({ note: "유의어: glad, cheerful" }),
    null,
  );
  assert.equal(isRelatedWord({ note: "반의어 · 기준 단어: happy" }), true);
  assert.equal(isRelatedWord({ note: "cf · 기준 단어: affect" }), true);
  assert.equal(isRelatedWord({ note: "유의어: glad, cheerful" }), false);
});
test("20일 구조를 검증하고 세 학습 범위를 서로 분리한다", () => {
  assert.doesNotThrow(() => validateData(book, extra));
  assert.deepEqual(
    selectWords(words, "textbook", 1).map((w) => w.id),
    ["day-1"],
  );
  assert.deepEqual(
    selectWords(words, "textbook", 2).map((w) => w.id),
    ["day-2"],
  );
  assert.equal(selectWords(words, "textbook", 20).length, 0);
  assert.deepEqual(
    selectWords(words, "extra", 1).map((w) => w.id),
    ["extra-1", "extra-2"],
  );
  assert.equal(selectWords(words, "all", 1).length, 4);
});
test("중복 ID, 잘못된 일차와 필수 데이터 오류를 거부한다", () => {
  for (const exampleMeaning of [undefined, "", "   "]) {
    assert.throws(() => validateData(book, {
      words: [{ id: "missing-translation", word: "test", meaning: "시험", example: "This is a test.", exampleMeaning }],
    }), /예문 전체 해석/);
  }
  assert.throws(
    () => validateData(book, { words: [book.days[0].words[0]] }),
    /중복 ID/,
  );
  assert.throws(() =>
    validateData({ ...book, days: book.days.slice(1) }, extra),
  );
  assert.throws(() =>
    validateData(
      { ...book, days: book.days.map((d) => ({ ...d, day: 1 })) },
      extra,
    ),
  );
  assert.throws(() =>
    validateData(book, { words: [{ id: "bad", word: "", meaning: "뜻" }] }),
  );
  assert.throws(() =>
    validateData(book, {
      words: [{ id: "bad", word: "word", meaning: "뜻", example: 1 }],
    }),
  );
});
test("선택지는 현재 범위만 사용하며 중복 뜻을 제거하고 정답을 포함한다", () => {
  const choices = meaningChoices(words[0], words);
  assert.equal(choices.length, 3);
  assert.equal(choices.filter((c) => c === "사과").length, 1);
  assert.deepEqual(meaningChoices(words[0], [words[0]]), ["사과"]);
  assert.deepEqual(meaningChoices(words[2], selectWords(words, "extra", 1)), [
    "포도",
  ]);
});
test("한 세션은 원본을 수정하지 않고 모든 단어를 한 번씩 포함한다", () => {
  const original = [...words];
  const mixed = shuffle(words, () => 0.2);
  assert.deepEqual(words, original);
  assert.deepEqual(
    [...mixed].sort((a, b) => a.id.localeCompare(b.id)),
    [...words].sort((a, b) => a.id.localeCompare(b.id)),
  );
});
test("브라우저 기록 검증: 손상되거나 잘못된 기록은 거부한다", () => {
  assert.deepEqual(parseProgress(null), {});
  assert.deepEqual(parseProgress('{"day-1":{"correct":2,"attempts":3}}'), {
    "day-1": { correct: 2, attempts: 3 },
  });
  for (const raw of [
    "{",
    "[]",
    '{"a":{"correct":3,"attempts":2}}',
    '{"__proto__":{"correct":0,"attempts":0}}',
  ])
    assert.throws(() => parseProgress(raw));
});
