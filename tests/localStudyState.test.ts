import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureStudyState,
  parseStoredStudyState,
  restoreStudyState,
  sameStudyState,
} from "../src/localStudyState.ts";

function storage(values: Map<string, string>) {
  return {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

test("학습 데이터만 캡처하고 다른 브라우저 데이터는 건드리지 않는다", () => {
  const values = new Map([
    ["voca-app.progress.v1", '{"word":{"correct":1,"attempts":1}}'],
    ["unrelated", "keep"],
  ]);
  Object.defineProperty(globalThis, "localStorage", {
    value: storage(values),
    configurable: true,
  });
  assert.deepEqual(captureStudyState(), {
    version: 1,
    entries: {
      "voca-app.progress.v1": '{"word":{"correct":1,"attempts":1}}',
    },
  });
  restoreStudyState({
    version: 1,
    entries: { "voca-app.navigation.v1": '{"day":2}' },
  });
  assert.equal(values.get("unrelated"), "keep");
  assert.equal(values.has("voca-app.progress.v1"), false);
  assert.equal(values.get("voca-app.navigation.v1"), '{"day":2}');
});

test("클라우드 데이터 형식과 순서에 무관한 동일성을 검증한다", () => {
  const left = {
    version: 1 as const,
    entries: { "voca-app.b": "2", "voca-app.a": "1" },
  };
  const right = {
    version: 1 as const,
    entries: { "voca-app.a": "1", "voca-app.b": "2" },
  };
  assert.equal(sameStudyState(left, right), true);
  assert.deepEqual(parseStoredStudyState(right), right);
  assert.equal(
    parseStoredStudyState({ version: 1, entries: { unsafe: "value" } }),
    null,
  );
});
