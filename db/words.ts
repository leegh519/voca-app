import { env } from "cloudflare:workers";

export type StoredWord = {
  id: number;
  word: string;
  meaning: string;
  note: string | null;
  example: string;
  correctCount: number;
  known: boolean;
  createdAt: string;
};

function database() {
  if (!env.DB) throw new Error("단어장을 사용할 수 없어. 잠시 뒤 다시 시도해줘.");
  return env.DB;
}

function toWord(row: Record<string, unknown>): StoredWord {
  return {
    id: Number(row.id),
    word: String(row.word),
    meaning: String(row.meaning),
    note: row.note ? String(row.note) : null,
    example: String(row.example ?? ""),
    correctCount: Number(row.correctCount),
    known: Boolean(row.known),
    createdAt: String(row.createdAt),
  };
}

export async function listWords() {
  const result = await database()
    .prepare("SELECT id, word, meaning, note, example, correct_count AS correctCount, known, created_at AS createdAt FROM words ORDER BY id DESC")
    .all<Record<string, unknown>>();
  return result.results.map(toWord);
}

export async function addWord(input: { word: string; meaning: string; note: string; example: string }) {
  const wordKey = input.word.toLocaleLowerCase("en-US");
  const createdAt = new Date().toISOString();
  const db = database();
  await db
    .prepare("INSERT INTO words (word, word_key, meaning, note, example, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(input.word, wordKey, input.meaning, input.note || null, input.example, createdAt)
    .run();
  const result = await db
    .prepare("SELECT id, word, meaning, note, example, correct_count AS correctCount, known, created_at AS createdAt FROM words WHERE word_key = ?")
    .bind(wordKey)
    .first<Record<string, unknown>>();
  if (!result) throw new Error("저장한 단어를 찾을 수 없어.");
  return toWord(result);
}

export async function deleteWord(id: number) {
  return database().prepare("DELETE FROM words WHERE id = ?").bind(id).run();
}

export async function recordCorrectAnswer(id: number) {
  const result = await database()
    .prepare(
      `UPDATE words
       SET correct_count = correct_count + 1,
           known = CASE WHEN correct_count + 1 >= 5 THEN 1 ELSE known END
       WHERE id = ?
       RETURNING id, word, meaning, note, example, correct_count AS correctCount, known, created_at AS createdAt`,
    )
    .bind(id)
    .first<Record<string, unknown>>();
  if (!result) throw new Error("단어를 찾을 수 없어.");
  return toWord(result);
}

export async function setWordExample(id: number, example: string) {
  const result = await database()
    .prepare(
      `UPDATE words
       SET example = ?
       WHERE id = ?
       RETURNING id, word, meaning, note, example, correct_count AS correctCount, known, created_at AS createdAt`,
    )
    .bind(example, id)
    .first<Record<string, unknown>>();
  if (!result) throw new Error("단어를 찾을 수 없어.");
  return toWord(result);
}

export async function resetKnownWords() {
  await database()
    .prepare("UPDATE words SET correct_count = 0, known = 0 WHERE known = 1")
    .run();
}
