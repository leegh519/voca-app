export type GrammarQuestion = {
  id: string;
  before: string;
  underlined: string;
  after: string;
  isCorrect: boolean;
  explanation: string;
  correction?: string;
  source?: string;
};
export type GrammarData = { questions: GrammarQuestion[] };

export function validateGrammar(data: unknown): asserts data is GrammarData {
  if (
    !data ||
    typeof data !== "object" ||
    !("questions" in data) ||
    !Array.isArray(data.questions)
  )
    throw new Error("grammar.json: questions 배열이 필요합니다.");
  const ids = new Set<string>();
  for (const q of data.questions) {
    if (!q || typeof q !== "object")
      throw new Error("문법 문제 형식이 올바르지 않습니다.");
    for (const key of ["id", "underlined", "explanation"]) {
      if (typeof q[key] !== "string" || !q[key].trim())
        throw new Error(`문법 문제: ${key}가 필요합니다.`);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(q.id) || ids.has(q.id))
      throw new Error(`문법 문제 ID가 잘못되었거나 중복되었습니다: ${q.id}`);
    ids.add(q.id);
    for (const key of ["before", "after"])
      if (typeof q[key] !== "string")
        throw new Error(`${q.id}: ${key}는 문자열이어야 합니다.`);
    if (typeof q.isCorrect !== "boolean")
      throw new Error(`${q.id}: isCorrect는 true 또는 false여야 합니다.`);
    if (
      !q.isCorrect &&
      (typeof q.correction !== "string" || !q.correction.trim())
    )
      throw new Error(`${q.id}: 틀린 표현의 수정안(correction)이 필요합니다.`);
    for (const key of ["correction", "source"])
      if (q[key] !== undefined && typeof q[key] !== "string")
        throw new Error(`${q.id}: ${key}는 문자열이어야 합니다.`);
  }
}

export function grammarSentence(q: GrammarQuestion) {
  return q.before + q.underlined + q.after;
}
export function gradeGrammar(q: GrammarQuestion, selected: boolean) {
  return selected === q.isCorrect;
}
// Match the specified range even when the same phrase occurs more than once.
export function splitUnderline(text: string, start: number, end: number) {
  const from = Math.max(0, Math.min(text.length, start));
  const to = Math.max(from, Math.min(text.length, end));
  return [text.slice(0, from), text.slice(from, to), text.slice(to)] as const;
}
