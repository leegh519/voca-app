import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  addMissingStudyStateEntries,
  captureStudyState,
  parseStoredStudyState,
  restoreStudyState,
  sameStudyState,
  STUDY_STATE_CHANGED,
} from "./localStudyState";
import { supabase } from "./supabase";

type SyncStatus = "idle" | "loading" | "synced" | "saving" | "error";

type CloudSyncProps = {
  onSyncReady: (signedIn: boolean) => void;
};

export default function CloudSync({ onSyncReady }: CloudSyncProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [message, setMessage] = useState("동기화 확인 중");
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const readyUserId = useRef<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  async function saveToCloud(userId: string, state = captureStudyState()) {
    setStatus("saving");
    setMessage("저장 중");
    const { error } = await supabase.from("user_study_state").upsert(
      {
        user_id: userId,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      setStatus("error");
      setMessage(`동기화 실패: ${error.message}`);
      return;
    }
    setStatus("synced");
    setMessage("동기화됨");
  }

  async function initializeSync(nextUser: User) {
    if (readyUserId.current === nextUser.id) return;
    readyUserId.current = null;
    setStatus("loading");
    setMessage("클라우드에서 불러오는 중");
    const { data, error } = await supabase
      .from("user_study_state")
      .select("state")
      .eq("user_id", nextUser.id)
      .maybeSingle();
    if (error) {
      setStatus("error");
      setMessage(`동기화 실패: ${error.message}`);
      return;
    }
    const remoteState = data ? parseStoredStudyState(data.state) : null;
    if (data && !remoteState) {
      setStatus("error");
      setMessage("클라우드 학습 데이터 형식이 올바르지 않습니다.");
      return;
    }
    if (remoteState) {
      const localState = captureStudyState();
      const merged = addMissingStudyStateEntries(remoteState, localState);
      if (!sameStudyState(localState, merged.state)) {
        restoreStudyState(merged.state);
        readyUserId.current = nextUser.id;
        await saveToCloud(nextUser.id, merged.state);
        onSyncReady(true);
        return;
      }
    }
    readyUserId.current = nextUser.id;
    if (!remoteState || addMissingStudyStateEntries(remoteState, captureStudyState()).changed)
      await saveToCloud(nextUser.id);
    else {
      setStatus("synced");
      setMessage("동기화됨");
    }
    onSyncReady(true);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      if (nextUser) void initializeSync(nextUser);
      else {
        setStatus("idle");
        setMessage("로그인하면 다른 PC와 동기화됩니다.");
        onSyncReady(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      window.setTimeout(() => {
        if (nextUser) void initializeSync(nextUser);
        else {
          readyUserId.current = null;
          setStatus("idle");
          setMessage("로그인하면 다른 PC와 동기화됩니다.");
          onSyncReady(false);
        }
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const queueSave = () => {
      if (!user || readyUserId.current !== user.id) return;
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void saveToCloud(user.id);
      }, 800);
    };
    window.addEventListener(STUDY_STATE_CHANGED, queueSave);
    return () => {
      window.removeEventListener(STUDY_STATE_CHANGED, queueSave);
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [user]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("로그인 중");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setExpanded(false);
  }

  async function signUp() {
    setStatus("loading");
    setMessage("계정 생성 중");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    if (!data.session) {
      setStatus("idle");
      setMessage("확인 메일의 링크를 누른 뒤 로그인하세요.");
    }
  }

  async function signOut() {
    readyUserId.current = null;
    await supabase.auth.signOut();
    setExpanded(false);
  }

  return (
    <section className={`cloud-sync ${status === "error" ? "has-error" : ""}`}>
      <div className="cloud-sync-summary">
        <div>
          <strong>{user ? user.email : "클라우드 동기화"}</strong>
          <span>{message}</span>
        </div>
        {user ? (
          <button type="button" onClick={signOut}>로그아웃</button>
        ) : (
          <button type="button" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "닫기" : "로그인"}
          </button>
        )}
      </div>
      {!user && expanded && (
        <form className="cloud-sync-form" onSubmit={signIn}>
          <label>
            이메일
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <div className="cloud-sync-actions">
            <button className="primary" type="submit">로그인</button>
            <button type="button" onClick={signUp}>처음 계정 만들기</button>
          </div>
        </form>
      )}
    </section>
  );
}
