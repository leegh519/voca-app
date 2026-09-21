import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const words = sqliteTable(
  "words",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    word: text("word").notNull(),
    wordKey: text("word_key").notNull(),
    meaning: text("meaning").notNull(),
    note: text("note"),
    example: text("example").notNull().default(""),
    correctCount: integer("correct_count").notNull().default(0),
    known: integer("known", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(""),
  },
  (table) => [uniqueIndex("words_word_key_unique").on(table.wordKey)],
);
