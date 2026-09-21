"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, CircleCheckBig, Layers3, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Word = { id: number; word: string; meaning: string; note: string | null; example: string; correctCount: number; known: boolean; createdAt: string };
type QuizMode = "meaning-to-word" | "word-to-meaning";
type Quiz = { answer: Word; choices: Word[] } | null;
const randomize = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export default function Home() {
  const [words, setWords] = useState<Word[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>("meaning-to-word");
  const [quiz, setQuiz] = useState<Quiz>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [masteredNow, setMasteredNow] = useState(false);
  const [exampleWord, setExampleWord] = useState<Word | null>(null);
  const [exampleResult, setExampleResult] = useState<"known" | "unknown" | null>(null);
  const currentCard = words.length ? words[cardIndex % words.length] : null;
  const learningWords = useMemo(() => words.filter((item) => !item.known), [words]);
  const knownWords = useMemo(() => words.filter((item) => item.known), [words]);
  const exampleWords = useMemo(() => learningWords.filter((item) => item.example), [learningWords]);

  const loadWords = useCallback(async () => {
    try {
      const response = await fetch("/api/words", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setWords(payload.words);
    } catch {
      setStatus("단어장을 불러오지 못했어. 잠시 뒤 다시 시도해줘.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadWords(); }, [loadWords]);

  const createWord = useCallback(async (input: { word: string; meaning: string; note?: string; example?: string }) => {
    const nextWord = input.word.trim();
    const nextMeaning = input.meaning.trim();
    if (!nextWord || !nextMeaning) { setStatus("영단어와 뜻을 모두 입력해줘."); return null; }
    try {
      const response = await fetch("/api/words", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word: nextWord, meaning: nextMeaning, note: input.note?.trim() ?? "", example: input.example?.trim() ?? "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setWords((previous) => [payload.word, ...previous]);
      setCardIndex(0); setFlipped(false);
      setStatus(`‘${payload.word.word}’ 추가 완료`);
      return payload.word as Word;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "저장하지 못했어.");
      return null;
    }
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "add_vocabulary",
      title: "단어장에 단어 추가",
      description: "공무원 영어 단어장에 영단어와 뜻을 저장합니다.",
      inputSchema: {
        type: "object",
        properties: {
          word: { type: "string", description: "추가할 영단어" },
          meaning: { type: "string", description: "한국어 뜻" },
          note: { type: "string", description: "선택 메모" },
          example: { type: "string", description: "단어가 포함된 짧고 쉬운 영어 예문" },
        },
        required: ["word", "meaning"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const value = input as { word?: string; meaning?: string; note?: string; example?: string };
        const saved = await createWord({ word: value.word ?? "", meaning: value.meaning ?? "", note: value.note ?? "", example: value.example ?? "" });
        if (!saved) throw new Error("단어 저장에 실패했습니다.");
        return { id: saved.id, word: saved.word, meaning: saved.meaning };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [createWord]);

  const startQuiz = useCallback((mode = quizMode) => {
    if (learningWords.length < 4) { setQuiz(null); setStatus("학습 중인 단어가 4개 이상일 때 시작할 수 있어."); return; }
    const answer = learningWords[Math.floor(Math.random() * learningWords.length)];
    const wrong = randomize(learningWords.filter((item) => item.id !== answer.id)).slice(0, 3);
    setQuiz({ answer, choices: randomize([answer, ...wrong]) });
    setSelected(null); setMasteredNow(false); setQuizMode(mode); setStatus("");
  }, [quizMode, learningWords]);

  const quizPrompt = useMemo(() => !quiz ? "" : quizMode === "meaning-to-word" ? quiz.answer.meaning : quiz.answer.word, [quiz, quizMode]);

  const startExampleQuiz = useCallback(() => {
    if (!exampleWords.length) { setExampleWord(null); setStatus("예문이 있는 학습 단어가 없어."); return; }
    const candidates = exampleWords.length > 1 && exampleWord ? exampleWords.filter((item) => item.id !== exampleWord.id) : exampleWords;
    setExampleWord(candidates[Math.floor(Math.random() * candidates.length)]);
    setExampleResult(null);
    setMasteredNow(false);
    setStatus("");
  }, [exampleWord, exampleWords]);

  async function removeWord(id: number) {
    const removed = words.find((item) => item.id === id);
    try {
      const response = await fetch(`/api/words?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setWords((previous) => previous.filter((item) => item.id !== id));
      setStatus(removed ? `‘${removed.word}’ 삭제됨` : "삭제됨");
    } catch { setStatus("삭제하지 못했어."); }
  }

  async function selectAnswer(choice: Word) {
    if (!quiz || selected !== null) return;
    setSelected(choice.id);
    setMasteredNow(false);
    if (choice.id !== quiz.answer.id) return;

    try {
      const response = await fetch(`/api/words?id=${quiz.answer.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "correct" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const updated = payload.word as Word;
      setWords((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      setMasteredNow(updated.known);
    } catch {
      setStatus("정답 기록을 저장하지 못했어.");
    }
  }

  async function judgeExample(knows: boolean) {
    if (!exampleWord || exampleResult) return;
    if (!knows) { setExampleResult("unknown"); return; }
    try {
      const response = await fetch(`/api/words?id=${exampleWord.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "correct" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const updated = payload.word as Word;
      setWords((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      const remaining = exampleWords.filter((item) => item.id !== updated.id);
      if (remaining.length) {
        setExampleWord(remaining[Math.floor(Math.random() * remaining.length)]);
        setExampleResult(null);
        setMasteredNow(false);
      } else {
        setExampleWord(null);
        setExampleResult(null);
        setStatus("예문 테스트를 모두 마쳤어.");
      }
    } catch {
      setStatus("학습 기록을 저장하지 못했어.");
    }
  }

  async function resetKnown() {
    if (!knownWords.length) return;
    try {
      const response = await fetch("/api/words", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reset-known" }),
      });
      if (!response.ok) throw new Error();
      const resetCount = knownWords.length;
      setWords((previous) => previous.map((item) => item.known ? { ...item, correctCount: 0, known: false } : item));
      setQuiz(null); setSelected(null); setMasteredNow(false);
      setExampleWord(null); setExampleResult(null);
      setStatus(`아는 단어 ${resetCount}개를 학습 대상으로 되돌렸어.`);
    } catch {
      setStatus("아는 단어를 초기화하지 못했어.");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f6f2] text-[#18243a]">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-8 sm:py-8">
        <header className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#152b53] text-[#f6c85f] shadow-lg shadow-[#152b53]/20 sm:size-11 sm:rounded-2xl"><BookOpen className="size-5" /></div>
            <div className="min-w-0"><h1 className="truncate font-[Georgia] text-lg font-bold tracking-tight sm:text-xl">공무원 영어 단어장</h1><p className="text-xs text-slate-500 sm:text-sm">넘기고 · 맞히기</p></div>
          </div>
          <div className="shrink-0 rounded-full border border-[#e1dccf] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3c4d69] sm:px-3 sm:text-sm">{loading ? "불러오는 중" : `${words.length} 단어`}</div>
        </header>
        {status && <p className="mb-4 rounded-xl bg-[#fff4d3] px-4 py-3 text-sm font-medium text-[#735200]" role="status">{status}</p>}

        <Tabs defaultValue="cards" className="min-w-0 gap-4 sm:gap-5">
          <TabsList className="grid h-auto w-full grid-cols-4 bg-[#e8e4da] p-1">
            <TabsTrigger value="cards" className="min-w-0 px-0.5 py-2.5 text-[11px] sm:px-4 sm:text-sm"><Layers3 className="hidden sm:block" /> 플래시카드</TabsTrigger>
            <TabsTrigger value="quiz" className="min-w-0 px-0.5 py-2.5 text-[11px] sm:px-4 sm:text-sm"><Check className="hidden sm:block" /> 4지선다</TabsTrigger>
            <TabsTrigger value="example" className="min-w-0 px-0.5 py-2.5 text-[11px] sm:px-4 sm:text-sm"><CircleCheckBig className="hidden sm:block" /> 예문 O/X</TabsTrigger>
            <TabsTrigger value="list" className="min-w-0 px-0.5 py-2.5 text-[11px] sm:px-4 sm:text-sm"><BookOpen className="hidden sm:block" /> 단어 목록</TabsTrigger>
          </TabsList>
          <TabsContent value="cards">
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 rounded-2xl border border-[#e1dccf] bg-white p-3 shadow-sm sm:rounded-3xl sm:p-7">
                {currentCard ? <><button type="button" onClick={() => setFlipped((value) => !value)} className="group flex min-h-60 w-full min-w-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d7d2c6] bg-[#fbfaf7] px-4 py-6 text-center transition hover:border-[#f6c85f] focus-visible:outline-3 focus-visible:outline-[#f6c85f] sm:min-h-72 sm:px-6" aria-label="카드를 뒤집어 뜻 보기">
                  <span className="mb-4 rounded-full bg-[#e9eef7] px-3 py-1 text-xs font-bold tracking-wide text-[#315486] sm:mb-5">{flipped ? "뜻" : "WORD"}</span>
                  <strong className={flipped ? "max-w-full break-words text-2xl leading-relaxed sm:text-4xl" : "max-w-full break-words font-[Georgia] text-[clamp(2rem,11vw,3.75rem)] leading-tight"}>{flipped ? currentCard.meaning : currentCard.word}</strong>
                  {flipped && currentCard.note && <span className="mt-5 text-sm text-slate-500">{currentCard.note}</span>}
                  <span className="mt-6 text-sm text-slate-400 group-hover:text-[#315486] sm:mt-8">눌러서 뒤집기</span>
                </button><div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between"><span className="text-center text-sm text-slate-500 sm:text-left">{cardIndex % words.length + 1} / {words.length}</span><div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button className="w-full" variant="outline" onClick={() => { setCardIndex((value) => (value - 1 + words.length) % words.length); setFlipped(false); }}><RotateCcw /> 이전</Button>
                  <Button className="w-full" onClick={() => { setCardIndex((value) => (value + 1) % words.length); setFlipped(false); }}>다음 <ChevronRight /></Button>
                </div></div></> : <EmptyStudy title="첫 단어를 추가해줘" detail="채팅에서 단어를 추가하면 카드가 여기서 시작돼." />}
              </div>
              <aside className="rounded-2xl border border-[#e1dccf] bg-[#fffdf8] p-5 sm:rounded-3xl sm:p-6"><p className="text-sm font-bold text-[#315486]">카드 공부법</p><ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600 sm:mt-4 sm:space-y-4"><li><b className="mr-2 text-[#152b53]">01</b>영단어를 보고 뜻을 먼저 떠올려.</li><li><b className="mr-2 text-[#152b53]">02</b>카드를 눌러 바로 확인해.</li><li><b className="mr-2 text-[#152b53]">03</b>헷갈리면 다시 넘겨서 복습해.</li></ol></aside>
            </section>
          </TabsContent>
          <TabsContent value="quiz">
            <section className="mx-auto min-w-0 max-w-3xl rounded-2xl border border-[#e1dccf] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
              <div className="mb-3 grid gap-3 sm:mb-7 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-4"><div><div className="hidden sm:block"><p className="text-sm font-bold text-[#315486]">양방향 테스트</p><h2 className="mt-1 text-2xl font-bold">4지선다로 확인하기</h2></div><p className="text-sm text-slate-500 sm:mt-1">학습 중 {learningWords.length}개 · 아는 단어 {knownWords.length}개</p></div><div className="grid gap-2">
                <div className="grid grid-cols-2 rounded-xl bg-[#eef1f5] p-1 text-sm font-semibold">
                  <button type="button" onClick={() => startQuiz("meaning-to-word")} className={quizMode === "meaning-to-word" ? "rounded-lg bg-white px-2 py-2.5 text-[#152b53] shadow-sm sm:px-3" : "px-2 py-2.5 text-slate-500 sm:px-3"}>뜻 → 단어</button>
                  <button type="button" onClick={() => startQuiz("word-to-meaning")} className={quizMode === "word-to-meaning" ? "rounded-lg bg-white px-2 py-2.5 text-[#152b53] shadow-sm sm:px-3" : "px-2 py-2.5 text-slate-500 sm:px-3"}>단어 → 뜻</button>
                </div>
                <Button variant="outline" disabled={!knownWords.length} onClick={() => void resetKnown()}><RotateCcw /> 아는 단어 초기화</Button>
              </div></div>
              {quiz ? <div><div className="min-w-0 rounded-2xl bg-[#f7f6f2] px-4 py-6 text-center sm:px-5 sm:py-7"><p className="text-sm font-medium text-slate-500">{quizMode === "meaning-to-word" ? "이 뜻에 맞는 단어는?" : "이 단어의 뜻은?"}</p><p className={quizMode === "meaning-to-word" ? "mt-3 break-words text-2xl font-bold sm:text-3xl" : "mt-3 break-words font-[Georgia] text-3xl font-bold sm:text-4xl"}>{quizPrompt}</p></div>
                <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2">{quiz.choices.map((choice, index) => { const isAnswer = choice.id === quiz.answer.id; const isSelected = choice.id === selected; const reveal = selected !== null; return <button key={choice.id} type="button" onClick={() => void selectAnswer(choice)} disabled={reveal} className={`min-w-0 break-words rounded-xl border px-3 py-3.5 text-left text-base font-semibold transition sm:px-4 sm:py-4 ${reveal && isAnswer ? "border-[#58a16d] bg-[#eaf7ec] text-[#27683a]" : reveal && isSelected ? "border-red-300 bg-red-50 text-red-700" : "border-[#ded9cc] hover:border-[#315486] hover:bg-[#f5f8fc]"}`}><span className="mr-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs sm:mr-3">{index + 1}</span>{quizMode === "meaning-to-word" ? choice.word : choice.meaning}</button>; })}</div>
                {selected !== null && <div className="mt-5 flex flex-col gap-3 rounded-xl bg-[#f7f6f2] p-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between"><span className="break-words text-sm font-medium">{selected === quiz.answer.id ? (masteredNow ? "정답! 아는 단어로 이동했어." : "정답!") : `정답: ${quizMode === "meaning-to-word" ? quiz.answer.word : quiz.answer.meaning}`}</span><Button className="w-full sm:w-auto" onClick={() => startQuiz()}><RefreshCw /> 다음 문제</Button></div>}
              </div> : <EmptyStudy title={learningWords.length < 4 ? "학습할 단어 4개가 필요해" : "테스트를 시작해볼까?"} detail={learningWords.length < 4 ? `학습 중 ${learningWords.length}개 · 아는 단어는 테스트에서 제외돼.` : "원하는 방향을 누르면 문제를 낼게."} />}
            </section>
          </TabsContent>
          <TabsContent value="example">
            <section className="mx-auto min-w-0 max-w-3xl rounded-2xl border border-[#e1dccf] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
              <div className="mb-3 flex flex-col gap-2 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-3"><div><div className="hidden sm:block"><p className="text-sm font-bold text-[#315486]">예문 테스트</p><h2 className="mt-1 text-2xl font-bold">문장에서 뜻 떠올리기</h2></div><p className="text-sm text-slate-500 sm:mt-1">밑줄 친 단어의 뜻을 알면 O, 모르면 X</p></div><Button variant="outline" disabled={!knownWords.length} onClick={() => void resetKnown()}><RotateCcw /> 아는 단어 초기화</Button></div>
              {exampleWord ? <div>
                <div className="rounded-2xl bg-[#f7f6f2] px-4 py-8 text-center sm:px-8 sm:py-12"><p className="text-lg font-semibold leading-8 text-[#18243a] sm:text-2xl sm:leading-10"><UnderlinedSentence sentence={exampleWord.example} word={exampleWord.word} /></p></div>
                {!exampleResult ? <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5">
                  <Button className="h-14 bg-[#39724a] text-xl font-bold hover:bg-[#2f613e]" onClick={() => void judgeExample(true)}>O</Button>
                  <Button className="h-14 border-red-200 bg-red-50 text-xl font-bold text-red-700 hover:bg-red-100" variant="outline" onClick={() => void judgeExample(false)}>X</Button>
                </div> : <div className={`mt-5 rounded-2xl p-4 sm:mt-6 ${exampleResult === "unknown" ? "bg-[#fff4d3]" : "bg-[#eaf7ec]"}`}>
                  <p className="text-sm font-bold text-slate-500">{exampleResult === "unknown" ? "정답" : masteredNow ? "아는 단어로 이동했어" : "알고 있는 단어"}</p>
                  <p className="mt-1 break-words text-lg font-bold">{exampleWord.word} · {exampleWord.meaning}</p>
                  <Button className="mt-4 w-full sm:w-auto" onClick={startExampleQuiz}><RefreshCw /> 다음 문제</Button>
                </div>}
              </div> : <EmptyStudy title="예문 테스트를 시작해볼까?" detail={`예문이 있는 학습 단어 ${exampleWords.length}개`} />}
              {!exampleWord && exampleWords.length > 0 && <Button className="mt-4 w-full" onClick={startExampleQuiz}>시작하기</Button>}
            </section>
          </TabsContent>
          <TabsContent value="list">
            <section className="rounded-2xl border border-[#e1dccf] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7"><div className="mb-4 flex items-center justify-between sm:mb-5"><div><p className="text-sm font-bold text-[#315486]">전체 단어</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">내 단어 목록</h2></div><span className="shrink-0 text-sm text-slate-500">{words.length}개</span></div>
              {words.length ? <div className="space-y-6">
                <div><h3 className="mb-3 text-sm font-bold text-[#315486]">학습 중 · {learningWords.length}개</h3><WordGrid words={learningWords} onRemove={removeWord} /></div>
                {knownWords.length > 0 && <div><h3 className="mb-3 text-sm font-bold text-[#39724a]">아는 단어 · {knownWords.length}개</h3><WordGrid words={knownWords} onRemove={removeWord} known /></div>}
              </div> : <EmptyStudy title="아직 단어가 없어" detail="채팅에서 단어를 추가하면 여기에 모여." />}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function EmptyStudy({ title, detail }: { title: string; detail: string }) {
  return <div className="grid min-h-52 place-items-center rounded-2xl bg-[#f7f6f2] px-6 text-center"><div><p className="text-lg font-bold">{title}</p><p className="mt-2 text-sm text-slate-500">{detail}</p></div></div>;
}

function UnderlinedSentence({ sentence, word }: { sentence: string; word: string }) {
  const index = sentence.toLocaleLowerCase("en-US").indexOf(word.toLocaleLowerCase("en-US"));
  if (index < 0) return <>{sentence}</>;
  return <>{sentence.slice(0, index)}<u className="decoration-2 decoration-[#d29d22] underline-offset-4">{sentence.slice(index, index + word.length)}</u>{sentence.slice(index + word.length)}</>;
}

function WordGrid({ words, onRemove, known = false }: { words: Word[]; onRemove: (id: number) => Promise<void>; known?: boolean }) {
  if (!words.length) return <p className="rounded-xl bg-[#f7f6f2] px-4 py-5 text-center text-sm text-slate-500">해당 단어가 없어.</p>;
  return <ul className="grid gap-3 sm:grid-cols-2">{words.map((item) => <li key={item.id} className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#e8e4da] px-3 py-3 sm:px-4"><span className={`grid size-9 shrink-0 place-items-center rounded-xl font-[Georgia] font-bold ${known ? "bg-[#eaf7ec] text-[#39724a]" : "bg-[#e9eef7] text-[#315486]"}`}>{item.word.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="break-words font-[Georgia] text-lg font-bold leading-snug">{item.word}</p><p className="mt-0.5 break-words text-sm leading-relaxed text-slate-500">{item.meaning}{item.note ? ` · ${item.note}` : ""}</p>{!known && <p className="mt-1 text-xs text-slate-400">정답 {item.correctCount}/5</p>}</div><Button className="shrink-0" variant="ghost" size="icon-sm" aria-label={`${item.word} 삭제`} onClick={() => void onRemove(item.id)}><Trash2 className="text-slate-400" /></Button></li>)}</ul>;
}
