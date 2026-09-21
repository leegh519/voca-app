import { validateGrammar } from "../src/grammar.ts";
import { readFileSync } from "node:fs";
import { validateData } from "../src/vocabulary.ts";
const read = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"),
  );
validateData(read("textbook"), read("extra"));
console.log("단어 JSON 검증 완료: 20일 구조, 필수 항목, ID 중복");

validateGrammar(read("grammar"));
console.log("문법 JSON 검증 완료: 밑줄, 정답, 수정안, 해설");
