import { useState } from "react";
import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { supabase } from "./supabase";
import type { Extra } from "./vocabulary";
import type { GrammarData } from "./grammar";
import { validateGrammar } from "./grammar";

export default function ContentRegistration({ kind, signedIn, onAdded, compact = false }: {
  kind: "extra" | "grammar";
  signedIn: boolean;
  compact?: boolean;
  onAdded: (kind: "extra" | "grammar", content: Extra | GrammarData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    setError(""); setMessage("");
    try {
      const id = `${kind}-${crypto.randomUUID()}`;
      let item;
      if (kind === "extra") {
        if (!value("word") || !value("meaning")) throw new Error("단어와 뜻을 입력하세요.");
        if (value("example") && !value("exampleMeaning")) throw new Error("예문 전체 뜻을 입력하세요.");
        item = { id, word: value("word"), meaning: value("meaning"),
          example: value("example"), exampleMeaning: value("exampleMeaning") };
      } else {
        const sentence = value("sentence");
        const underlined = value("underlined");
        const index = sentence.indexOf(underlined);
        if (!underlined || index < 0) throw new Error("밑줄 표현을 문장에 있는 그대로 입력하세요.");
        if (sentence.indexOf(underlined, index + underlined.length) >= 0)
          throw new Error("같은 표현이 여러 번 나옵니다. 밑줄 표현을 더 길게 지정하세요.");
        item = { id, before: sentence.slice(0, index), underlined,
          after: sentence.slice(index + underlined.length), isCorrect: value("answer") === "O",
          correction: value("correction"), explanation: value("explanation") };
        validateGrammar({ questions: [item] });
      }
      setBusy(true);
      const { data: content, error: saveError } = await supabase.rpc("add_personal_study_item", {
        item_kind: kind, item,
      });
      if (saveError) throw new Error(saveError.message);
      onAdded(kind, content);
      form.reset();
      setMessage("내 계정에 등록했습니다.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "등록하지 못했습니다.");
    } finally { setBusy(false); }
  }
  return <div className={`content-registration ${open ? "registration-open" : ""}`}>
    <button type="button" aria-label={open ? "등록 닫기" : kind === "extra" ? "추가 단어 등록" : "문법 문제 등록"} onClick={() => { setOpen(!open); setMessage(""); setError(""); }}>
      {open ? "등록 닫기" : compact ? <><Plus size={16} aria-hidden="true" />등록</> : kind === "extra" ? "+ 추가 단어 등록" : "+ 문법 문제 등록"}
    </button>
    {open && (!signedIn ? <p role="status">로그인하면 내 계정에 직접 등록할 수 있어요.</p> :
      <form className="registration-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          {kind === "extra" ? <>
            <label>영단어<input name="word" required maxLength={200} /></label>
            <label>뜻<input name="meaning" required maxLength={1000} /></label>
            <label>예문 (선택)<textarea name="example" maxLength={3000} /></label>
            <label>예문 전체 뜻 (예문 입력 시 필수)<textarea name="exampleMeaning" maxLength={3000} /></label>
          </> : <>
            <label>문장<textarea name="sentence" required maxLength={3000} placeholder="Animals are getting used to be raised by humans." /></label>
            <label>밑줄 표현<input name="underlined" required maxLength={1000} placeholder="be raised" /></label>
            <label>정답<select name="answer" defaultValue="X"><option value="X">X · 틀린 표현</option><option value="O">O · 맞는 표현</option></select></label>
            <label>올바른 표현 (X이면 필수)<input name="correction" maxLength={1000} placeholder="being raised" /></label>
            <label>짧은 해설<textarea name="explanation" required maxLength={3000} /></label>
          </>}
          <button className="primary" type="submit">{busy ? "등록 중…" : "내 계정에 등록"}</button>
        </fieldset>
      </form>)}
    {error && <p className="warning" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </div>;
}
