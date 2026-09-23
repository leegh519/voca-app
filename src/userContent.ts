import { validateGrammar } from "./grammar.ts";
import type { GrammarData } from "./grammar";
import { notifyStudyStateChanged } from "./localStudyState.ts";
import { validateData } from "./vocabulary.ts";
import type { Book, Extra } from "./vocabulary";

export const USER_EXTRA_WORDS_KEY = "voca-app.extra-words.v1";
export const USER_GRAMMAR_QUESTIONS_KEY = "voca-app.grammar-questions.v1";

export type UserContent = { extra: Extra; grammar: GrammarData };

function read(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

export function loadUserContent(
  textbook: Book,
  defaultExtra: Extra,
  defaultGrammar: GrammarData,
): UserContent {
  const savedExtra = read(USER_EXTRA_WORDS_KEY);
  const savedGrammar = read(USER_GRAMMAR_QUESTIONS_KEY);
  let extra = defaultExtra;
  let grammar = defaultGrammar;
  try {
    if (savedExtra !== null) {
      validateData(textbook, savedExtra);
      extra = savedExtra as Extra;
    }
  } catch {
    // Invalid synced content falls back to the bundled starter data.
  }
  try {
    if (savedGrammar !== null) {
      validateGrammar(savedGrammar);
      grammar = savedGrammar;
    }
  } catch {
    // Invalid synced content falls back to the bundled starter data.
  }
  return { extra, grammar };
}

export function saveUserContent(content: UserContent) {
  try {
    localStorage.setItem(USER_EXTRA_WORDS_KEY, JSON.stringify(content.extra));
    localStorage.setItem(
      USER_GRAMMAR_QUESTIONS_KEY,
      JSON.stringify(content.grammar),
    );
    notifyStudyStateChanged();
  } catch {
    // The current content remains usable when browser storage is unavailable.
  }
}
