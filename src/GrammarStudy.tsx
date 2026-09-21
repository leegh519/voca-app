import { useState } from "react";
import grammar from "../data/grammar.json";
import { gradeGrammar, grammarSentence, validateGrammar } from "./grammar";
import type { GrammarQuestion } from "./grammar";
import { shuffle } from "./vocabulary";
import PagedText from "./PagedText";

validateGrammar(grammar);
const questions: GrammarQuestion[] = grammar.questions;

export default function GrammarStudy() {
  const [queue, setQueue] = useState(() => shuffle(questions));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<GrammarQuestion[]>([]);
  const current = queue[index];
  function restart(items: GrammarQuestion[]) {
    setQueue(shuffle(items));
    setIndex(0);
    setSelected(null);
    setScore(0);
    setMissed([]);
  }
  function answer(value: boolean) {
    if (selected !== null) return;
    setSelected(value);
    if (gradeGrammar(current, value)) setScore((previous) => previous + 1);
    else setMissed((previous) => [...previous, current]);
  }
  if (!questions.length)
    return (
      <div className="empty">
        <span className="empty-icon">O/X</span>
        <h3>문법 문제를 기다리고 있어요</h3>
        <p>
          문장, 밑줄 부분, 정답과 짧은 해설을 보내며
          <br />
          “문법 O/X에 등록해줘”라고 요청하세요.
        </p>
        <small>단어장 일차와 별도로 모든 문법 문제를 학습합니다.</small>
      </div>
    );
  if (!current)
    return (
      <div className="result">
        <span className="eyebrow">GRAMMAR · COMPLETE</span>
        <h3>문법 테스트를 마쳤어요!</h3>
        <p>
          정답 <b>{score}</b> / {queue.length}개
        </p>
        <p className="muted">
          {missed.length
            ? `틀린 ${missed.length}문제를 다시 풀어보세요.`
            : "모든 문제를 맞혔어요."}
        </p>
        <div className="actions">
          {missed.length > 0 && (
            <button className="primary" onClick={() => restart(missed)}>
              틀린 문제만 다시
            </button>
          )}
          <button onClick={() => restart(questions)}>전체 다시 하기</button>
        </div>
      </div>
    );
  const answered = selected !== null;
  const correct = answered && gradeGrammar(current, selected);
  const feedback = [
    `정답: ${current.isCorrect ? "O · 맞는 표현" : "X · 틀린 표현"}`,
    !current.isCorrect ? `${current.underlined} → ${current.correction}` : "",
    `해설\n${current.explanation}`,
    current.source ? `출처: ${current.source}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <div className={`study-body study-grammar ${answered ? "answered" : ""}`}>
      <div className="session-heading">
        <p>밑줄 친 부분이 문법적으로 맞으면 O, 틀리면 X</p>
        <span>
          {index + 1} / {queue.length}
        </span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
      </div>
      <div className="question">
        <span className="eyebrow">GRAMMAR O/X</span>
        <p className="sentence desktop-copy" lang="en">
          {current.before}
          <u className="grammar-underline">{current.underlined}</u>
          {current.after}
        </p>
        <PagedText
          key={current.id}
          text={grammarSentence(current)}
          underline={{
            start: current.before.length,
            end: current.before.length + current.underlined.length,
          }}
        />
      </div>
      <div className="ox">
        <button disabled={answered} onClick={() => answer(true)}>
          <strong>O</strong>맞다
        </button>
        <button disabled={answered} onClick={() => answer(false)}>
          <strong>X</strong>틀리다
        </button>
      </div>
      {answered && (
        <div
          className={`feedback ${correct ? "correct" : "incorrect"}`}
          role="status"
        >
          <div className="desktop-feedback">
            <b>{correct ? "정답이에요!" : "틀렸어요. 해설을 확인해 보세요."}</b>
            <p className="grammar-explanation">{feedback}</p>
          </div>
          <div className="mobile-feedback">
            <strong>
              {correct ? "정답이에요!" : "틀렸어요. 해설을 확인해 보세요."}
            </strong>
            <PagedText text={feedback} />
          </div>
          <button
            className="primary"
            onClick={() => {
              setIndex(index + 1);
              setSelected(null);
            }}
          >
            {index === queue.length - 1 ? "결과 보기" : "다음 문제 →"}
          </button>
        </div>
      )}
      <p className="session-note">
        단어 학습과 별개인 문법 문제 {questions.length}개 · 한 문제씩 무작위
        출제
      </p>
    </div>
  );
}
