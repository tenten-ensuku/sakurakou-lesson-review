"use client";

import { useEffect, useMemo, useState } from "react";
import { tokenizeRichText } from "./lib/rich-text.mjs";
import {
  APP_VERSION, BASE_CARDS, LESSON_ID, LESSON_TITLE, STORAGE_KEY, VIDEO_URL,
  getRank, mergeOverrides, questionNumber,
} from "./lib/lesson.mjs";

type Card = { id:number; kind:"question"|"section"|"note"; question:string; answer:string };
type Override = { lessonId:string; id:number; question:string; answer:string; deleted?:boolean };
type Screen = "home"|"session"|"result"|"list"|"admin-login"|"admin";
type Rating = "known"|"again";
type Result = { known:number; again:number; elapsed:number };

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "";
const SUITS = { m:["man","萬"], p:["pin","筒"], s:["sou","索"] } as const;

function formatTime(seconds:number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function TileText({ text, links = true }:{ text:string; links?:boolean }) {
  const renderTiles = (value:string) => {
    const parts:React.ReactNode[] = [];
    const pattern = /([1-9]+)\s*([mps])|([發発]+)/giu;
    let cursor = 0;
    let match:RegExpExecArray|null;
    while ((match = pattern.exec(value))) {
      if (match.index > cursor) parts.push(value.slice(cursor, match.index));
      const honors = match[3];
      const digits = honors ? [...honors].map(() => "5") : [...match[1]];
      const suit = honors ? null : match[2].toLowerCase() as keyof typeof SUITS;
      parts.push(<span className="tile-run" key={`${match.index}-${match[0]}`}>
        {digits.map((digit, index) => <span className="tile-slot" key={`${digit}-${index}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tile-image" src={`${BASE_PATH}/tiles/${honors ? "ji5" : `${SUITS[suit!][0]}${digit}`}-66-90-l.png`} width="66" height="90" alt={honors ? "発" : `${digit}${SUITS[suit!][1]}`} />
        </span>)}
      </span>);
      cursor = pattern.lastIndex;
    }
    if (cursor < value.length) parts.push(value.slice(cursor));
    return parts;
  };
  return <>{tokenizeRichText(text).map((token, index) => token.type === "text"
    ? <span key={index}>{renderTiles(token.value)}</span>
    : links ? <a className={`embedded-link embedded-link--${token.kind}`} href={token.url} target="_blank" rel="noreferrer" title={token.url} key={index}>{token.label}</a>
      : <span className={`embedded-link embedded-link--${token.kind} embedded-link--static`} key={index}>{token.label}</span>)}</>;
}

function Header({ compact = false }:{ compact?:boolean }) {
  return <header className={`brand${compact ? " brand--compact" : ""}`}>
    <div className="brand__mark" aria-hidden="true">桜</div>
    <div><p className="brand__eyebrow">ENSUKU LESSON REVIEW</p><h1 id="app-title">桜紅さんの授業復習</h1></div>
    <span className="version">ver{APP_VERSION}</span>
  </header>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [overrides, setOverrides] = useState<Override[]>([]);
  const cards = useMemo(() => mergeOverrides(overrides) as Card[], [overrides]);
  const questions = useMemo(() => cards.filter((card) => card.kind === "question"), [cards]);
  const [reviewIds, setReviewIds] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      return Array.isArray(saved.reviewIds) ? saved.reviewIds : [];
    } catch { return []; }
  });
  const activeReviewIds = useMemo(() => reviewIds.filter((id) => questions.some((q) => q.id === id)), [reviewIds, questions]);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result|null>(null);
  const [password, setPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<number,{question:string;answer:string}>>({});
  const [busyId, setBusyId] = useState<number|null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/cards`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setOverrides(data.overrides ?? [])).catch(() => {});
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ reviewIds })); } catch {}
  }, [reviewIds]);
  useEffect(() => {
    if (screen !== "session") return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [screen]);

  const current = sessionCards[index];
  const start = (review = false) => {
    const next = review ? questions.filter((card) => activeReviewIds.includes(card.id)) : cards;
    if (!next.length) return;
    setSessionCards(next); setIndex(0); setRevealed(false); setRatings({}); setElapsed(0); setResult(null); setScreen("session");
  };
  const finish = (nextRatings = ratings) => {
    const values = Object.values(nextRatings);
    setResult({ known: values.filter((v) => v === "known").length, again: values.filter((v) => v === "again").length, elapsed });
    setScreen("result");
  };
  const nextCard = (nextRatings = ratings) => {
    if (index >= sessionCards.length - 1) finish(nextRatings);
    else { setIndex((value) => value + 1); setRevealed(false); }
  };
  const rate = (rating:Rating) => {
    if (!current || current.kind !== "question" || !revealed) return;
    const nextRatings = { ...ratings, [current.id]: rating };
    setRatings(nextRatings);
    setReviewIds((ids) => rating === "again" ? [...new Set([...ids, current.id])] : ids.filter((id) => id !== current.id));
    window.setTimeout(() => nextCard(nextRatings), 180);
  };
  const leave = () => { setScreen("home"); setSessionCards([]); };

  useEffect(() => {
    const onKey = (event:KeyboardEvent) => {
      if (screen !== "session" || !current) return;
      if (current.kind !== "question" && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); nextCard(); }
      else if (!revealed && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setRevealed(true); }
      else if (revealed && event.key === "ArrowLeft") rate("again");
      else if (revealed && event.key === "ArrowRight") rate("known");
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  const openAdmin = async (event:React.FormEvent) => {
    event.preventDefault(); setAdminError("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({password}) });
      if (!response.ok) throw new Error((await response.json()).error ?? "ログインできませんでした。");
      const nextDrafts = Object.fromEntries(BASE_CARDS.map((base) => { const edited = overrides.find((item) => item.id === base.id && !item.deleted); return [base.id, { question:edited?.question ?? base.question, answer:edited?.answer ?? base.answer }]; }));
      setDrafts(nextDrafts); setScreen("admin");
    } catch (error) { setAdminError(error instanceof Error ? error.message : "ログインできませんでした。"); }
  };
  const refresh = async () => {
    const response = await fetch(`${API_BASE}/api/cards`, { cache:"no-store" });
    if (response.ok) setOverrides((await response.json()).overrides ?? []);
  };
  const saveCard = async (id:number) => {
    setBusyId(id); setAdminError(""); setAdminNotice("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/cards/${LESSON_ID}/${id}`, { method:"PUT", headers:{"content-type":"application/json","x-admin-password":password}, body:JSON.stringify(drafts[id]) });
      if (!response.ok) throw new Error((await response.json()).error ?? "保存できませんでした。");
      await refresh(); setAdminNotice("保存しました。");
    } catch (error) { setAdminError(error instanceof Error ? error.message : "保存できませんでした。"); } finally { setBusyId(null); }
  };
  const deleteCard = async (id:number) => {
    if (!window.confirm("このカードを削除しますか？ 問題番号は自動的に詰め直されます。")) return;
    setBusyId(id);
    try {
      const response = await fetch(`${API_BASE}/api/admin/cards/${LESSON_ID}/${id}/delete`, { method:"DELETE", headers:{"x-admin-password":password} });
      if (!response.ok) throw new Error((await response.json()).error ?? "削除できませんでした。");
      await refresh(); setAdminNotice("削除しました。いつでも復元できます。");
    } catch (error) { setAdminError(error instanceof Error ? error.message : "削除できませんでした。"); } finally { setBusyId(null); }
  };
  const restoreCard = async (id:number) => {
    setBusyId(id);
    try {
      const response = await fetch(`${API_BASE}/api/admin/cards/${LESSON_ID}/${id}`, { method:"DELETE", headers:{"x-admin-password":password} });
      if (!response.ok) throw new Error((await response.json()).error ?? "復元できませんでした。");
      await refresh(); const base = BASE_CARDS.find((card) => card.id === id)!; setDrafts((all) => ({...all,[id]:{question:base.question,answer:base.answer}})); setAdminNotice("元のカードを復元しました。");
    } catch (error) { setAdminError(error instanceof Error ? error.message : "復元できませんでした。"); } finally { setBusyId(null); }
  };

  const infoCount = cards.length - questions.length;
  const score = result ? Math.round(result.known / Math.max(1, result.known + result.again) * 100) : 0;

  return <main className="app-shell"><div className="felt-grain" aria-hidden="true" />
    {screen === "home" && <section className="screen screen--home" aria-labelledby="app-title">
      <Header />
      <section className="mode-panel">
        <div className="section-heading"><div className="lesson-title-row"><h2>{LESSON_TITLE}</h2><a className="youtube-icon-button" href={VIDEO_URL} target="_blank" rel="noreferrer" aria-label="授業動画をYouTubeで見る"><span className="youtube-play-mark" /></a></div><span className="review-count">解き直し <strong>{activeReviewIds.length}</strong>枚</span></div>
        <p className="lesson-card-summary">全{questions.length}問＋学習カード{infoCount}枚</p>
        <div className="mode-grid">
          <button className="mode-card mode-card--primary" onClick={() => start(false)}><span className="mode-card__number">{questions.length}</span><span><strong>すべて学習する</strong><small>問題と講義メモを順番に確認</small></span><span className="mode-card__arrow">→</span></button>
          <button className="mode-card mode-card--review" disabled={!activeReviewIds.length} onClick={() => start(true)}><span className="mode-card__number">↺</span><span><strong>解き直しカード</strong><small>{activeReviewIds.length ? `${activeReviewIds.length}枚を解き直す` : "回答後に追加できます"}</small></span><span className="mode-card__arrow">→</span></button>
        </div>
        <button className="text-button lesson-list-button" onClick={() => setScreen("list")}>☰ カード一覧を見る</button>
      </section>
      <div className="home-footer"><button className="admin-entry-button" onClick={() => {setPassword("");setAdminError("");setScreen("admin-login");}}>⚙ 管理画面</button></div>
    </section>}

    {screen === "session" && current && <section className="screen screen--session" aria-live="polite">
      <div className="session-top"><button className="close-button" onClick={leave} aria-label="メニューへ戻る">×</button><div className="session-title"><span>{LESSON_TITLE}</span><strong>{index + 1}<small> / {sessionCards.length}</small></strong></div><div className="timer">◷ {formatTime(elapsed)}</div></div>
      <div className="progress-track"><span style={{width:`${((index + 1) / sessionCards.length) * 100}%`}} /></div>
      {current.kind === "question" ? <>
        <article className="flashcard"><div className="card-meta"><span>QUESTION</span><strong>Q{String(questionNumber(cards,current.id)).padStart(2,"0")}</strong></div><h2><TileText text={current.question} /></h2>{revealed && <div className="answer"><span>ANSWER</span><p><TileText text={current.answer} /></p></div>}</article>
        {!revealed ? <button className="reveal-button" onClick={() => setRevealed(true)}>答えを見る</button> : <div className="rating-area"><p>思い出せましたか？</p><div className="rating-grid"><button className="rating-button rating-button--again" onClick={() => rate("again")}>↺ 解き直しに追加</button><button className="rating-button rating-button--known" onClick={() => rate("known")}>✓ わかった</button></div></div>}
      </> : <>
        <article className={`flashcard info-card info-card--${current.kind}`}><div className="card-meta"><span>{current.kind === "section" ? "SESSION" : "LEARNING NOTE"}</span><strong>＋</strong></div><h2><TileText text={current.question} /></h2><div className="answer answer--visible"><p><TileText text={current.answer} /></p></div></article>
        <button className="reveal-button" onClick={() => nextCard()}>{index === sessionCards.length - 1 ? "学習を終える" : "次へ"} →</button>
      </>}
    </section>}

    {screen === "result" && result && <section className="screen screen--result"><Header compact /><div className="result-panel"><p className="result-kicker">SESSION COMPLETE</p><h2>おつかれさまでした！</h2><div className="score-ring" style={{"--score":`${score * 3.6}deg`} as React.CSSProperties}><div><strong>{score}</strong><span>%</span></div></div><div className={`rank-badge rank-badge--${getRank(score).toLowerCase()}`}><span>定着ランク</span><strong>{getRank(score)}</strong></div><dl className="result-stats"><div><dt>わかった</dt><dd>{result.known}<small>問</small></dd></div><div><dt>解き直し</dt><dd>{result.again}<small>問</small></dd></div><div><dt>時間</dt><dd>{formatTime(result.elapsed)}</dd></div></dl><div className="result-actions"><button className="primary-button" onClick={() => start(false)}>もう一度</button><button className="text-button" onClick={leave}>メニューへ</button></div></div></section>}

    {screen === "list" && <section className="screen screen--list"><div className="list-header"><button className="close-button" onClick={() => setScreen("home")}>←</button><div><p className="section-kicker">ALL CARDS</p><h2>カード一覧</h2><small>{questions.length}問＋学習カード{infoCount}枚</small></div></div><div className="question-list">{cards.map((card) => <details className={`question-item${activeReviewIds.includes(card.id) ? " question-item--review" : ""}`} key={card.id}><summary><span>{card.kind === "question" ? `Q${String(questionNumber(cards,card.id)).padStart(2,"0")}` : card.kind === "section" ? "章" : "補"}</span><strong><TileText text={card.question} links={false} /></strong><span>＋</span></summary><div className="question-answer"><TileText text={card.answer} /></div></details>)}</div></section>}

    {screen === "admin-login" && <section className="screen screen--admin-login"><Header compact /><form className="admin-login-panel" onSubmit={openAdmin}><p className="section-kicker">ADMIN</p><h2>管理画面</h2><p>カードのタイトル・問題文・解答文を編集できます。</p><label htmlFor="admin-password">パスワード</label><input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />{adminError && <p className="admin-message admin-message--error">{adminError}</p>}<button className="primary-button" type="submit">開く</button><button className="text-button" type="button" onClick={() => setScreen("home")}>戻る</button></form></section>}

    {screen === "admin" && <section className="screen screen--admin"><div className="list-header"><button className="close-button" onClick={() => {setPassword("");setScreen("home");}}>←</button><div><p className="section-kicker">ADMIN</p><h2>カード編集</h2><small>削除後も復元できます</small></div></div>{adminNotice && <p className="admin-message admin-message--success">{adminNotice}</p>}{adminError && <p className="admin-message admin-message--error">{adminError}</p>}<div className="admin-card-list">{BASE_CARDS.map((base) => { const deleted = overrides.some((item) => item.id === base.id && item.deleted); const draft = drafts[base.id] ?? {question:base.question,answer:base.answer}; return <details className={`admin-card-editor${deleted ? " admin-card-editor--deleted" : ""}`} key={base.id}><summary><span>{base.kind === "question" ? `Q${String(questionNumber(cards.filter((c) => c.id !== base.id || !deleted),base.id)).padStart(2,"0")}` : base.kind === "section" ? "章" : "補"}</span><strong>{deleted ? "削除済み" : draft.question}</strong><span>＋</span></summary><div className="admin-card-form"><label htmlFor={`q-${base.id}`}>{base.kind === "question" ? "問題文" : "タイトル"}</label><textarea id={`q-${base.id}`} value={draft.question} disabled={deleted} onChange={(e) => setDrafts((all) => ({...all,[base.id]:{...draft,question:e.target.value}}))} /><label htmlFor={`a-${base.id}`}>{base.kind === "question" ? "解答文" : "本文"}</label><textarea id={`a-${base.id}`} value={draft.answer} disabled={deleted} onChange={(e) => setDrafts((all) => ({...all,[base.id]:{...draft,answer:e.target.value}}))} />{deleted ? <button className="admin-restore-button" disabled={busyId === base.id} onClick={() => restoreCard(base.id)}>このカードを復元</button> : <div className="admin-card-actions"><button className="primary-button" disabled={busyId === base.id || !draft.question.trim() || !draft.answer.trim()} onClick={() => saveCard(base.id)}>保存</button><button className="admin-delete-button" disabled={busyId === base.id} onClick={() => deleteCard(base.id)}>削除</button></div>}</div></details>; })}</div></section>}
  </main>;
}
