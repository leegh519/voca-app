export type Word = {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
  note?: string;
  source?: string;
};
export type StudyWord = Word & { group: "textbook" | "extra"; day?: number };
export type Scope = "textbook" | "extra" | "all";
export type Book = { title: string; days: { day: number; words: Word[] }[] };
export type Extra = { words: Word[] };
export type RecordEntry = { correct: number; attempts: number };
export type Progress = Record<string, RecordEntry>;
export type RelatedWordType = "derived" | "synonym" | null;

export function relatedWordType(word: Pick<Word, "note">): RelatedWordType {
  if (word.note?.startsWith("파생어 · 기준 단어:")) return "derived";
  if (word.note?.startsWith("유의어 · 기준 단어:")) return "synonym";
  return null;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function validateData(
  book: unknown,
  extra: unknown,
): asserts book is Book {
  if (
    !object(book) ||
    typeof book.title !== "string" ||
    !book.title.trim() ||
    !Array.isArray(book.days) ||
    book.days.length !== 20
  )
    throw new Error("textbook.json: 제목과 20일치 days가 필요합니다.");
  if (!object(extra) || !Array.isArray(extra.words))
    throw new Error("extra.json: words 배열이 필요합니다.");
  const ids = new Set<string>();
  const days = new Set<number>();
  const checkWords = (words: unknown, location: string) => {
    if (!Array.isArray(words))
      throw new Error(`${location}: words 배열이 필요합니다.`);
    for (const word of words) {
      if (!object(word))
        throw new Error(`${location}: 잘못된 단어 형식입니다.`);
      for (const field of ["id", "word", "meaning"]) {
        if (typeof word[field] !== "string" || !word[field].trim())
          throw new Error(`${location}: ${field}는 빈 문자열일 수 없습니다.`);
      }
      const id = word.id as string;
      if (
        !/^[a-zA-Z0-9_-]+$/.test(id) ||
        ["__proto__", "constructor", "prototype"].includes(id)
      )
        throw new Error(`${location}: 안전한 영문/숫자 ID를 사용하세요.`);
      if (ids.has(id)) throw new Error(`중복 ID: ${id}`);
      ids.add(id);
      for (const field of ["example", "exampleMeaning", "note", "source"]) {
        if (word[field] !== undefined && typeof word[field] !== "string")
          throw new Error(`${id}: ${field}는 문자열이어야 합니다.`);
      }
      if (
        typeof word.example === "string" && word.example.trim() &&
        !(typeof word.exampleMeaning === "string" && word.exampleMeaning.trim())
      )
        throw new Error(`${id}: 예문 전체 해석(exampleMeaning)이 필요합니다.`);
      if (
        word.exampleMeaning &&
        !(typeof word.example === "string" && word.example.trim())
      )
        throw new Error(`${id}: 해석에 대응하는 예문이 필요합니다.`);
    }
  };
  for (const day of book.days) {
    if (
      !object(day) ||
      !Number.isInteger(day.day) ||
      Number(day.day) < 1 ||
      Number(day.day) > 20 ||
      days.has(Number(day.day))
    )
      throw new Error("day는 중복 없이 1~20이어야 합니다.");
    days.add(Number(day.day));
    checkWords(day.words, `Day ${day.day}`);
  }
  checkWords(extra.words, "추가 단어");
}
export function collectWords(book: Book, extra: Extra): StudyWord[] {
  return [
    ...book.days.flatMap((day) =>
      day.words.map((word) => ({
        ...word,
        group: "textbook" as const,
        day: day.day,
      })),
    ),
    ...extra.words.map((word) => ({ ...word, group: "extra" as const })),
  ];
}
export function selectWords(words: StudyWord[], scope: Scope, day: number) {
  return words.filter(
    (word) =>
      scope === "all" ||
      (word.group === scope && (scope === "extra" || word.day === day)),
  );
}
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function meaningChoices(answer: StudyWord, pool: StudyWord[]): string[] {
  const meanings = [...new Set(pool.map((word) => word.meaning.trim()))].filter(
    (meaning) => meaning !== answer.meaning.trim(),
  );
  return shuffle([answer.meaning.trim(), ...shuffle(meanings).slice(0, 3)]);
}
export function parseProgress(raw: string | null): Progress {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!object(parsed)) throw new Error("학습 기록 형식이 올바르지 않습니다.");
  const result: Progress = {};
  for (const [id, entry] of Object.entries(parsed)) {
    if (
      !/^[a-zA-Z0-9_-]+$/.test(id) ||
      ["__proto__", "constructor", "prototype"].includes(id) ||
      !object(entry) ||
      !Number.isInteger(entry.correct) ||
      !Number.isInteger(entry.attempts) ||
      Number(entry.correct) < 0 ||
      Number(entry.attempts) < Number(entry.correct)
    )
      throw new Error("학습 기록 값이 올바르지 않습니다.");
    result[id] = {
      correct: Number(entry.correct),
      attempts: Number(entry.attempts),
    };
  }
  return result;
}
