import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gradeGrammar,
  grammarSentence,
  splitUnderline,
  validateGrammar,
} from "../src/grammar.ts";
const question = {
  id: "grammar-001",
  before: "She ",
  underlined: "go",
  after: " to school every day.",
  isCorrect: false,
  correction: "goes",
  explanation: "주어가 3인칭 단수이고 현재시제이므로 goes를 씁니다.",
};
test("문법 정답 O/X를 실제로 채점하며 밑줄 구간으로 문장을 조립한다", () => {
  validateGrammar({ questions: [question] });
  assert.equal(grammarSentence(question), "She go to school every day.");
  assert.equal(gradeGrammar(question, false), true);
  assert.equal(gradeGrammar(question, true), false);
  assert.equal(gradeGrammar({ ...question, isCorrect: true }, true), true);
  assert.equal(gradeGrammar({ ...question, isCorrect: true }, false), false);
});
test("정답, 밑줄, 해설, 수정안 누락과 ID 중복을 막는다", () => {
  for (const change of [
    { underlined: "" },
    { explanation: " " },
    { correction: undefined },
    { isCorrect: "false" },
    { before: null },
  ]) {
    assert.throws(() =>
      validateGrammar({ questions: [{ ...question, ...change }] }),
    );
  }
  assert.throws(() => validateGrammar({ questions: [question, question] }));
  assert.doesNotThrow(() => validateGrammar({ questions: [] }));
  assert.doesNotThrow(() =>
    validateGrammar({
      questions: [{ ...question, isCorrect: true, correction: undefined }],
    }),
  );
});
test("중복 표현과 페이지 경계에서도 지정한 위치에만 밑줄을 표시한다", () => {
  assert.deepEqual(splitUnderline("go then go", 8, 10), ["go then ", "go", ""]);
  assert.deepEqual(splitUnderline("before", 10, 12), ["before", "", ""]);
  assert.deepEqual(splitUnderline("after", -8, -2), ["", "", "after"]);
  assert.deepEqual(splitUnderline("first half", 6, 20), ["first ", "half", ""]);
  assert.deepEqual(splitUnderline("second half", -4, 6), [
    "",
    "second",
    " half",
  ]);
});
