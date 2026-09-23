import PagedText from "./PagedText";
import GrammarStudy from "./GrammarStudy";
import CloudSync from "./CloudSync";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  loadKnownWordIds,
  loadBookmarkedWordIds,
  loadNavigation,
  loadWordListPreferences,
  loadWordSession,
  saveNavigation,
  saveKnownWordIds,
  saveBookmarkedWordIds,
  saveWordListPreferences,
  saveWordSession,
  wordSessionKey,
} from "./studySession";
import type { Mode, Section } from "./studySession";
import textbook from "../data/textbook.json";
import extra from "../data/extra.json";
import grammar from "../data/grammar.json";
import { validateGrammar } from "./grammar";
import {
  collectWords,
  meaningChoices,
  parseProgress,
  selectWords,
  shuffle,
  isRelatedWord,
  validateData,
} from "./vocabulary";
import type { Progress, Scope, StudyWord } from "./vocabulary";
import { notifyStudyStateChanged } from "./localStudyState";
import { loadUserContent } from "./userContent";
import type { UserContent } from "./userContent";

validateData(textbook, extra);
validateGrammar(grammar);
const STORAGE_KEY = "voca-app.progress.v1";
const modes: { id: Mode; label: string; icon: string }[] = [
  { id: "cards", label: "플래시카드", icon: "▱" },
  { id: "meaning", label: "단어 → 뜻", icon: "✓" },
  { id: "example", label: "예문 O/X", icon: "◎" },
  { id: "list", label: "단어 목록", icon: "☷" },
];
function readSaved() {
  try {
    return {
      progress: parseProgress(localStorage.getItem(STORAGE_KEY)),
      warning: "",
    };
  } catch {
    return {
      progress: {},
      warning:
        "저장된 학습 기록을 읽지 못했습니다. 이번 학습은 계속할 수 있습니다.",
    };
  }
}

export default function App() {
  const [navigation] = useState(loadNavigation);
  const [section, setSection] = useState<Section>(navigation.section);
  const isGrammar = section === "grammar";
  const scope: Scope =
    section === "textbook" || section === "extra" || section === "bookmarks"
      ? section
      : "textbook";
  const [day, setDay] = useState(navigation.day);
  const [mode, setMode] = useState<Mode>(navigation.mode);
  useEffect(() => saveNavigation({ section, day, mode }), [section, day, mode]);
  const [saved] = useState(readSaved);
  const [progress, setProgress] = useState<Progress>(saved.progress);
  const [userContent, setUserContent] = useState<UserContent>({ extra, grammar });
  function handleSyncReady(signedIn: boolean) {
    const content = signedIn
      ? loadUserContent(textbook, extra, grammar)
      : { extra, grammar };
    const contentWords = collectWords(textbook, content.extra);
    setUserContent(content);
    setKnownIds(loadKnownWordIds(contentWords));
    setBookmarkedIds(loadBookmarkedWordIds(contentWords));
  }
  const allWords = useMemo(
    () => collectWords(textbook, userContent.extra),
    [userContent.extra],
  );
  const [knownIds, setKnownIds] = useState(() => loadKnownWordIds(allWords));
  useEffect(() => saveKnownWordIds(knownIds), [knownIds]);
  const [bookmarkedIds, setBookmarkedIds] = useState(() =>
    loadBookmarkedWordIds(allWords),
  );
  useEffect(() => saveBookmarkedWordIds(bookmarkedIds), [bookmarkedIds]);
  const [warning, setWarning] = useState(saved.warning);
  const [wordListPreferences, setWordListPreferences] = useState(
    loadWordListPreferences,
  );
  const { showRelated } = wordListPreferences;
  useEffect(
    () => saveWordListPreferences(wordListPreferences),
    [wordListPreferences],
  );
  const selectedWords = useMemo(
    () =>
      scope === "bookmarks"
        ? allWords.filter((word) => bookmarkedIds.includes(word.id))
        : selectWords(allWords, scope, day),
    [allWords, bookmarkedIds, scope, day],
  );
  const words = useMemo(
    () =>
      showRelated || scope === "bookmarks"
        ? selectedWords
        : selectedWords.filter((word) => !isRelatedWord(word)),
    [selectedWords, showRelated],
  );
  const label = isGrammar
    ? "문법 O/X"
    : scope === "textbook"
      ? `DAY ${String(day).padStart(2, "0")}`
      : scope === "extra"
        ? "추가 단어"
        : "북마크 단어";
  const practiced = words.filter(
    (word) => progress[word.id]?.attempts > 0,
  ).length;
  function record(word: StudyWord, correct: boolean) {
    const previous = progress[word.id] ?? { correct: 0, attempts: 0 };
    const next = {
      ...progress,
      [word.id]: {
        attempts: previous.attempts + 1,
        correct: previous.correct + Number(correct),
      },
    };
    setProgress(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      notifyStudyStateChanged();
    } catch {
      setWarning(
        "브라우저 저장 공간을 사용할 수 없어 새로고침하면 이번 학습 기록이 사라집니다.",
      );
    }
  }
  return (
    <main className={`shell ${isGrammar ? "section-grammar" : `mode-${mode}`}`}>
      <header className="header">
        <div className="brand">
          <img
            className="brand-icon"
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            width={40}
            height={40}
          />
          <div>
            <h1>하루 단어</h1>
            <p>공무원 영어 · 매일 쌓이는 나의 단어장</p>
          </div>
        </div>
        <span className="total">총 {allWords.length}단어</span>
      </header>
      <CloudSync onSyncReady={handleSyncReady} />
      <div className="mobile-controls">
        <label>
          학습
          <select
            aria-label="학습 섹션"
            value={section}
            onChange={(event) => setSection(event.target.value as Section)}
          >
            <option value="textbook">20일 단어장</option>
            <option value="extra">추가 단어</option>
            <option value="bookmarks">북마크 단어</option>
            <option value="grammar">문법</option>
          </select>
        </label>
        {isGrammar ? (
          <span className="mobile-count">{userContent.grammar.questions.length}문제</span>
        ) : scope === "textbook" ? (
          <label>
            일차
            <select
              aria-label="일차"
              value={day}
              onChange={(event) => setDay(Number(event.target.value))}
            >
              {textbook.days.map((item) => (
                <option key={item.day} value={item.day}>
                  DAY {String(item.day).padStart(2, "0")} · {item.words.length}
                  단어
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="mobile-count">
            {words.length}단어 · 학습 {practiced}개
          </span>
        )}
      </div>
      <section className="intro">
        <span className="eyebrow">MY VOCABULARY</span>
        <h2>
          오늘의 단어가,
          <br className="mobile-break" /> 내일의 실력이 되도록.
        </h2>
        <p>책은 하루씩 차근차근, 새로 만난 단어는 따로 모아서.</p>
      </section>
      <nav className="scope-nav" aria-label="학습 섹션 선택">
        {(
          [
            {
              id: "textbook",
              name: "20일 단어장",
              detail: "책으로 익히는 매일의 단어",
            },
            {
              id: "extra",
              name: "추가 단어",
              detail: "하프모의고사 · 새로 만난 단어",
            },
            {
              id: "bookmarks",
              name: "북마크 단어",
              detail: "따로 모아 반복할 단어",
            },
            {
              id: "grammar",
              name: "문법",
              detail: "밑줄 친 부분 문법 O/X",
            },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={section === item.id}
            className={section === item.id ? "scope active" : "scope"}
            onClick={() => setSection(item.id)}
          >
            <strong>{item.name}</strong>
            <span>{item.detail}</span>
          </button>
        ))}
      </nav>
      {section === "textbook" && (
        <section className="day-section" aria-label="학습 일차 선택">
          <div className="section-caption">
            <h3>{textbook.title}</h3>
            <span>공부할 일차를 선택하세요</span>
          </div>
          <div className="days">
            {textbook.days.map((item) => (
              <button
                key={item.day}
                className={day === item.day ? "day active" : "day"}
                aria-pressed={day === item.day}
                onClick={() => setDay(item.day)}
              >
                <strong>DAY {String(item.day).padStart(2, "0")}</strong>
                <span>{item.words.length}단어</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="workspace">
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">{label}</span>
            <h2>
              {isGrammar
                ? "헷갈리는 문법, 확실하게."
                : scope === "textbook"
                  ? "하루만큼, 확실하게."
                  : scope === "extra"
                    ? "새로 만난 단어를 내 것으로."
                  : "따로 모은 단어, 한자리에."}
            </h2>
          </div>
          {isGrammar ? (
            <div className="scope-count">
              <b>{userContent.grammar.questions.length}</b> 문제
            </div>
          ) : (
            <div className="scope-count">
              <b>{words.length}</b> 단어
              <span>학습해 본 단어 {practiced}개</span>
            </div>
          )}
        </div>
        {!isGrammar && (
          <>
            <div className="word-filters study-filters" aria-label="관련 단어 표시">
              <span>학습에 연관 단어 포함</span>
              <button
                type="button"
                className={showRelated ? "active" : ""}
                aria-pressed={showRelated}
                onClick={() =>
                  setWordListPreferences((value) => ({
                    ...value,
                    showRelated: !value.showRelated,
                  }))
                }
              >
                연관단어
              </button>
            </div>
            <div className="mode-nav" role="tablist" aria-label="학습 방식">
              {modes.map((item) => (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  role="tab"
                  aria-selected={mode === item.id}
                  aria-controls="study-panel"
                  className={mode === item.id ? "active" : ""}
                  onClick={() => setMode(item.id)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
        {warning && (
          <p className="warning" role="status">
            {warning}
          </p>
        )}
        {isGrammar ? (
          <div id="study-panel">
            <GrammarStudy questions={userContent.grammar.questions} />
          </div>
        ) : (
          <div id="study-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
            {!words.length ? (
              <div className="empty">
                <span className="empty-icon">Aa</span>
                <h3>
                  {scope === "textbook"
                    ? `${day}일차 단어를 기다리고 있어요`
                    : scope === "extra"
                      ? "새로 만난 단어를 모아보세요"
                      : "북마크한 단어가 없어요"}
                </h3>
                <p>
                  {scope === "textbook"
                    ? "책의 단어를 보내며 “이 단어들을 " +
                      day +
                      "일차에 등록해줘”라고 요청하세요."
                    : scope === "extra"
                      ? "“하프모의고사 추가 단어로 등록해줘”라고 단어를 보내주세요."
                      : "플래시카드나 단어 목록에서 북마크를 추가해 보세요."}
                </p>
                <small>
                  등록한 단어로 플래시카드와 테스트를 바로 시작할 수 있어요.
                </small>
              </div>
            ) : (
              <Study
                key={`${scope}-${day}-${mode}-${showRelated}-${words.map((word) => word.id).join(",")}`}
                words={words}
                section={scope}
                day={day}
                mode={mode}
                progress={progress}
                record={record}
                knownIds={knownIds}
                setKnownIds={setKnownIds}
                bookmarkedIds={bookmarkedIds}
                setBookmarkedIds={setBookmarkedIds}
              />
            )}
          </div>
        )}
      </section>
      <footer>
        <span>조금씩, 꾸준히. 오늘도 한 걸음.</span>
        <p>
          단어는 JSON 파일로 관리하며, 로그인하면 학습 기록이 기기 간 동기화됩니다.
        </p>
      </footer>
    </main>
  );
}
function Study({
  words,
  section,
  day,
  mode,
  progress,
  record,
  knownIds,
  setKnownIds,
  bookmarkedIds,
  setBookmarkedIds,
}: {
  words: StudyWord[];
  section: Scope;
  day: number;
  mode: Mode;
  progress: Progress;
  record: (word: StudyWord, correct: boolean) => void;
  knownIds: string[];
  setKnownIds: Dispatch<SetStateAction<string[]>>;
  bookmarkedIds: string[];
  setBookmarkedIds: Dispatch<SetStateAction<string[]>>;
}) {
  const [initial] = useState(() =>
    loadWordSession(wordSessionKey(section, day, mode), words, mode),
  );
  const [queue, setQueue] = useState(
    () =>
      initial?.queue ??
      (mode === "cards" || mode === "list"
        ? words
        : shuffle(
            mode === "example"
              ? words.filter((word) => word.example?.trim())
              : words,
          )),
  );
  const [index, setIndex] = useState(initial?.index ?? 0);
  const [flipped, setFlipped] = useState(initial?.flipped ?? false);
  const [answer, setAnswer] = useState<boolean | null>(initial?.answer ?? null);
  const [selected, setSelected] = useState<string | null>(
    initial?.selected ?? null,
  );
  const [missed, setMissed] = useState<StudyWord[]>(initial?.missed ?? []);
  const [score, setScore] = useState(initial?.score ?? 0);
  const [choices, setChoices] = useState(
    () => initial?.choices ?? (queue[0] ? meaningChoices(queue[0], words) : []),
  );
  const [search, setSearch] = useState(initial?.search ?? "");
  useEffect(() => {
    if (!initial?.knownIds.length) return;
    setKnownIds((previous) => [...new Set([...previous, ...initial.knownIds])]);
  }, [initial, setKnownIds]);
  const knownWords = new Set(knownIds);
  const bookmarkedWords = new Set(bookmarkedIds);
  const sessionKey = wordSessionKey(section, day, mode);
  useEffect(
    () =>
      saveWordSession(sessionKey, words, {
        queue,
        index,
        flipped,
        answer,
        selected,
        missed,
        score,
        choices,
        search,
        knownIds,
      }),
    [
      sessionKey,
      words,
      queue,
      index,
      flipped,
      answer,
      selected,
      missed,
      score,
      choices,
      search,
      knownIds,
    ],
  );
  const current = queue[index];
  function restart(items: StudyWord[]) {
    const next = shuffle(items);
    setQueue(next);
    setIndex(0);
    setFlipped(false);
    setAnswer(null);
    setSelected(null);
    setMissed([]);
    setScore(0);
    setChoices(next[0] ? meaningChoices(next[0], words) : []);
  }
  function submit(correct: boolean, choice?: string) {
    if (answer !== null) return;
    setAnswer(correct);
    setSelected(choice ?? null);
    record(current, correct);
    if (correct) setScore((value) => value + 1);
    else setMissed((items) => [...items, current]);
  }
  function next() {
    setIndex(index + 1);
    setFlipped(false);
    setAnswer(null);
    setSelected(null);
    setChoices(queue[index + 1] ? meaningChoices(queue[index + 1], words) : []);
  }
  function toggleKnown() {
    setKnownIds((previous) =>
      previous.includes(current.id)
        ? previous.filter((id) => id !== current.id)
        : [...previous, current.id],
    );
  }
  function toggleBookmark(word: StudyWord) {
    setBookmarkedIds((previous) =>
      previous.includes(word.id)
        ? previous.filter((id) => id !== word.id)
        : [...previous, word.id],
    );
  }
  function nextCardRound() {
    const remaining = queue.filter((word) => !knownWords.has(word.id));
    setQueue(remaining);
    setIndex(0);
    setFlipped(false);
  }
  function shuffleUnknownCards() {
    restart(queue.filter((word) => !knownWords.has(word.id)));
  }
  if (mode === "list") {
    const filtered = words.filter((word) =>
      `${word.word} ${word.meaning} ${word.source ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
    return (
      <div className="list-panel">
        <label className="search">
          단어 검색
          <input
            type="search"
            placeholder="영단어, 뜻, 출처 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <p className="muted">{filtered.length}개 단어</p>
        <ul className="word-list">
          {filtered.map((word) => (
            <li key={word.id}>
              <div className="word-line">
                <strong lang="en">{word.word}</strong>
                <span className="tag">
                  {word.group === "textbook" ? `DAY ${word.day}` : "추가 단어"}
                </span>
              </div>
              <p>{word.meaning}</p>
              {word.example && (
                <p className="example-small" lang="en">
                  {word.example}
                </p>
              )}
              {word.exampleMeaning && (
                <p className="muted">{word.exampleMeaning}</p>
              )}
              {word.note && <p className="muted">{word.note}</p>}
              <small>
                {word.source && `${word.source} · `}테스트 정답/알아요{" "}
                {progress[word.id]?.correct ?? 0} / 시도{" "}
                {progress[word.id]?.attempts ?? 0}
              </small>
              <button
                type="button"
                className={
                  bookmarkedWords.has(word.id)
                    ? "bookmark marked"
                    : "bookmark"
                }
                aria-pressed={bookmarkedWords.has(word.id)}
                onClick={() => toggleBookmark(word)}
              >
                {bookmarkedWords.has(word.id) ? "북마크 해제" : "북마크"}
              </button>
            </li>
          ))}
        </ul>
        {!filtered.length && <p className="empty">검색 결과가 없습니다.</p>}
      </div>
    );
  }
  if (!queue.length && mode === "cards")
    return (
      <div className="result">
        <span className="eyebrow">FLASHCARDS · COMPLETE</span>
        <h3>이번 범위의 단어를 모두 아는 단어로 표시했어요.</h3>
        <p className="muted">표시를 초기화하면 전체 단어를 다시 볼 수 있어요.</p>
        <div className="actions">
          <button
            className="primary"
            onClick={() => {
              setKnownIds((previous) =>
                previous.filter((id) => !words.some((word) => word.id === id)),
              );
              restart(words);
            }}
          >
            아는 단어 표시 초기화
          </button>
        </div>
      </div>
    );
  if (!queue.length)
    return (
      <div className="empty">
        <h3>아직 등록된 예문이 없어요</h3>
        <p>이 범위의 단어에 예문을 추가하면 예문 O/X를 시작할 수 있어요.</p>
      </div>
    );
  if (!current)
    return (
      <div className="result">
        <span className="eyebrow">SESSION COMPLETE</span>
        <h3>이번 학습을 마쳤어요!</h3>
        <p>
          {mode === "example" ? "알아요" : "정답"} <b>{score}</b> /{" "}
          {queue.length}개
        </p>
        <p className="muted">
          {missed.length
            ? `헷갈린 ${missed.length}개를 다시 익혀보세요.`
            : "모든 단어를 확인했어요. 한 번 더 복습해도 좋아요."}
        </p>
        <div className="actions">
          {missed.length > 0 && (
            <button className="primary" onClick={() => restart(missed)}>
              틀린 단어 / 몰라요만 다시
            </button>
          )}
          <button
            onClick={() =>
              restart(
                mode === "example"
                  ? words.filter((word) => word.example?.trim())
                  : words,
              )
            }
          >
            전체 다시 하기
          </button>
        </div>
      </div>
    );
  return (
    <div
      className={`study-body study-${mode} ${answer !== null ? "answered" : ""}`}
    >
      <div className="session-heading">
        <p>
          {mode === "cards"
            ? `먼저 뜻을 떠올린 뒤 카드를 뒤집어 보세요. 아는 단어 ${knownIds.length}개`
            : mode === "meaning"
              ? choices.length > 1
                ? "이 단어에 맞는 뜻을 선택하세요."
                : "선택지가 부족해 뜻을 떠올린 뒤 직접 확인합니다."
              : "예문 속 단어의 뜻을 알면 O, 모르겠으면 X를 누르세요."}
        </p>
        <span>
          {index + 1} / {queue.length}
        </span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
      </div>
      {mode === "cards" ? (
        <>
          <button
            className={`flashcard desktop-card ${flipped ? "flipped" : ""}`}
            onClick={() => setFlipped(!flipped)}
            aria-label={
              flipped ? "카드 뒤집기: 영단어 보기" : "카드 뒤집기: 뜻 보기"
            }
          >
            <span className="eyebrow">{flipped ? "MEANING" : "WORD"}</span>
            <strong lang={flipped ? "ko" : "en"}>
              {flipped ? current.meaning : current.word}
            </strong>
            {flipped && (
              <>
                <p lang="en">{current.example}</p>
                <p className="translation">{current.exampleMeaning}</p>
                <p className="muted">{current.note}</p>
              </>
            )}
            <small>눌러서 {flipped ? "단어" : "뜻"} 보기 ↻</small>
          </button>
          <div
            className={`flashcard mobile-card ${flipped ? "flipped" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={
              flipped ? "카드 뒤집기: 영단어 보기" : "카드 뒤집기: 뜻 보기"
            }
            onClick={() => setFlipped((value) => !value)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setFlipped((value) => !value);
              }
            }}
          >
            <span className="eyebrow">{flipped ? "MEANING" : "WORD"}</span>
            <PagedText
              text={
                flipped
                  ? [
                      current.meaning,
                      current.example,
                      current.exampleMeaning,
                      current.note,
                    ]
                      .filter(Boolean)
                      .join("\n\n")
                  : current.word
              }
            />
            <small className="flip-hint">카드 어디든 눌러 뒤집기 ↻</small>
          </div>
          <div className="card-actions">
            <button
              className={
                knownWords.has(current.id) ? "known-word marked" : "known-word"
              }
              aria-pressed={knownWords.has(current.id)}
              onClick={toggleKnown}
            >
              {knownWords.has(current.id) ? "아는 단어 ✓" : "아는 단어"}
            </button>
            <button
              className={
                bookmarkedWords.has(current.id) ? "bookmark marked" : "bookmark"
              }
              aria-pressed={bookmarkedWords.has(current.id)}
              onClick={() => toggleBookmark(current)}
            >
              {bookmarkedWords.has(current.id) ? "북마크 해제" : "북마크"}
            </button>
            <button
              disabled={index === 0}
              onClick={() => {
                setIndex(index - 1);
                setFlipped(false);
              }}
            >
              ← 이전
            </button>
            <button onClick={shuffleUnknownCards}>순서 섞기</button>
            <button
              className="primary"
              onClick={() => {
                if (index === queue.length - 1) nextCardRound();
                else {
                  setIndex(index + 1);
                  setFlipped(false);
                }
              }}
            >
              {index === queue.length - 1
                ? knownIds.length
                  ? "아는 단어 빼고"
                  : "처음으로 ↻"
                : "다음 →"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="question">
            <span className="eyebrow">
              {mode === "meaning" ? "WORD → MEANING" : "EXAMPLE · SELF CHECK"}
            </span>
            {mode === "meaning" ? (
              <>
                <h3 className="desktop-copy" lang="en">
                  {current.word}
                </h3>
                <PagedText text={current.word} />
              </>
            ) : (
              <>
                <p className="sentence desktop-copy" lang="en">
                  {current.example}
                </p>
                <PagedText text={current.example ?? ""} />
                <p className="target-word">
                  확인할 단어: <b lang="en">{current.word}</b>
                </p>
              </>
            )}
          </div>
          {mode === "meaning" && choices.length > 1 ? (
            <div className="choices">
              {choices.map((choice, i) => (
                <button
                  key={choice}
                  disabled={answer !== null}
                  className={
                    answer !== null && choice === current.meaning.trim()
                      ? "correct"
                      : selected === choice
                        ? "incorrect"
                        : ""
                  }
                  onClick={() =>
                    submit(choice === current.meaning.trim(), choice)
                  }
                >
                  <span>{i + 1}</span>
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <>
              {mode === "meaning" && !flipped && (
                <button
                  className="primary reveal"
                  onClick={() => setFlipped(true)}
                >
                  뜻 확인하기
                </button>
              )}
              {mode === "meaning" && flipped && (
                <p className="single-meaning">{current.meaning}</p>
              )}
              {(mode === "example" || flipped) && (
                <div className="ox">
                  <button
                    disabled={answer !== null}
                    onClick={() => submit(true)}
                  >
                    <strong>O</strong>알아요
                  </button>
                  <button
                    disabled={answer !== null}
                    onClick={() => submit(false)}
                  >
                    <strong>X</strong>몰라요
                  </button>
                </div>
              )}
            </>
          )}
          {answer !== null && (
            <div
              className={`feedback ${answer ? "correct" : "incorrect"}`}
              role="status"
            >
              <div className="desktop-feedback">
                <b>
                  {mode === "example" || choices.length === 1
                    ? answer
                      ? "알고 있는 단어예요"
                      : "다시 익혀볼 단어예요"
                    : answer
                      ? "정답이에요!"
                      : "정답을 확인해 보세요"}
                </b>
                <p>
                  {current.word} · {current.meaning}
                </p>
                {mode === "example" && current.exampleMeaning && (
                  <div className="example-translation">
                    <strong>예문 전체 해석</strong>
                    <p>{current.exampleMeaning}</p>
                  </div>
                )}
                {current.note && <small>{current.note}</small>}
              </div>
              <div className="mobile-feedback">
                <strong>{answer ? "잘했어요!" : "다시 익혀볼 단어예요"}</strong>
                <PagedText
                  text={[
                    `${current.word} · ${current.meaning}`,
                    mode === "example"
                      ? `예문 전체 해석\n${current.exampleMeaning}`
                      : "",
                    current.note,
                  ]
                    .filter(Boolean)
                    .join("\n\n")}
                />
              </div>
              <button className="primary" onClick={next}>
                {index === queue.length - 1 ? "결과 보기" : "다음 문제 →"}
              </button>
            </div>
          )}
          <p className="session-note">
            {mode === "example"
              ? `뜻을 스스로 확인하는 O/X입니다. 예문이 없는 ${words.filter((word) => !word.example?.trim()).length}개는 출제하지 않아요.`
              : "선택한 범위의 단어만 출제하며, 각 단어를 한 번씩 확인합니다."}
          </p>
        </>
      )}
    </div>
  );
}
