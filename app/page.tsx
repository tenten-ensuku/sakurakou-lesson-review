"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Books,
  Bird,
  CalendarDots,
  CaretRight,
  CaretLeft,
  ArrowLeft,
  ArrowClockwise,
  Check as CheckIcon,
  PencilSimple,
  Star,
  GearSix,
  YoutubeLogo,
  Images,
  LinkSimple,
  ListBullets,
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  LockSimple,
  ShareNetwork,
  Copy,
  FloppyDisk,
} from "@phosphor-icons/react";
import LegacyNotebook from "./LegacyNotebook";
import ConfirmProvider, { useConfirm } from "./ConfirmAction";
import RichContent from "./RichContent";
import {
  APP_VERSION,
  BASE_CARDS,
  DEFAULT_LESSON,
  mergeLessonCards,
  sortLessons,
  questionNumber,
  getRank,
} from "./lib/lesson.mjs";
import { seedCatalog } from "./lib/catalog-seed.mjs";
import { REWARDS, canRate, jstDay } from "./lib/progress.mjs";
import { useLearner } from "./lib/use-learner";
import {
  api,
  API_BASE,
  BASE_PATH,
  keyFor,
  type Card,
  type Lesson,
  type Notebook,
  type Catalog,
  type Theory,
  type Check,
  type Session,
  type LearningState,
} from "./lib/notebook-types";
import "./notebook.css";

const empty: Notebook = {
  overrides: [],
  metadata: [],
  lessons: [],
  cards: [],
  resources: [],
};
const normalize = (l: Lesson): Lesson => {
  let title = l.title.replace(/^\d{1,2}\/\d{1,2}[　\s]*/, "");
  let teacher = l.teacher ?? "";
  const m = title.match(/^(.+?先生)[　\s]+(.+)$/);
  if (!teacher && m) {
    teacher = m[1];
    title = m[2];
  }
  return { ...l, title, teacher };
};
const time = (s: number) =>
  Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const dayLabel = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
      })
    : "まだありません";
function Stars({ count = 0 }: { count?: number }) {
  return (
    <span className="knowledge-stars" aria-label={count + "つ星"}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          weight={i <= count ? "fill" : "regular"}
          className={i <= count ? "lit" : ""}
        />
      ))}
    </span>
  );
}
function Hero({
  outfit = "base",
  room = false,
}: {
  outfit?: string;
  room?: boolean;
}) {
  return (
    <div className="companion-hero">
      {room && (
        <img
          className="companion-room"
          src={BASE_PATH + "/companion/room.png"}
          alt="解放したひだまりの書斎"
        />
      )}
      <img
        src={BASE_PATH + "/companion/" + outfit + ".png"}
        width={1774}
        height={887}
        alt="本のポーチを持った緑のフクロウの相棒"
      />
      <p>一緒に復習しよう</p>
    </div>
  );
}
export default function Home() {
  return (
    <ConfirmProvider>
      <NotebookHome />
    </ConfirmProvider>
  );
}
function NotebookHome() {
  const confirmAction = useConfirm();
  const [booted, setBooted] = useState(false),
    [teacherToken, setTeacherToken] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(location.hash.slice(1));
    setTeacherToken(p.get("teacher") ?? "");
    setBooted(true);
  }, []);
  const learner = useLearner(booted && !teacherToken),
    { state, record } = learner;
  const [tab, setTab] = useState<
    "lessons" | "encyclopedia" | "buddy" | "settings"
  >("lessons");
  const [view, setView] = useState<
    "main" | "session" | "result" | "list" | "editor" | "catalog-editor"
  >("main");
  const [notebook, setNotebook] = useState<Notebook>(empty),
    [catalog, setCatalog] = useState<Catalog>(seedCatalog() as Catalog);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string>(
      DEFAULT_LESSON.id,
    ),
    [expanded, setExpanded] = useState(""),
    [resourceId, setResourceId] = useState("");
  const [selectedTheory, setSelectedTheory] = useState(""),
    [search, setSearch] = useState(""),
    [reviewFilter, setReviewFilter] = useState(false);
  const [run, setRun] = useState<Session | null>(null),
    runRef = useRef<Session | null>(null);
  const [editing, setEditing] = useState<{
    card: Card;
    field: "question" | "answer";
    value: string;
  } | null>(null);
  const [promotion, setPromotion] = useState<{
      title: string;
      stars: number;
    } | null>(null),
    [advancing, setAdvancing] = useState(false);
  const advancingRef = useRef(false),
    timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [restoreCode, setRestoreCode] = useState(""),
    [showCode, setShowCode] = useState(false),
    [shareUrl, setShareUrl] = useState("");
  const [teacherState, setTeacherState] = useState<LearningState | null>(null);
  const [editTheory, setEditTheory] = useState<Theory | null>(null),
    [editCheck, setEditCheck] = useState<Check | null>(null);
  const [dragKey, setDragKey] = useState("");
  const [editorCardKey, setEditorCardKey] = useState("");
  useEffect(() => {
    if (!resourceId && !promotion) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = document.querySelector<HTMLElement>(".note-modal-backdrop");
    const focusable = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setResourceId("");
        setPromotion(null);
      }
      if (e.key !== "Tab") return;
      const nodes = focusable(),
        first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus({ preventScroll: true });
    };
  }, [resourceId, promotion]);
  const refresh = useCallback(async () => {
    setLoading(true);
    const [n, c] = await Promise.allSettled([
      api("/api/notebook"),
      api("/api/catalog"),
    ]);
    if (n.status === "fulfilled") {
      setNotebook(n.value);
      try {
        localStorage.setItem(
          "ensuku-notebook-content-v1",
          JSON.stringify(n.value),
        );
      } catch {}
    } else {
      try {
        const old = localStorage.getItem("ensuku-notebook-content-v1");
        if (old) setNotebook(JSON.parse(old));
      } catch {}
      setError("教材に接続できません。保存済み教材で復習を続けられます。");
    }
    if (c.status === "fulfilled") {
      setCatalog(c.value);
      try {
        localStorage.setItem("ensuku-catalog-v1", JSON.stringify(c.value));
      } catch {}
    } else {
      try {
        const old = localStorage.getItem("ensuku-catalog-v1");
        if (old) setCatalog(JSON.parse(old));
      } catch {}
      setError(
        "図鑑の共有データに接続できません。編集は再接続後に保存してください。",
      );
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (teacherToken)
      api("/api/learning/teacher", "GET", undefined, teacherToken)
        .then(setTeacherState)
        .catch((e) => setError(e.message));
  }, [teacherToken]);
  const lessons = useMemo(
    () =>
      sortLessons([
        normalize({
          ...DEFAULT_LESSON,
          ...notebook.metadata.find(
            (l) => (l.lessonId ?? l.id) === DEFAULT_LESSON.id,
          ),
        }),
        ...notebook.lessons.filter((l) => !l.deleted).map(normalize),
      ]) as Lesson[],
    [notebook],
  );
  const cardsFor = (lessonId: string): Card[] => {
    const list = (
      lessonId === DEFAULT_LESSON.id
        ? mergeLessonCards(
            BASE_CARDS,
            notebook.overrides,
            notebook.cards.filter((c) => c.lessonId === lessonId),
          )
        : notebook.cards
            .filter((c) => c.lessonId === lessonId && !c.deleted)
            .map((c) => ({ ...c, source: "custom" }))
    ) as Card[];
    const order = new Map(
      catalog.orders
        .filter((o) => o.lessonId === lessonId)
        .map((o) => [o.cardKey, o.sortOrder]),
    );
    return list
      .map((c, i) => ({ c, i }))
      .sort(
        (a, b) =>
          (order.get(keyFor(lessonId, a.c)) ?? 100000 + a.i) -
          (order.get(keyFor(lessonId, b.c)) ?? 100000 + b.i),
      )
      .map((x) => x.c);
  };
  const visibleTheories = catalog.theories.filter((t) => !t.deleted);
  const itemsFor = (lessonId: string) =>
    catalog.items
      .filter(
        (q) =>
          !q.deleted &&
          q.lessonIds.includes(lessonId) &&
          visibleTheories.some((t) => t.id === q.theoryId),
      )
      .sort(
        (a, b) =>
          (catalog.orders.find(
            (o) => o.lessonId === lessonId && o.cardKey === "check:" + a.id,
          )?.sortOrder ?? 100000 + a.sortOrder) -
          (catalog.orders.find(
            (o) => o.lessonId === lessonId && o.cardKey === "check:" + b.id,
          )?.sortOrder ?? 100000 + b.sortOrder),
      );
  const resourcesFor = (id: string) =>
    notebook.resources.filter((r) => r.lessonId === id);
  const lesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0];
  const lessonCards = cardsFor(lesson.id),
    lessonItems = itemsFor(lesson.id);
  const theory = visibleTheories.find((t) => t.id === selectedTheory);
  const savedSessions = Object.values(state.sessions)
    .filter(
      (s) =>
        !s.completed &&
        lessons.some((l) => l.id === s.lessonId) &&
        s.keys.some((k) =>
          s.mode === "flash"
            ? cardsFor(s.lessonId).some((c) => keyFor(s.lessonId, c) === k)
            : catalog.items.some(
                (q) =>
                  q.id === k &&
                  !q.deleted &&
                  visibleTheories.some((t) => t.id === q.theoryId),
              ),
        ),
    )
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  const latestSession = savedSessions[0],
    primaryLesson = latestSession
      ? (lessons.find((l) => l.id === latestSession.lessonId) ?? lessons[0])
      : lessons[0];
  const flash = run?.mode === "flash",
    runLesson = lessons.find((l) => l.id === run?.lessonId) ?? lesson;
  const runCards = run ? cardsFor(run.lessonId) : [];
  const currentCard =
    run && flash
      ? runCards.find((c) => keyFor(run.lessonId, c) === run.keys[run.index])
      : undefined;
  const currentCheck =
    run && !flash
      ? catalog.items.find((c) => c.id === run.keys[run.index] && !c.deleted)
      : undefined;
  const currentPick =
    currentCheck && run ? run.picks[currentCheck.id] : undefined;
  const activeKey = run?.keys[run.index] ?? "";
  const closeToMenu = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    advancingRef.current = false;
    setAdvancing(false);
    if (runRef.current) record("session", { session: runRef.current });
    setEditing(null);
    setView("main");
    setMessage("");
  };
  const updateRun = (next: Session) => {
    runRef.current = next;
    setRun(next);
    record("session", { session: next });
  };
  useEffect(() => {
    runRef.current = run;
  }, [run]);
  useEffect(() => {
    if (view !== "session" || !run) return;
    const clock = setInterval(() => {
      setRun((v) => (v ? { ...v, elapsed: v.elapsed + 1 } : v));
    }, 1000);
    const checkpoint = () => {
      if (runRef.current) record("session", { session: runRef.current });
    };
    const save = setInterval(checkpoint, 15000);
    window.addEventListener("pagehide", checkpoint);
    const visibility = () => {
      if (document.visibilityState === "hidden") checkpoint();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(clock);
      clearInterval(save);
      window.removeEventListener("pagehide", checkpoint);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [view, run?.id, record]);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  const openSession = (
    l: Lesson,
    mode: "flash" | "check" | "theory",
    reviewOnly = false,
    theoryId?: string,
    resume?: Session,
  ) => {
    setError("");
    setMessage("");
    setEditing(null);
    setActiveLessonId(l.id);
    let keys =
      mode === "flash"
        ? cardsFor(l.id)
            .filter(
              (c) => !reviewOnly || state.reviewIds.includes(keyFor(l.id, c)),
            )
            .map((c) => keyFor(l.id, c))
        : (theoryId ? catalog.items : itemsFor(l.id))
            .filter(
              (q) =>
                !q.deleted &&
                visibleTheories.some((t) => t.id === q.theoryId) &&
                (theoryId
                  ? q.theoryId === theoryId
                  : q.lessonIds.includes(l.id)) &&
                (!reviewOnly || state.reviewIds.includes("check:" + q.id)),
            )
            .map((q) => q.id);
    if (resume) keys = resume.keys.filter((k) => keys.includes(k));
    if (!keys.length) {
      setMessage("対象の問題はありません。");
      return;
    }
    const slot =
      mode +
      ":" +
      l.id +
      (theoryId ? ":" + theoryId : "") +
      (reviewOnly ? ":review" : "");
    const next = resume
      ? {
          ...resume,
          keys,
          index: keys.includes(resume.keys[resume.index])
            ? keys.indexOf(resume.keys[resume.index])
            : Math.min(resume.index, keys.length - 1),
          revealed: keys.includes(resume.keys[resume.index]) && resume.revealed,
          completed: false,
        }
      : {
          id: crypto.randomUUID(),
          slot,
          lessonId: l.id,
          mode,
          keys,
          index: 0,
          elapsed: 0,
          revealed: false,
          picks: {},
          ratings: {},
          completed: false,
          reviewOnly,
        };
    updateRun(next);
    setView("session");
    window.scrollTo({ top: 0 });
  };
  const resumeSession = (s: Session) => {
    const l = lessons.find((l) => l.id === s.lessonId);
    if (l)
      openSession(
        l,
        s.mode,
        s.reviewOnly,
        s.mode === "theory"
          ? catalog.items.find((q) => q.id === s.keys[0])?.theoryId
          : undefined,
        s,
      );
  };
  const startPrimary = () => {
    if (latestSession) resumeSession(latestSession);
    else if (cardsFor(primaryLesson.id).length)
      openSession(primaryLesson, "flash");
    else if (itemsFor(primaryLesson.id).length)
      openSession(primaryLesson, "check");
    else setResourceId(primaryLesson.id);
  };
  const advance = (delta = 1, ratings = run?.ratings) => {
    const r = runRef.current;
    if (!r) return;
    setEditing(null);
    if (r.index + delta >= r.keys.length) {
      updateRun({ ...r, ratings: ratings ?? r.ratings, completed: true });
      setView("result");
    } else
      updateRun({
        ...r,
        index: Math.max(0, r.index + delta),
        ratings: ratings ?? r.ratings,
        revealed: false,
      });
  };
  const rating = (value: "known" | "again") => {
    if (
      !run ||
      !currentCard ||
      currentCard.kind !== "question" ||
      !canRate(run.revealed, !!editing, advancingRef.current)
    )
      return;
    advancingRef.current = true;
    setAdvancing(true);
    const captured = run.id,
      index = run.index;
    record("review", {
      target: activeKey,
      active: value === "again",
      theoryIds: visibleTheories
        .filter((t) => t.cardKeys.includes(activeKey))
        .map((t) => t.id),
    });
    if (value === "known")
      record("known", {
        target: activeKey,
        theoryIds: visibleTheories
          .filter((t) => t.cardKeys.includes(activeKey))
          .map((t) => t.id),
      });
    const ratings = { ...run.ratings, [activeKey]: value };
    updateRun({ ...run, ratings });
    timerRef.current = setTimeout(() => {
      advancingRef.current = false;
      setAdvancing(false);
      if (runRef.current?.id === captured && runRef.current.index === index)
        advance(1, ratings);
    }, 180);
  };
  const answer = (index: number) => {
    if (!run || !currentCheck || currentPick !== undefined) return;
    const correct = index === currentCheck.correctIndex,
      t = state.theories[currentCheck.theoryId],
      day = jstDay(new Date().toISOString());
    const nextStars = correct
      ? !t?.stars
        ? 1
        : t.stars === 1 && day > (t.firstDay ?? day)
          ? 2
          : t.stars === 2 &&
              day >= (t.firstDay ?? day) + 7 &&
              day > (t.secondDay ?? day)
            ? 3
            : t.stars
      : (t?.stars ?? 0);
    record("attempt", {
      sessionId: run.id,
      itemId: currentCheck.id,
      revision: currentCheck.revision,
      choiceIndex: index,
      correct,
      theoryIds: [currentCheck.theoryId],
    });
    updateRun({ ...run, picks: { ...run.picks, [currentCheck.id]: index } });
    if (nextStars > (t?.stars ?? 0))
      setPromotion({
        title:
          catalog.theories.find((t) => t.id === currentCheck.theoryId)?.title ??
          "知識",
        stars: nextStars,
      });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "session" || editing || promotion || !run) return;
      if (
        (e.target as HTMLElement)?.closest(
          "input,textarea,select,button,a,summary",
        )
      )
        return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeToMenu();
      }
      if ([" ", "Enter"].includes(e.key)) {
        e.preventDefault();
        if (flash && currentCard?.kind === "question")
          updateRun({ ...run, revealed: !run.revealed });
        else if (flash || currentPick !== undefined) advance();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        advance(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      }
      if (!flash && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        answer(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const mutate = async (
    action: () => Promise<unknown>,
    success = "保存しました。",
  ) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
      setMessage(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存できませんでした。");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const saveInline = async () => {
    if (!editing || !run) return;
    const c = editing.card;
    const body = {
      kind: c.kind,
      question: editing.field === "question" ? editing.value : c.question,
      answer: editing.field === "answer" ? editing.value : c.answer,
    };
    if (!body.question.trim() || !body.answer.trim()) {
      setError("問題文と解説を入力してください。");
      return;
    }
    if (
      await mutate(() =>
        api(
          c.source === "base"
            ? "/api/admin/cards/" + run.lessonId + "/" + c.id
            : "/api/lessons/" + run.lessonId + "/cards/" + c.id,
          "PUT",
          body,
        ),
      )
    )
      setEditing(null);
  };
  const upload = async (file: File, append: (text: string) => void) => {
    setBusy(true);
    try {
      const response = await fetch(API_BASE + "/api/images", {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      append("\n" + data.markdown + "\n");
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像を追加できませんでした。");
    } finally {
      setBusy(false);
    }
  };
  const reorder = async (from: string, to: string) => {
    if (from === to || busy) return;
    const keys = [
        ...lessonCards.map((c) => keyFor(lesson.id, c)),
        ...lessonItems.map((q) => "check:" + q.id),
      ],
      a = keys.indexOf(from),
      b = keys.indexOf(to);
    if (a < 0 || b < 0) return;
    keys.splice(b, 0, keys.splice(a, 1)[0]);
    const previous = catalog;
    setCatalog({
      ...catalog,
      orders: [
        ...catalog.orders.filter((o) => o.lessonId !== lesson.id),
        ...keys.map((cardKey, sortOrder) => ({
          lessonId: lesson.id,
          cardKey,
          sortOrder,
        })),
      ],
    });
    if (
      !(await mutate(
        () => api("/api/catalog/order", "PUT", { lessonId: lesson.id, keys }),
        "順番を保存しました。",
      ))
    )
      setCatalog(previous);
  };
  const imageInput = (append: (v: string) => void) => (
    <label
      className="upload-target"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = Array.from(e.dataTransfer.files).find((f) =>
          f.type.startsWith("image/"),
        );
        if (f) void upload(f, append);
      }}
      onPaste={(e) => {
        const f = Array.from(e.clipboardData.files).find((f) =>
          f.type.startsWith("image/"),
        );
        if (f) void upload(f, append);
      }}
      tabIndex={0}
    >
      <Images size={22} />
      画像を追加・ここへドロップ
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f, append);
          e.target.value = "";
        }}
      />
    </label>
  );
  const links = (l: Lesson) => (
    <div className="lesson-links">
      {l.videoUrl && (
        <a
          className="round-button youtube"
          aria-label={l.title + "の授業動画をYouTubeで見る"}
          href={l.videoUrl}
          target="_blank"
          rel="noreferrer"
        >
          <YoutubeLogo size={23} weight="fill" />
        </a>
      )}
      {resourcesFor(l.id).some((r) => r.kind === "image") && (
        <button
          className="round-button"
          aria-label={l.title + "の画像資料"}
          onClick={() => setResourceId(l.id)}
        >
          <Images size={22} />
        </button>
      )}
      {resourcesFor(l.id).some((r) => r.kind !== "image") && (
        <button
          className="round-button"
          aria-label={l.title + "の参考資料"}
          onClick={() => setResourceId(l.id)}
        >
          <LinkSimple size={22} />
        </button>
      )}
    </div>
  );
  const theoryRow = (t: Theory, i: number, progress = state) => (
    <button
      className="theory-row"
      key={t.id}
      onClick={() => {
        setTab("encyclopedia");
        setSelectedTheory(t.id);
        setView("main");
      }}
    >
      <span className="theory-index">{String(i + 1).padStart(2, "0")}</span>
      <span className="theory-row-title">
        <strong>{t.title}</strong>
        {progress.theories[t.id]?.needsReview && <small>解き直し</small>}
        {progress.theories[t.id]?.collected &&
          !progress.theories[t.id]?.stars && <small>収集済み</small>}
      </span>
      <Stars count={progress.theories[t.id]?.stars} />
      <CaretRight size={20} />
    </button>
  );
  if (!booted)
    return (
      <main className="notebook">
        <p>ノートを開いています…</p>
      </main>
    );
  if (teacherToken)
    return (
      <main className="notebook teacher-view">
        <header className="notebook-header">
          <h1>桜紅さんの復習記録</h1>
        </header>
        <p>講師向け・読み取り専用</p>
        {error && <p role="alert">{error}</p>}
        {teacherState ? (
          <>
            <div className="summary-strip">
              <span>収集 {teacherState.collected}枚</span>
              <span>星 {teacherState.stars}個</span>
              <span>最終復習 {dayLabel(teacherState.lastReviewedAt)}</span>
            </div>
            {catalog.theories
              .filter((t) => teacherState.theories[t.id])
              .map((t) => (
                <article className="teacher-row" key={t.id}>
                  <strong>{t.title}</strong>
                  <Stars count={teacherState.theories[t.id].stars} />
                  <span>
                    {teacherState.theories[t.id].needsReview
                      ? "解き直し"
                      : "確認済み"}
                  </span>
                </article>
              ))}
            <h2>解き直し対象</h2>
            {teacherState.reviewIds.map((key) => {
              const q = catalog.items.find((q) => "check:" + q.id === key);
              const card = lessons
                .flatMap((l) =>
                  cardsFor(l.id).map((c) => ({
                    key: keyFor(l.id, c),
                    card: c,
                  })),
                )
                .find((x) => x.key === key)?.card;
              return (
                <p key={key}>
                  <RichContent
                    text={q?.question ?? card?.question ?? "非表示になった教材"}
                  />
                </p>
              );
            })}
            {!teacherState.reviewIds.length && (
              <p>解き直し対象はありません。</p>
            )}
          </>
        ) : (
          !error && <p>記録を読み込んでいます…</p>
        )}
      </main>
    );
  if (view === "editor")
    return (
      <div className="notebook legacy-editor">
        <LegacyNotebook
          key={activeLessonId}
          initialLessonId={activeLessonId}
          initialCardKey={editorCardKey}
          onClose={() => {
            setView("main");
            void refresh();
          }}
        />
      </div>
    );
  return (
    <main className="notebook">
      <header className="notebook-header">
        <span className="student-mark" aria-hidden="true">
          桜
        </span>
        <div>
          <h1>エンスク授業ノート</h1>
          <p>
            桜紅さん <span className="notebook-version">ver{APP_VERSION}</span>
          </p>
        </div>
        <button
          className="round-button"
          aria-label="設定・編集・引継ぎ"
          onClick={() => {
            closeToMenu();
            setTab("settings");
          }}
        >
          <GearSix size={23} />
        </button>
      </header>
      {error && (
        <div className="feedback error" role="alert">
          {error}
          <button
            onClick={() => {
              setError("");
              void refresh();
            }}
          >
            再接続
          </button>
        </div>
      )}
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
      {learner.storageWarning && (
        <p className="feedback error">
          このブラウザには保存できません。閉じる前に設定で同期と引継ぎコードを確認してください。
        </p>
      )}
      {view === "main" && tab === "lessons" && (
        <>
          <Hero outfit={state.outfit} />
          <section className="continue-section">
            <div className="continue-title">
              <CalendarDots size={34} />
              <div>
                <p>
                  {primaryLesson.date} {primaryLesson.teacher}
                </p>
                <h2>{primaryLesson.title}</h2>
              </div>
              {latestSession && (
                <span className="count-pill">
                  {latestSession.index + 1} / {latestSession.keys.length}
                </span>
              )}
            </div>
            <button
              className="continue-button"
              disabled={!learner.ready || loading}
              onClick={startPrimary}
            >
              <BookOpen size={34} />
              <strong>
                {loading
                  ? "教材を読み込み中"
                  : !latestSession &&
                      !cardsFor(primaryLesson.id).length &&
                      !itemsFor(primaryLesson.id).length
                    ? "資料を読む"
                    : "復習をつづける"}
              </strong>
              <CaretRight size={27} />
            </button>
          </section>
          <button className="wardrobe-link" onClick={() => setTab("buddy")}>
            <Bird size={27} />
            <span>相棒の着せ替え</span>
            <CaretRight size={22} />
          </button>
          <section>
            <div className="section-title">
              <Books size={26} />
              <h2>セオリー図鑑</h2>
              <button onClick={() => setTab("encyclopedia")}>すべて見る</button>
            </div>
            <div className="preview-theories">
              {visibleTheories.slice(0, 2).map((t, i) => theoryRow(t, i))}
            </div>
          </section>
          <section className="lesson-section">
            <div className="section-title">
              <CalendarDots size={26} />
              <h2>授業一覧</h2>
              <span>{lessons.length}授業</span>
            </div>
            {lessons.map((l) => {
              const cards = cardsFor(l.id),
                checks = itemsFor(l.id),
                questions = cards.filter((c) => c.kind === "question"),
                reviews = state.reviewIds.filter(
                  (k) =>
                    cards.some((c) => keyFor(l.id, c) === k) ||
                    checks.some((q) => "check:" + q.id === k),
                );
              const saved = savedSessions.find((s) => s.lessonId === l.id);
              return (
                <article className="lesson-line" key={l.id}>
                  <div className="lesson-line-top">
                    <button
                      className="lesson-toggle"
                      aria-expanded={expanded === l.id}
                      onClick={() => setExpanded(expanded === l.id ? "" : l.id)}
                    >
                      <span className="lesson-date-badge">{l.date}</span>
                      <span>
                        <small>{l.teacher}</small>
                        <strong>{l.title}</strong>
                      </span>
                      <CaretRight
                        className={expanded === l.id ? "turned" : ""}
                      />
                    </button>
                    {links(l)}
                  </div>
                  {expanded === l.id && (
                    <div className="lesson-expanded">
                      <p>
                        {questions.length}問
                        {cards.length > questions.length
                          ? "・説明カード " +
                            (cards.length - questions.length) +
                            "枚"
                          : ""}
                        {checks.length ? "・確認 " + checks.length + "問" : ""}
                      </p>
                      <div className="action-grid">
                        {saved && (
                          <button
                            className="primary"
                            onClick={() => resumeSession(saved)}
                          >
                            途中から再開
                          </button>
                        )}
                        {cards.length > 0 && (
                          <button onClick={() => openSession(l, "flash")}>
                            カードで復習
                          </button>
                        )}
                        {checks.length > 0 && (
                          <button onClick={() => openSession(l, "check")}>
                            四択・穴埋め
                          </button>
                        )}
                        {!cards.length && !checks.length && (
                          <button
                            className="primary"
                            onClick={() => setResourceId(l.id)}
                          >
                            資料を読む
                          </button>
                        )}
                        {reviews.length > 0 && (
                          <>
                            <button
                              onClick={() =>
                                openSession(
                                  l,
                                  cards.some((c) =>
                                    state.reviewIds.includes(keyFor(l.id, c)),
                                  )
                                    ? "flash"
                                    : "check",
                                  true,
                                )
                              }
                            >
                              解き直し {reviews.length}件
                            </button>
                            {cards.some((c) =>
                              state.reviewIds.includes(keyFor(l.id, c)),
                            ) &&
                              checks.some((q) =>
                                state.reviewIds.includes("check:" + q.id),
                              ) && (
                                <button
                                  onClick={() => openSession(l, "check", true)}
                                >
                                  確認問題の解き直し
                                </button>
                              )}
                          </>
                        )}
                        <button
                          onClick={() => {
                            setActiveLessonId(l.id);
                            setView("list");
                          }}
                        >
                          <ListBullets />
                          問題一覧
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}
      {view === "main" && tab === "encyclopedia" && (
        <section className="encyclopedia">
          <div className="section-title">
            <Books size={30} />
            <h2>セオリー図鑑</h2>
          </div>
          <div className="summary-strip">
            <span>
              収集 <b>{state.collected}</b>枚
            </span>
            <span>
              星 <b>{state.stars}</b>個
            </span>
            <span>
              三つ星{" "}
              <b>
                {
                  Object.values(state.theories).filter((t) => t.stars === 3)
                    .length
                }
              </b>
              枚
            </span>
          </div>
          {theory ? (
            <article className="theory-detail">
              <button
                className="plain-button"
                onClick={() => setSelectedTheory("")}
              >
                <ArrowLeft />
                図鑑一覧へ
              </button>
              <div className="section-title">
                <h2>{theory.title}</h2>
                <Stars count={state.theories[theory.id]?.stars} />
              </div>
              <small>{theory.category}</small>
              <h3>資料の文言</h3>
              <blockquote>
                <RichContent text={theory.canonical} />
              </blockquote>
              <h3>どんなときに使う？</h3>
              <div className="rich-content">
                <RichContent text={theory.conditions} />
              </div>
              <h3>例外・注意点</h3>
              <div className="rich-content">
                <RichContent text={theory.exceptions} />
              </div>
              {theory.sourceUrl && (
                <a
                  className="link-chip"
                  href={theory.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {theory.sourceLabel || "出典"}を開く
                </a>
              )}
              <div className="action-grid">
                <button
                  className="primary"
                  disabled={
                    !catalog.items.some(
                      (q) => !q.deleted && q.theoryId === theory.id,
                    )
                  }
                  onClick={() =>
                    openSession(
                      lessons.find((l) => theory.lessonIds.includes(l.id)) ??
                        lesson,
                      "theory",
                      false,
                      theory.id,
                    )
                  }
                >
                  確認問題に挑戦
                </button>
                <button
                  onClick={() => {
                    setEditTheory({ ...theory });
                    setEditCheck(null);
                    setView("catalog-editor");
                  }}
                >
                  <PencilSimple />
                  この項目を編集
                </button>
              </div>
              <h3>関連する授業</h3>
              {lessons
                .filter((l) => theory.lessonIds.includes(l.id))
                .map((l) => (
                  <button
                    className="related-lesson"
                    key={l.id}
                    onClick={() => {
                      setTab("lessons");
                      setExpanded(l.id);
                      setActiveLessonId(l.id);
                      setSelectedTheory("");
                    }}
                  >
                    {l.date} {l.teacher} {l.title}
                    <CaretRight />
                  </button>
                ))}
              <p className="muted">
                収集後、確認問題の初正解で星1つ。翌日以降の正解で星2つ。初正解から7日以上・星2つ獲得日より後の正解で星3つ。休んでも星は減りません。
              </p>
            </article>
          ) : (
            <>
              <label className="search-field">
                知識を探す
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="用語・セオリーで検索"
                />
              </label>
              <label className="filter-check">
                <input
                  type="checkbox"
                  checked={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.checked)}
                />
                解き直したい知識だけ
              </label>
              {visibleTheories
                .filter(
                  (t) =>
                    (t.title + t.canonical + t.category).includes(search) &&
                    (!reviewFilter || state.theories[t.id]?.needsReview),
                )
                .map((t) => theoryRow(t, visibleTheories.indexOf(t)))}
              <p className="muted">
                未収集の内容もすべて読めます。星は復習の記録で、理解を保証するものではありません。
              </p>
            </>
          )}
        </section>
      )}
      {view === "session" && run && (
        <section className="learning-screen">
          <div className="learning-top">
            <button
              className="round-button"
              aria-label="途中保存してメニューへ"
              onClick={closeToMenu}
            >
              <X size={24} />
            </button>
            <div>
              <small>
                {runLesson.date} {runLesson.teacher}
              </small>
              <strong>{runLesson.title}</strong>
            </div>
            <span className="elapsed">{time(run.elapsed)}</span>
          </div>
          <div className="session-progress">
            <span>
              カード {run.index + 1} / {run.keys.length}
            </span>
            <button
              onClick={() => {
                record("session", { session: run });
                setActiveLessonId(run.lessonId);
                setView("list");
              }}
            >
              問題一覧
            </button>
          </div>
          <progress
            value={run.index + 1}
            max={run.keys.length}
            aria-label="復習の進捗"
          />
          {flash && currentCard ? (
            <>
              <article
                className={
                  "study-card " +
                  (run.revealed ? "card-face--answer" : "card-face--question")
                }
              >
                <div className="card-toolbar">
                  <span>
                    {currentCard.kind === "question"
                      ? "Q" + questionNumber(runCards, currentCard.id)
                      : "学習メモ"}
                  </span>
                  <button
                    className="plain-button"
                    onClick={() =>
                      setEditing({
                        card: currentCard,
                        field: run.revealed ? "answer" : "question",
                        value: run.revealed
                          ? currentCard.answer
                          : currentCard.question,
                      })
                    }
                  >
                    <PencilSimple />
                    {run.revealed ? "解説を編集" : "問題を編集"}
                  </button>
                </div>
                {editing ? (
                  <div className="inline-editor">
                    <label>
                      {editing.field === "question" ? "問題文" : "解説文"}
                      <textarea
                        autoFocus
                        value={editing.value}
                        onChange={(e) =>
                          setEditing({ ...editing, value: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                            e.preventDefault();
                            void saveInline();
                          }
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                    </label>
                    {imageInput((v) =>
                      setEditing((p) => (p ? { ...p, value: p.value + v } : p)),
                    )}
                    <div className="action-grid">
                      <button
                        disabled={busy}
                        className="primary"
                        onClick={saveInline}
                      >
                        保存
                      </button>
                      <button onClick={() => setEditing(null)}>
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={
                        "study-text rich-content " +
                        (run.revealed ? "answer-side" : "question-side")
                      }
                      key={run.revealed ? "answer" : "question"}
                    >
                      <RichContent
                        text={
                          run.revealed
                            ? currentCard.answer
                            : currentCard.question
                        }
                      />
                    </div>
                    {currentCard.kind !== "question" && !run.revealed && (
                      <div className="rich-content note-body">
                        <RichContent text={currentCard.answer} />
                      </div>
                    )}
                    {currentCard.kind === "question" && (
                      <button
                        className={
                          "flip-button " + (run.revealed ? "back" : "")
                        }
                        onClick={() =>
                          updateRun({ ...run, revealed: !run.revealed })
                        }
                      >
                        <ArrowClockwise size={22} />
                        {run.revealed ? "問題を見る" : "答えを見る"}
                      </button>
                    )}
                  </>
                )}
              </article>
              {currentCard.kind === "question" ? (
                <div className="rating-row">
                  <button
                    disabled={!canRate(run.revealed, !!editing, advancing)}
                    className="review-action"
                    onClick={() => rating("again")}
                  >
                    <ArrowClockwise />
                    解き直しに追加
                  </button>
                  <button
                    disabled={!canRate(run.revealed, !!editing, advancing)}
                    className="primary"
                    onClick={() => rating("known")}
                  >
                    <CheckIcon />
                    わかった
                  </button>
                </div>
              ) : (
                <button className="primary full" onClick={() => advance()}>
                  次へ
                </button>
              )}
            </>
          ) : currentCheck ? (
            <article className="study-card check-card">
              <div className="card-toolbar">
                <span>
                  {currentCheck.type === "cloze" ? "穴埋め" : "四択"} Q
                  {run.index + 1}
                </span>
                <button
                  className="plain-button"
                  onClick={() => {
                    record("session", { session: run });
                    setEditTheory(
                      catalog.theories.find(
                        (t) => t.id === currentCheck.theoryId,
                      ) ?? null,
                    );
                    setEditCheck({ ...currentCheck });
                    setView("catalog-editor");
                  }}
                >
                  <PencilSimple />
                  編集
                </button>
              </div>
              <div className="check-question rich-content">
                <RichContent
                  text={
                    currentCheck.type === "cloze" && currentPick !== undefined
                      ? currentCheck.question.replace(
                          /［[　\s]*］/g,
                          "［" + currentCheck.choices[currentPick] + "］",
                        )
                      : currentCheck.question
                  }
                />
              </div>
              <div className="choices">
                {currentCheck.choices.map((choice, i) => (
                  <button
                    key={i}
                    disabled={currentPick !== undefined}
                    className={
                      currentPick === undefined
                        ? ""
                        : i === currentCheck.correctIndex
                          ? "correct"
                          : i === currentPick
                            ? "incorrect"
                            : ""
                    }
                    onClick={() => answer(i)}
                  >
                    <span className="choice-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>
                      <RichContent text={choice} links={false} />
                    </span>
                    {currentPick !== undefined &&
                      i === currentCheck.correctIndex && <CheckIcon />}
                  </button>
                ))}
              </div>
              {currentPick !== undefined && (
                <div className="check-feedback">
                  <h3>
                    {currentPick === currentCheck.correctIndex
                      ? "正解！"
                      : "正解は " +
                        String.fromCharCode(65 + currentCheck.correctIndex)}
                  </h3>
                  <div className="rich-content">
                    <RichContent text={currentCheck.explanation} />
                  </div>
                  <div className="action-grid">
                    <button
                      className="review-action"
                      aria-pressed={state.reviewIds.includes(
                        "check:" + currentCheck.id,
                      )}
                      onClick={() =>
                        record("review", {
                          target: "check:" + currentCheck.id,
                          active: !state.reviewIds.includes(
                            "check:" + currentCheck.id,
                          ),
                        })
                      }
                    >
                      <ArrowClockwise />
                      {state.reviewIds.includes("check:" + currentCheck.id)
                        ? "解き直しから外す"
                        : "解き直しに追加"}
                    </button>
                    <button className="primary" onClick={() => advance()}>
                      次へ
                      <CaretRight />
                    </button>
                  </div>
                </div>
              )}
            </article>
          ) : (
            <div className="settings-box">
              <p>
                この教材は削除・更新されました。次へ進むか問題一覧で確認できます。
              </p>
              <button onClick={() => advance()}>次へ</button>
            </div>
          )}
          <nav className="session-nav" aria-label="カードの移動">
            <button
              disabled={run.index === 0 || !!editing || advancing}
              onClick={() => advance(-1)}
            >
              <CaretLeft />
              前へ
            </button>
            <button onClick={closeToMenu}>途中保存して戻る</button>
            <button disabled={!!editing || advancing} onClick={() => advance()}>
              {run.index === run.keys.length - 1 ? "終了" : "次へ"}
              <CaretRight />
            </button>
          </nav>
        </section>
      )}
      {view === "result" && run && (
        <section className="results">
          <Bird size={42} />
          <h2>おつかれさまでした！</h2>
          <p>今日の復習が、ひとつずつ力になります。</p>
          {(() => {
            const values = flash
              ? Object.values(run.ratings).map((r) => r === "known")
              : Object.entries(run.picks).map(
                  ([id, pick]) =>
                    catalog.items.find((q) => q.id === id)?.correctIndex ===
                    pick,
                );
            const known = values.filter(Boolean).length,
              percent = values.length
                ? Math.round((known / values.length) * 100)
                : 0;
            return (
              <>
                <div className="result-score">
                  <strong>{values.length ? percent + "%" : "—"}</strong>
                  <span>{flash ? "わかった率" : "正答率"}</span>
                </div>
                <progress max={100} value={percent} aria-label="結果" />
                <p>
                  {values.length
                    ? "今回のランク " + getRank(percent)
                    : "今回は学習メモを確認しました"}
                </p>
                <div className="summary-strip">
                  <span>
                    {flash ? "わかった" : "正解"} {known}件
                  </span>
                  <span>回答 {values.length}件</span>
                  <span>{time(run.elapsed)}</span>
                </div>
              </>
            );
          })()}
          <div className="action-grid">
            <button
              className="primary"
              onClick={() => {
                setView("main");
                setTab("encyclopedia");
                setSelectedTheory("");
              }}
            >
              図鑑を見る
            </button>
            <button
              onClick={() => {
                setView("main");
                setTab("buddy");
              }}
            >
              相棒に会う
            </button>
            <button onClick={closeToMenu}>授業一覧へ</button>
          </div>
        </section>
      )}
      {view === "list" && (
        <section className="all-questions">
          <div className="section-title">
            <button
              className="round-button"
              aria-label="メニューへ"
              onClick={closeToMenu}
            >
              <ArrowLeft />
            </button>
            <h2>
              {lesson.date} {lesson.title}
            </h2>
          </div>
          <div className="action-grid">
            {run && !run.completed && (
              <button className="primary" onClick={() => setView("session")}>
                学習へ戻る
              </button>
            )}
            <button
              onClick={() => {
                setEditorCardKey("");
                setView("editor");
              }}
            >
              <PencilSimple />
              ノートを編集
            </button>
          </div>
          <h3>
            フラッシュカード{" "}
            {lessonCards.filter((c) => c.kind === "question").length}問
          </h3>
          <p className="muted">
            ドラッグ、または上下ボタンで順番を変えられます。
          </p>
          {lessonCards.map((c, i) => {
            const key = keyFor(lesson.id, c);
            return (
              <details
                className="list-card"
                key={key}
                draggable={!busy}
                onDragStart={() => setDragKey(key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void reorder(dragKey, key);
                }}
              >
                <summary>
                  <span>
                    {c.kind === "question"
                      ? "Q" + questionNumber(lessonCards, c.id)
                      : "メモ"}
                  </span>
                  <strong>
                    <RichContent text={c.question} links={false} />
                  </strong>
                  {state.reviewIds.includes(key) && (
                    <span className="review-label">解き直し</span>
                  )}
                </summary>
                <div className="list-card-body">
                  <div className="rich-content">
                    <RichContent text={c.answer} />
                  </div>
                  <div className="action-grid">
                    <button
                      onClick={() => {
                        setEditorCardKey(key);
                        setView("editor");
                      }}
                    >
                      <PencilSimple />
                      編集
                    </button>
                    <button
                      aria-pressed={state.reviewIds.includes(key)}
                      onClick={() =>
                        record("review", {
                          target: key,
                          active: !state.reviewIds.includes(key),
                        })
                      }
                    >
                      {state.reviewIds.includes(key)
                        ? "解き直しを解除"
                        : "解き直しに追加"}
                    </button>
                    <button
                      aria-label={
                        "Q" + questionNumber(lessonCards, c.id) + "を上へ"
                      }
                      disabled={i === 0 || busy}
                      onClick={() =>
                        reorder(key, keyFor(lesson.id, lessonCards[i - 1]))
                      }
                    >
                      <ArrowUp />
                      上へ
                    </button>
                    <button
                      aria-label={
                        "Q" + questionNumber(lessonCards, c.id) + "を下へ"
                      }
                      disabled={i === lessonCards.length - 1 || busy}
                      onClick={() =>
                        reorder(key, keyFor(lesson.id, lessonCards[i + 1]))
                      }
                    >
                      <ArrowDown />
                      下へ
                    </button>
                  </div>
                </div>
              </details>
            );
          })}
          <h3>確認問題 {lessonItems.length}問</h3>
          {lessonItems.map((q, i) => (
            <details
              className="list-card"
              key={q.id}
              draggable={!busy}
              onDragStart={() => setDragKey("check:" + q.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragKey.startsWith("check:"))
                  void reorder(dragKey, "check:" + q.id);
              }}
            >
              <summary>
                <span>Q{i + 1}</span>
                <strong>
                  <RichContent text={q.question} links={false} />
                </strong>
                {state.reviewIds.includes("check:" + q.id) && (
                  <span className="review-label">解き直し</span>
                )}
              </summary>
              <div className="list-card-body">
                <ol type="A">
                  {q.choices.map((c, j) => (
                    <li key={j}>
                      {c}
                      {j === q.correctIndex ? "（正解）" : ""}
                    </li>
                  ))}
                </ol>
                <div className="rich-content">
                  <RichContent text={q.explanation} />
                </div>
                <button
                  onClick={() => {
                    setEditTheory(
                      catalog.theories.find((t) => t.id === q.theoryId) ?? null,
                    );
                    setEditCheck({ ...q });
                    setView("catalog-editor");
                  }}
                >
                  <PencilSimple />
                  この確認問題を編集
                </button>
                <div className="action-grid">
                  <button
                    disabled={i === 0 || busy}
                    onClick={() =>
                      reorder("check:" + q.id, "check:" + lessonItems[i - 1].id)
                    }
                  >
                    <ArrowUp />
                    上へ
                  </button>
                  <button
                    disabled={i === lessonItems.length - 1 || busy}
                    onClick={() =>
                      reorder("check:" + q.id, "check:" + lessonItems[i + 1].id)
                    }
                  >
                    <ArrowDown />
                    下へ
                  </button>
                </div>
              </div>
            </details>
          ))}
        </section>
      )}
      {view === "catalog-editor" && (
        <section className="catalog-editor">
          <div className="section-title">
            <button
              className="round-button"
              aria-label="編集を閉じる"
              onClick={() => {
                setView(run && !run.completed ? "session" : "main");
              }}
            >
              <ArrowLeft />
            </button>
            <h2>図鑑・確認問題を編集</h2>
          </div>
          <p className="muted">
            変更は全員に共有されます。削除した項目はここで復元できます。
          </p>
          <label>
            図鑑項目
            <select
              value={editTheory?.id ?? ""}
              onChange={(e) => {
                setEditTheory(
                  catalog.theories.find((t) => t.id === e.target.value) ?? null,
                );
                setEditCheck(null);
              }}
            >
              <option value="">項目を選択</option>
              {catalog.theories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.deleted ? "【削除済み】" : ""}
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              setEditTheory({
                id: "theory-" + crypto.randomUUID(),
                title: "",
                category: "手組",
                canonical: "",
                conditions: "",
                exceptions: "",
                sourceLabel: "",
                sourceUrl: "",
                lessonIds: [lesson.id],
                cardKeys: [],
                sortOrder: catalog.theories.length,
                deleted: false,
              });
              setEditCheck(null);
            }}
          >
            <Plus />
            図鑑項目を追加
          </button>
          {editTheory && (
            <div className="settings-box">
              <h3>{editTheory.deleted ? "削除済み項目" : "図鑑の内容"}</h3>
              {(
                [
                  "title",
                  "category",
                  "canonical",
                  "conditions",
                  "exceptions",
                  "sourceLabel",
                  "sourceUrl",
                ] as const
              ).map((field) => (
                <label key={field}>
                  {
                    {
                      title: "タイトル",
                      category: "分類",
                      canonical: "資料の文言",
                      conditions: "適用条件",
                      exceptions: "例外・注意点",
                      sourceLabel: "出典名",
                      sourceUrl: "出典URL",
                    }[field]
                  }
                  {["canonical", "conditions", "exceptions"].includes(field) ? (
                    <textarea
                      value={editTheory[field]}
                      onChange={(e) =>
                        setEditTheory({
                          ...editTheory,
                          [field]: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <input
                      value={editTheory[field]}
                      onChange={(e) =>
                        setEditTheory({
                          ...editTheory,
                          [field]: e.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
              {imageInput((v) =>
                setEditTheory((p) =>
                  p ? { ...p, conditions: p.conditions + v } : p,
                ),
              )}
              <fieldset>
                <legend>関連授業</legend>
                {lessons.map((l) => (
                  <label className="filter-check" key={l.id}>
                    <input
                      type="checkbox"
                      checked={editTheory.lessonIds.includes(l.id)}
                      onChange={(e) =>
                        setEditTheory({
                          ...editTheory,
                          lessonIds: e.target.checked
                            ? [...editTheory.lessonIds, l.id]
                            : editTheory.lessonIds.filter((id) => id !== l.id),
                        })
                      }
                    />
                    {l.date} {l.title}
                  </label>
                ))}
              </fieldset>
              <details>
                <summary>「わかった」で収集するカードを関連付ける</summary>
                {lessons
                  .filter((l) => editTheory.lessonIds.includes(l.id))
                  .map((l) => (
                    <fieldset key={l.id}>
                      <legend>
                        {l.date} {l.title}
                      </legend>
                      {cardsFor(l.id)
                        .filter((c) => c.kind === "question")
                        .map((c) => {
                          const key = keyFor(l.id, c);
                          return (
                            <label className="filter-check" key={key}>
                              <input
                                type="checkbox"
                                checked={editTheory.cardKeys.includes(key)}
                                onChange={(e) =>
                                  setEditTheory({
                                    ...editTheory,
                                    cardKeys: e.target.checked
                                      ? [...editTheory.cardKeys, key]
                                      : editTheory.cardKeys.filter(
                                          (k) => k !== key,
                                        ),
                                  })
                                }
                              />
                              <span>
                                {c.question.replace(
                                  /!\[[^\]]*\]\([^)]+\)/g,
                                  "",
                                )}
                              </span>
                            </label>
                          );
                        })}
                    </fieldset>
                  ))}
              </details>
              <div className="action-grid">
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    mutate(() =>
                      api(
                        "/api/catalog/theories/" + editTheory.id,
                        "PUT",
                        editTheory,
                      ),
                    )
                  }
                >
                  <FloppyDisk />
                  項目を保存
                </button>
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !editTheory.deleted &&
                      !(await confirmAction(
                        "この図鑑項目を非表示にしますか？獲得した星は残ります。",
                      ))
                    )
                      return;
                    const t = { ...editTheory, deleted: !editTheory.deleted };
                    if (
                      await mutate(() =>
                        api("/api/catalog/theories/" + t.id, "PUT", t),
                      )
                    )
                      setEditTheory(t);
                  }}
                >
                  {editTheory.deleted ? "復元する" : "削除する"}
                </button>
              </div>
              <h3>この知識の確認問題</h3>
              {catalog.items
                .filter((q) => q.theoryId === editTheory.id)
                .map((q) => (
                  <button
                    className="related-lesson"
                    key={q.id}
                    onClick={() => setEditCheck({ ...q })}
                  >
                    {q.deleted ? "【削除済み】" : ""}
                    {q.type === "cloze" ? "穴埋め" : "四択"} {q.question}
                    <PencilSimple />
                  </button>
                ))}
              <button
                disabled={!catalog.theories.some((t) => t.id === editTheory.id)}
                onClick={() =>
                  setEditCheck({
                    id: "check-" + crypto.randomUUID(),
                    theoryId: editTheory.id,
                    type: "choice",
                    question: "",
                    choices: ["", "", "", ""],
                    correctIndex: 0,
                    explanation: "",
                    lessonIds: [...editTheory.lessonIds],
                    sortOrder: catalog.items.length,
                    deleted: false,
                    revision: 0,
                  })
                }
              >
                <Plus />
                確認問題を追加
              </button>
            </div>
          )}
          {editCheck && (
            <div className="settings-box check-editor">
              <h3>確認問題の編集</h3>
              <label>
                形式
                <select
                  value={editCheck.type}
                  onChange={(e) =>
                    setEditCheck({
                      ...editCheck,
                      type: e.target.value as "choice" | "cloze",
                    })
                  }
                >
                  <option value="choice">四択</option>
                  <option value="cloze">タップ式穴埋め</option>
                </select>
              </label>
              <label>
                問題文{editCheck.type === "cloze" && "（空欄は［　］）"}
                <textarea
                  value={editCheck.question}
                  onChange={(e) =>
                    setEditCheck({ ...editCheck, question: e.target.value })
                  }
                />
              </label>
              {imageInput((v) =>
                setEditCheck((p) =>
                  p ? { ...p, question: p.question + v } : p,
                ),
              )}
              {editCheck.choices.map((c, i) => (
                <label key={i}>
                  選択肢 {String.fromCharCode(65 + i)}
                  <input
                    value={c}
                    onChange={(e) =>
                      setEditCheck({
                        ...editCheck,
                        choices: editCheck.choices.map((old, j) =>
                          j === i ? e.target.value : old,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <label>
                正解
                <select
                  value={editCheck.correctIndex}
                  onChange={(e) =>
                    setEditCheck({
                      ...editCheck,
                      correctIndex: Number(e.target.value),
                    })
                  }
                >
                  {editCheck.choices.map((_, i) => (
                    <option key={i} value={i}>
                      {String.fromCharCode(65 + i)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                解説
                <textarea
                  value={editCheck.explanation}
                  onChange={(e) =>
                    setEditCheck({ ...editCheck, explanation: e.target.value })
                  }
                />
              </label>
              {imageInput((v) =>
                setEditCheck((p) =>
                  p ? { ...p, explanation: p.explanation + v } : p,
                ),
              )}
              <fieldset>
                <legend>出題する授業</legend>
                {lessons.map((l) => (
                  <label className="filter-check" key={l.id}>
                    <input
                      type="checkbox"
                      checked={editCheck.lessonIds.includes(l.id)}
                      onChange={(e) =>
                        setEditCheck({
                          ...editCheck,
                          lessonIds: e.target.checked
                            ? [...editCheck.lessonIds, l.id]
                            : editCheck.lessonIds.filter((id) => id !== l.id),
                        })
                      }
                    />
                    {l.date} {l.title}
                  </label>
                ))}
              </fieldset>
              <div className="action-grid">
                <button
                  disabled={busy}
                  className="primary"
                  onClick={async () => {
                    if (
                      await mutate(() =>
                        api(
                          "/api/catalog/items/" + editCheck.id,
                          "PUT",
                          editCheck,
                        ),
                      )
                    )
                      setEditCheck(null);
                  }}
                >
                  確認問題を保存
                </button>
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !editCheck.deleted &&
                      !(await confirmAction("この確認問題を非表示にしますか？"))
                    )
                      return;
                    const q = { ...editCheck, deleted: !editCheck.deleted };
                    if (
                      await mutate(() =>
                        api("/api/catalog/items/" + q.id, "PUT", q),
                      )
                    )
                      setEditCheck(null);
                  }}
                >
                  {editCheck.deleted ? "復元する" : "削除する"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      {view === "main" && (
        <nav className="bottom-tabs" aria-label="メインメニュー">
          {(
            [
              { id: "lessons", label: "授業", Icon: BookOpen },
              { id: "encyclopedia", label: "図鑑", Icon: Books },
              { id: "buddy", label: "相棒", Icon: Bird },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => {
                setTab(id);
                setSelectedTheory("");
                setMessage("");
              }}
            >
              <Icon size={32} weight={tab === id ? "duotone" : "regular"} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
      {resourceId && (
        <div className="note-modal-backdrop" onClick={() => setResourceId("")}>
          <section
            className="note-modal"
            role="dialog"
            aria-modal="true"
            aria-label="参考資料"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-title">
              <h2>参考資料</h2>
              <button
                className="round-button"
                autoFocus
                aria-label="参考資料を閉じる"
                onClick={() => setResourceId("")}
              >
                <X />
              </button>
            </div>
            {resourcesFor(resourceId).length ? (
              resourcesFor(resourceId).map((r) => (
                <a
                  className="resource-item"
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.kind === "image" ? (
                    <img src={r.url} alt={r.label} />
                  ) : (
                    <LinkSimple size={24} />
                  )}
                  <strong>{r.label}</strong>
                  <CaretRight />
                </a>
              ))
            ) : (
              <p>
                参考資料はまだありません。設定のノート編集から追加できます。
              </p>
            )}
          </section>
        </div>
      )}
      {promotion && (
        <div
          className="note-modal-backdrop promotion-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="知識の昇格"
        >
          <button
            className="promotion"
            autoFocus
            onClick={() => setPromotion(null)}
            aria-label="昇格のお知らせを閉じる"
          >
            <Star weight="fill" size={50} />
            <h2>知識が育ちました！</h2>
            <p>{promotion.title}</p>
            <Stars count={promotion.stars} />
            <small>タップしてつづける</small>
          </button>
        </div>
      )}
      {view === "main" && tab === "buddy" && (
        <section className="buddy-screen">
          <Hero outfit={state.outfit} room={state.room} />
          <div className="section-title">
            <Bird size={30} />
            <h2>あなたの相棒</h2>
            <span>星 {state.stars}個</span>
          </div>
          <p>知識が増えると、装いや部屋が増えていきます。</p>
          <div className="reward-grid">
            {REWARDS.map((r) => {
              const unlocked = state.stars >= r.stars,
                selected = r.id === "room" ? state.room : state.outfit === r.id;
              return (
                <button
                  className={"reward " + (selected ? "selected" : "")}
                  key={r.id}
                  disabled={!unlocked}
                  aria-pressed={selected}
                  onClick={() =>
                    record("outfit", {
                      outfit: r.id === "room" ? state.outfit : r.id,
                      room: r.id === "room" ? !state.room : state.room,
                    })
                  }
                >
                  <img
                    src={BASE_PATH + "/companion/" + r.id + ".png"}
                    alt=""
                    loading="lazy"
                  />
                  <strong>{r.label}</strong>
                  <small>
                    {unlocked ? (
                      selected ? (
                        "使用中"
                      ) : (
                        "使う"
                      )
                    ) : (
                      <>
                        <LockSimple size={15} />星{r.stars}個で解放
                      </>
                    )}
                  </small>
                </button>
              );
            })}
          </div>
          <p className="muted">
            休んでも、不正解でも、相棒や獲得した装いは失われません。
          </p>
        </section>
      )}
      {view === "main" && tab === "settings" && (
        <section className="settings-screen">
          <div className="section-title">
            <GearSix size={28} />
            <h2>設定・編集</h2>
          </div>
          <section className="settings-box">
            <h3>教材を編集</h3>
            <p>
              教材の変更は、このアプリを使う全員に反映されます。個人の学習記録とは別です。
            </p>
            <div className="action-grid">
              <button
                onClick={() => {
                  setEditorCardKey("");
                  setView("editor");
                }}
              >
                <PencilSimple />
                ノートを作る・編集する
              </button>
              <button
                onClick={() => {
                  setEditTheory(null);
                  setEditCheck(null);
                  setView("catalog-editor");
                }}
              >
                <Books />
                図鑑・確認問題を編集
              </button>
            </div>
          </section>
          <section className="settings-box">
            <h3>保存と引継ぎ</h3>
            <p role="status">{learner.status}</p>
            <div className="action-grid">
              <button onClick={() => void learner.sync()}>
                <FloppyDisk />
                今すぐ同期
              </button>
              <button onClick={() => setShowCode(!showCode)}>
                引継ぎコードを{showCode ? "隠す" : "表示"}
              </button>
            </div>
            {showCode && (
              <>
                <p className="muted">
                  このコードを持つ人は学習記録を引き継げます。講師への共有には使わず、自分で保管してください。
                </p>
                <textarea
                  readOnly
                  aria-label="自分の引継ぎコード"
                  value={learner.getSecret()}
                />
                <button
                  onClick={() =>
                    navigator.clipboard
                      .writeText(learner.getSecret())
                      .then(() => setMessage("コピーしました。"))
                      .catch(() =>
                        setMessage("コード欄から選択してコピーしてください。"),
                      )
                  }
                >
                  <Copy />
                  コピー
                </button>
              </>
            )}
            <details>
              <summary>別の端末の記録を引き継ぐ</summary>
              <label>
                引継ぎコード
                <input
                  autoComplete="off"
                  value={restoreCode}
                  onChange={(e) => setRestoreCode(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !restoreCode.trim()}
                onClick={async () => {
                  if (
                    !(await confirmAction(
                      "この端末の表示を、コードの学習記録へ切り替えます。現在のコードは保管しましたか？",
                    ))
                  )
                    return;
                  setBusy(true);
                  try {
                    await learner.restore(restoreCode);
                    setRestoreCode("");
                    setMessage("学習記録を引き継ぎました。");
                    setShowCode(false);
                    setRun(null);
                    runRef.current = null;
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "引き継げませんでした。",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                この記録に切り替える
              </button>
            </details>
          </section>
          <section className="settings-box">
            <h3>講師に記録を共有</h3>
            <p>
              知識の星・解き直し対象・最終復習日だけを、読み取り専用で共有します。リンクを知る人が閲覧できます。
            </p>
            <div className="action-grid">
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await learner.sync();
                    const r = await api(
                      "/api/learning/shares",
                      "POST",
                      {},
                      learner.getSecret(),
                    );
                    setShareUrl(
                      location.origin +
                        location.pathname +
                        "#teacher=" +
                        r.token,
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "共有できませんでした。",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <ShareNetwork />
                共有リンクを作る
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  if (
                    !(await confirmAction(
                      "発行済みの講師用リンクをすべて無効にしますか？",
                    ))
                  )
                    return;
                  try {
                    await api(
                      "/api/learning/shares",
                      "DELETE",
                      undefined,
                      learner.getSecret(),
                    );
                    setShareUrl("");
                    setMessage("共有リンクを無効にしました。");
                  } catch {
                    setError("無効にできませんでした。");
                  }
                }}
              >
                共有を解除する
              </button>
            </div>
            {shareUrl && (
              <>
                <input
                  readOnly
                  aria-label="講師向け共有リンク"
                  value={shareUrl}
                />
                <button
                  onClick={() =>
                    navigator.clipboard
                      .writeText(shareUrl)
                      .then(() => setMessage("共有リンクをコピーしました。"))
                      .catch(() =>
                        setMessage("欄から選択してコピーしてください。"),
                      )
                  }
                >
                  <Copy />
                  共有リンクをコピー
                </button>
              </>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
