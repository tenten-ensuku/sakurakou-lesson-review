"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import { tokenizeRichText } from "./lib/rich-text.mjs";
import { honorTileNumber } from "./lib/mahjong-tiles.mjs";
import {
  APP_VERSION, BASE_CARDS, DEFAULT_LESSON, STORAGE_KEY,
  getRank, mergeLessonCards, questionNumber, sortLessons,
} from "./lib/lesson.mjs";

type Kind = "question" | "section" | "note";
type Card = { id:string|number; kind:Kind; question:string; answer:string; source:"base"|"custom"; deleted?:boolean; sortOrder?:number };
type Lesson = { id:string; date:string; teacher:string; title:string; videoUrl:string; deleted?:boolean };
type LegacyOverride = { lessonId:string; id:number; question:string; answer:string; deleted?:boolean };
type RemoteCard = { id:string; lessonId:string; sortOrder:number; kind:Kind; question:string; answer:string; deleted?:boolean };
type Notebook = { overrides:LegacyOverride[]; metadata:Lesson[]; lessons:Lesson[]; cards:RemoteCard[] };
type Screen = "home"|"session"|"result"|"list"|"admin";
type Rating = "known"|"again";
type Result = { known:number; again:number; elapsed:number };

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "";
const EMPTY_NOTEBOOK:Notebook = { overrides:[], metadata:[], lessons:[], cards:[] };
const SUITS = { m:"man", p:"pin", s:"sou" } as const;

const cardKey = (lessonId:string, card:Pick<Card,"id"|"source">) => `${lessonId}:${card.source}:${card.id}`;
const formatTime = (seconds:number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,"0")}`;
const todayShort = () => { const now = new Date(); return `${now.getMonth() + 1}/${now.getDate()}`; };

function TileText({ text, links = true }:{ text:string; links?:boolean }) {
  const tiles = (value:string) => {
    const nodes:React.ReactNode[] = []; const pattern = /([1-9]+)\s*([mps])|([東南西北白發発中]+)/giu;
    let cursor = 0; let match:RegExpExecArray|null;
    while ((match = pattern.exec(value))) {
      const found = match;
      if (found.index > cursor) nodes.push(value.slice(cursor,found.index));
      const honor = found[3]; const digits = honor ? [...honor].map(honorTileNumber) : [...found[1]];
      const suit = honor ? "ji" : SUITS[found[2].toLowerCase() as keyof typeof SUITS];
      nodes.push(<span className="tile-run" key={`${found.index}-${found[0]}`}>{digits.map((digit,index) =>
        <span className="tile-slot" key={`${digit}-${index}`}><img className="tile-image" src={`${BASE_PATH}/tiles/${suit}${digit}-66-90-l.png`} width="66" height="90" alt={honor ?? `${digit}${found[2]}`} /></span>)}</span>);
      cursor = pattern.lastIndex;
    }
    if (cursor < value.length) nodes.push(value.slice(cursor));
    return nodes;
  };
  return <>{tokenizeRichText(text).map((token,index) => token.type === "text"
    ? <span key={index}>{tiles(token.value)}</span>
    : token.type === "image" ? <figure className="card-image" key={index}><img src={token.url} alt={token.alt || "カード画像"} /><figcaption>{token.alt}</figcaption></figure>
    : links ? <a className={`embedded-link embedded-link--${token.kind}`} href={token.url} target="_blank" rel="noreferrer" title={token.url} key={index}>{token.label}</a>
      : <span className={`embedded-link embedded-link--${token.kind} embedded-link--static`} key={index}>{token.label}</span>)}</>;
}

function normalizeLesson(lesson: Partial<Lesson>): Lesson {
  let title = lesson.title ?? "";
  let teacher = lesson.teacher ?? "";
  title = title.replace(/^\d{1,2}\/\d{1,2}[　\s]*/, "");
  if (!teacher) {
    const legacy = title.match(/^(.+?先生)[　\s]+(.+)$/);
    if (legacy) { teacher = legacy[1]; title = legacy[2]; }
  }
  return { id:lesson.id ?? "", date:lesson.date ?? "", teacher, title, videoUrl:lesson.videoUrl ?? "", deleted:lesson.deleted };
}

function lessonLabel(lesson: Lesson) { return [lesson.date, lesson.teacher, lesson.title].filter(Boolean).join("　"); }

function Header({ compact = false }:{ compact?:boolean }) {
  return <header className={`brand${compact ? " brand--compact" : ""}`}>
    <div className="brand__mark" aria-hidden="true">桜</div>
    <div><p className="brand__eyebrow">ENSUKU LESSON NOTE</p><h1 id="app-title">桜紅さんの授業復習</h1></div>
    <span className="version">ver{APP_VERSION}</span>
  </header>;
}

export default function Home() {
  const [screen,setScreen] = useState<Screen>("home");
  const [notebook,setNotebook] = useState<Notebook>(EMPTY_NOTEBOOK);
  const [activeLessonId,setActiveLessonId] = useState<string>(DEFAULT_LESSON.id);
  const [adminLessonId,setAdminLessonId] = useState<string>(DEFAULT_LESSON.id);
  const [reviewIds,setReviewIds] = useState<string[]>([]);
  const [sessionCards,setSessionCards] = useState<Card[]>([]);
  const [sessionLesson,setSessionLesson] = useState<Lesson>(DEFAULT_LESSON);
  const [index,setIndex] = useState(0); const [revealed,setRevealed] = useState(false);
  const [ratings,setRatings] = useState<Record<string,Rating>>({}); const [elapsed,setElapsed] = useState(0); const [result,setResult] = useState<Result|null>(null);
  const [notice,setNotice] = useState(""); const [error,setError] = useState(""); const [busy,setBusy] = useState("");
  const [lessonDraft,setLessonDraft] = useState({date:"",teacher:"",title:"",videoUrl:""});
  const [newLesson,setNewLesson] = useState({date:todayShort(),teacher:"",title:"",videoUrl:""});
  const [cardDrafts,setCardDrafts] = useState<Record<string,{kind:Kind;question:string;answer:string}>>({});

  const defaultLesson = useMemo(() => normalizeLesson({ ...DEFAULT_LESSON, ...(notebook.metadata.find((item) => item.id === DEFAULT_LESSON.id) ?? {}) }),[notebook.metadata]);
  const lessons = useMemo(() => sortLessons([defaultLesson,...notebook.lessons.filter((item) => !item.deleted).map(normalizeLesson)]),[defaultLesson,notebook.lessons]);
  const activeLesson = lessons.find((item) => item.id === activeLessonId) ?? lessons[0] ?? defaultLesson;
  const cardsFor = (lessonId:string) => lessonId === DEFAULT_LESSON.id
    ? mergeLessonCards(BASE_CARDS,notebook.overrides,notebook.cards.filter((card) => card.lessonId === lessonId)) as Card[]
    : notebook.cards.filter((card) => card.lessonId === lessonId && !card.deleted).sort((a,b) => a.sortOrder-b.sortOrder).map((card) => ({...card,source:"custom" as const}));
  const activeCards = useMemo(() => cardsFor(activeLesson.id),[activeLesson.id,notebook]);
  const activeQuestions = activeCards.filter((card) => card.kind === "question");
  const current = sessionCards[index];

  const refresh = async () => {
    const response = await fetch(`${API_BASE}/api/notebook`,{cache:"no-store"});
    if (!response.ok) throw new Error("保存データを読み込めませんでした。");
    setNotebook(await response.json());
  };
  useEffect(() => { refresh().catch(() => setError("保存データに接続できないため、既存カードだけを表示しています。")); }, []);
  useEffect(() => { try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); if(Array.isArray(saved.reviewIds)) setReviewIds(saved.reviewIds); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY,JSON.stringify({reviewIds})); } catch {} },[reviewIds]);
  useEffect(() => { if(screen !== "session") return; const timer=window.setInterval(() => setElapsed((value) => value+1),1000); return () => window.clearInterval(timer); },[screen]);
  useEffect(() => {
    const lesson = lessons.find((item) => item.id === adminLessonId); if (!lesson) return;
    setLessonDraft({date:lesson.date,teacher:lesson.teacher,title:lesson.title,videoUrl:lesson.videoUrl});
    const next:Record<string,{kind:Kind;question:string;answer:string}> = {};
    adminCards(adminLessonId).forEach((card) => { next[cardKey(adminLessonId,card)]={kind:card.kind,question:card.question,answer:card.answer}; });
    setCardDrafts(next);
  },[adminLessonId,notebook,lessons.length]);

  function adminCards(lessonId:string):Card[] {
    if (lessonId !== DEFAULT_LESSON.id) return notebook.cards.filter((card) => card.lessonId === lessonId).sort((a,b) => a.sortOrder-b.sortOrder).map((card) => ({...card,source:"custom" as const}));
    const legacy = new Map(notebook.overrides.filter((item) => item.lessonId === lessonId).map((item) => [item.id,item]));
    const base = BASE_CARDS.map((card) => { const item=legacy.get(card.id); return {...card,question:item?.question ?? card.question,answer:item?.answer ?? card.answer,deleted:item?.deleted,source:"base" as const}; });
    const extras = notebook.cards.filter((card) => card.lessonId === lessonId).sort((a,b) => a.sortOrder-b.sortOrder).map((card) => ({...card,source:"custom" as const}));
    return [...base,...extras];
  }
  const startForLesson = (lesson:Lesson, review = false) => {
    const cards = cardsFor(lesson.id); const questions = cards.filter((card) => card.kind === "question");
    const reviewKeys = reviewIds.filter((key) => questions.some((card) => cardKey(lesson.id,card) === key));
    const chosen = review ? questions.filter((card) => reviewKeys.includes(cardKey(lesson.id,card))) : cards;
    if (!chosen.length) return; setActiveLessonId(lesson.id); setSessionCards(chosen); setSessionLesson(lesson); setIndex(0); setRevealed(false); setRatings({}); setElapsed(0); setResult(null); setScreen("session");
  };
  const start = (review = false) => startForLesson(activeLesson,review);
  const nextCard = (nextRatings = ratings) => {
    if(index >= sessionCards.length-1) { const values=Object.values(nextRatings); setResult({known:values.filter((value)=>value==="known").length,again:values.filter((value)=>value==="again").length,elapsed}); setScreen("result"); }
    else { setIndex((value)=>value+1); setRevealed(false); }
  };
  const rate = (rating:Rating) => {
    if(!current || current.kind !== "question" || !revealed) return; const key=cardKey(sessionLesson.id,current); const next={...ratings,[key]:rating}; setRatings(next);
    setReviewIds((ids) => rating === "again" ? [...new Set([...ids,key])] : ids.filter((item) => item !== key)); window.setTimeout(() => nextCard(next),180);
  };
  useEffect(() => { const onKey=(event:KeyboardEvent) => { if(screen !== "session" || !current) return; if(current.kind !== "question" && ["Enter"," "].includes(event.key)){event.preventDefault();nextCard();} else if(!revealed && ["Enter"," "].includes(event.key)){event.preventDefault();setRevealed(true);} else if(revealed && event.key === "ArrowLeft") rate("again"); else if(revealed && event.key === "ArrowRight") rate("known");}; window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey); });

  const call = async (path:string,method:string,body?:unknown) => {
    const response = await fetch(`${API_BASE}${path}`,{method,headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
    if(!response.ok) { const data=await response.json().catch(()=>({})); throw new Error(data.error ?? "保存できませんでした。"); }
    return response.json().catch(()=>({}));
  };
  const uploadImage = async (card:Card, field:"question"|"answer", file:File) => {
    const key = cardKey(adminLessonId,card); setBusy(`${key}:${field}`); setError("");
    try {
      const response = await fetch(`${API_BASE}/api/images`,{method:"POST",headers:{"content-type":file.type},body:file});
      const data = await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.error ?? "画像を追加できませんでした。");
      const draft = cardDrafts[key] ?? {kind:card.kind,question:card.question,answer:card.answer};
      setCardDrafts({...cardDrafts,[key]:{...draft,[field]:`${draft[field].trimEnd()}\n${data.markdown}\n`}}); setNotice("画像を追加しました。カードを保存すると公開されます。");
    } catch(e) { setError(e instanceof Error ? e.message : "画像を追加できませんでした。"); } finally { setBusy(""); }
  };
  const addDroppedImage = (card:Card, field:"question"|"answer", files:FileList|File[]) => {
    const file = Array.from(files).find((item) => item.type.startsWith("image/"));
    if (file) uploadImage(card,field,file);
    else setError("画像ファイルを選択してください。");
  };
  const openAdmin = () => { setAdminLessonId(activeLesson.id); setNotice(""); setError(""); setScreen("admin"); };
  const saveLesson = async () => { setBusy("lesson"); setError(""); try { await call(`/api/lessons/${adminLessonId}`,"PUT",lessonDraft); await refresh(); setNotice("授業情報を保存しました。"); } catch(e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); } finally { setBusy(""); } };
  const createLesson = async () => { setBusy("new-lesson"); setError(""); try { const data=await call("/api/lessons","POST",newLesson); await refresh(); setAdminLessonId(data.lesson.id); setNewLesson({date:todayShort(),teacher:"",title:"",videoUrl:""}); setNotice("新しい授業ノートを作成しました。続けてカードを追加できます。"); } catch(e) { setError(e instanceof Error ? e.message : "作成できませんでした。"); } finally { setBusy(""); } };
  const removeLesson = async () => { if(adminLessonId === DEFAULT_LESSON.id || !window.confirm("この授業ノートとカードを非表示にしますか？")) return; setBusy("lesson-delete"); try { await call(`/api/lessons/${adminLessonId}`,"DELETE"); await refresh(); setAdminLessonId(DEFAULT_LESSON.id); setNotice("授業ノートを削除しました。"); } catch(e) { setError(e instanceof Error ? e.message : "削除できませんでした。"); } finally { setBusy(""); } };
  const saveCard = async (card:Card) => { const key=cardKey(adminLessonId,card); const draft=cardDrafts[key]; if(!draft) return; setBusy(key); setError(""); try { if(card.source === "base") await call(`/api/admin/cards/${DEFAULT_LESSON.id}/${card.id}`,"PUT",draft); else await call(`/api/lessons/${adminLessonId}/cards/${card.id}`,"PUT",draft); await refresh(); setNotice("カードを保存しました。"); } catch(e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); } finally { setBusy(""); } };
  const addCard = async () => { setBusy("add-card"); setError(""); try { await call(`/api/lessons/${adminLessonId}/cards`,"POST",{kind:"question",question:"新しい問題",answer:"ここに解説を書きます。"}); await refresh(); setNotice("カードを追加しました。"); } catch(e) { setError(e instanceof Error ? e.message : "追加できませんでした。"); } finally { setBusy(""); } };
  const deleteCard = async (card:Card) => { if(!window.confirm("このカードを削除しますか？")) return; const key=cardKey(adminLessonId,card); setBusy(key); try { if(card.source === "base") await call(`/api/admin/cards/${DEFAULT_LESSON.id}/${card.id}/delete`,"DELETE"); else await call(`/api/lessons/${adminLessonId}/cards/${card.id}`,"DELETE"); await refresh(); setNotice("カードを削除しました。問題番号は自動で詰まります。"); } catch(e) { setError(e instanceof Error ? e.message : "削除できませんでした。"); } finally { setBusy(""); } };
  const restoreCard = async (card:Card) => { const key=cardKey(adminLessonId,card); setBusy(key); try { if(card.source === "base") await call(`/api/admin/cards/${DEFAULT_LESSON.id}/${card.id}`,"DELETE"); else await call(`/api/lessons/${adminLessonId}/cards/${card.id}/restore`,"POST"); await refresh(); setNotice("カードを復元しました。"); } catch(e) { setError(e instanceof Error ? e.message : "復元できませんでした。"); } finally { setBusy(""); } };

  const score = result ? Math.round(result.known / Math.max(1,result.known+result.again)*100) : 0;
  return <main className="app-shell"><div className="felt-grain" aria-hidden="true" />
    {screen === "home" && <section className="screen screen--home" aria-labelledby="app-title"><Header />
      {error && <p className="admin-message admin-message--error">{error}</p>}
      <section className="mode-panel notebook-intro"><div><p className="section-kicker">MY MAHJONG NOTE</p><h2>授業ごとの復習ノート</h2><p>問題・解説・授業動画を、自分で追加して育てられます。</p></div><button className="admin-entry-button" onClick={openAdmin}>＋ ノートを作る・編集する</button></section>
      <div className="lesson-grid">{lessons.map((lesson) => { const cards=cardsFor(lesson.id); const questions=cards.filter((card)=>card.kind === "question"); const reviews=reviewIds.filter((key)=>questions.some((card)=>cardKey(lesson.id,card)===key)).length; return <section className="mode-panel lesson-panel" key={lesson.id}><div className="section-heading"><div className="lesson-title-row"><h2><span className="lesson-date">{lesson.date}</span><span className="lesson-teacher">{lesson.teacher}</span>{lesson.title}</h2>{lesson.videoUrl && <a className="youtube-icon-button" href={lesson.videoUrl} target="_blank" rel="noreferrer" aria-label="授業動画をYouTubeで見る"><span className="youtube-play-mark" /></a>}</div><span className="review-count">解き直し <strong>{reviews}</strong> 枚</span></div><p className="lesson-card-summary">全{questions.length}問＋学習カード{cards.length-questions.length}枚</p><div className="mode-grid"><button className="mode-card mode-card--primary" disabled={!cards.length} onClick={()=>startForLesson(lesson,false)}><span className="mode-card__number">{questions.length}</span><span><strong>すべて学習する</strong><small>問題と講義メモを順番に確認</small></span><span className="mode-card__arrow">→</span></button><button className="mode-card mode-card--review" disabled={!reviews} onClick={()=>startForLesson(lesson,true)}><span className="mode-card__number">↺</span><span><strong>解き直しカード</strong><small>{reviews ? `${reviews}枚を解き直す` : "回答後に追加できます"}</small></span><span className="mode-card__arrow">→</span></button></div><div className="lesson-panel-actions"><button className="text-button" onClick={()=>{setActiveLessonId(lesson.id);setScreen("list");}}>☰ カード一覧</button><button className="text-button" onClick={()=>{setAdminLessonId(lesson.id);setScreen("admin");}}>編集</button></div></section>; })}</div>
    </section>}

    {screen === "session" && current && <section className="screen screen--session" aria-live="polite"><div className="session-top"><button className="icon-button" onClick={()=>setScreen("home")} aria-label="メニューへ戻る">×</button><div className="session-title"><span>{sessionLesson.date}　{sessionLesson.title}</span><strong>{index+1}<small> / {sessionCards.length}</small></strong></div><div className="timer">◷ {formatTime(elapsed)}</div></div><div className="progress-track"><span style={{width:`${((index+1)/sessionCards.length)*100}%`}} /></div>{current.kind === "question" ? <><div className="study-stage"><article className={`flashcard ${revealed ? "flashcard--revealed" : ""}`}><div className="card-meta"><span>QUESTION</span><strong>Q{String(questionNumber(sessionCards,current.id)).padStart(2,"0")}</strong></div><p className="question-text"><TileText text={current.question} /></p><div className="answer-divider"><span>{revealed ? "ANSWER" : "THINK & REVEAL"}</span></div>{revealed ? <div className="answer-block"><p><TileText text={current.answer} /></p></div> : <button className="reveal-button" onClick={()=>setRevealed(true)}>◉ 答えを見る <kbd>Space</kbd></button>}</article></div><div className="rating-panel"><p>思い出せましたか？</p><div className="rating-actions"><button className="rating-button rating-button--again" disabled={!revealed} onClick={()=>rate("again")}>↺ <strong>解き直しに追加</strong><small>←</small></button><button className="rating-button rating-button--known" disabled={!revealed} onClick={()=>rate("known")}>✓ <strong>わかった</strong><small>→</small></button></div></div></> : <div className="study-stage"><article className={`flashcard flashcard--revealed info-card info-card--${current.kind}`}><div className="card-meta"><span>{current.kind === "section" ? "SESSION" : "LEARNING NOTE"}</span><strong>＋</strong></div><p className="question-text"><TileText text={current.question} /></p><div className="answer-divider"><span>NOTE</span></div><div className="answer-block"><p><TileText text={current.answer} /></p></div><button className="reveal-button" onClick={()=>nextCard()}>{index === sessionCards.length-1 ? "学習を終える" : "次へ"} →</button></article></div>}</section>}

    {screen === "result" && result && <section className="screen screen--result"><Header compact /><div className="result-panel"><p className="result-kicker">SESSION COMPLETE</p><h2>おつかれさまでした！</h2><div className="score-ring" style={{"--score":`${score*3.6}deg`} as React.CSSProperties}><div><strong>{score}</strong><span>%</span></div></div><div className={`rank-badge rank-badge--${getRank(score).toLowerCase()}`}><span>定着ランク</span><strong>{getRank(score)}</strong></div><dl className="result-stats"><div><dt>わかった</dt><dd>{result.known}<small>枚</small></dd></div><div><dt>解き直し</dt><dd>{result.again}<small>枚</small></dd></div><div><dt>時間</dt><dd>{formatTime(result.elapsed)}</dd></div></dl><div className="result-actions"><button className="primary-button" onClick={()=>start(false)}>もう一度</button><button className="text-button" onClick={()=>setScreen("home")}>メニューへ</button></div></div></section>}

    {screen === "list" && <section className="screen screen--list"><div className="list-top"><button className="icon-button" onClick={()=>setScreen("home")}>×</button><div><p className="section-kicker">ALL CARDS</p><h2>{activeLesson.date}　{activeLesson.title}</h2><small>全{activeQuestions.length}問</small></div><button className="admin-entry-button" onClick={openAdmin}>編集</button></div><div className="question-list">{activeCards.map((card) => <details className={`question-row${reviewIds.includes(cardKey(activeLesson.id,card)) ? " question-row--review" : ""}`} key={cardKey(activeLesson.id,card)}><summary><span className="question-number">{card.kind === "question" ? `Q${String(questionNumber(activeCards,card.id)).padStart(2,"0")}` : card.kind === "section" ? "章" : "メモ"}</span><strong><TileText text={card.question} links={false} /></strong><i className="chevron">＋</i></summary><div className="list-answer"><span>{card.kind === "question" ? "ANSWER" : "NOTE"}</span><p><TileText text={card.answer} /></p></div></details>)}</div></section>}

    {screen === "admin" && <section className="screen screen--admin"><div className="admin-top"><button className="icon-button" onClick={()=>setScreen("home")}>×</button><div><p className="section-kicker">MY NOTE EDITOR</p><h2>授業ノートを編集</h2></div><button className="admin-logout-button" onClick={()=>setScreen("home")}>完了</button></div><p className="admin-lead">ここで作った授業・カードは、同じアプリを開くすべての端末に反映されます。URLはそのまま貼り付けるだけで、表示時に見やすいリンクになります。</p>{notice && <p className="admin-message admin-message--success">{notice}</p>}{error && <p className="admin-message admin-message--error">{error}</p>}
      <section className="admin-create-lesson"><p className="section-kicker">NEW LESSON</p><h3>新しい授業ノートを作る</h3><div className="admin-meta-fields"><label>日付<input value={newLesson.date} placeholder="例：7/22" onChange={(event)=>setNewLesson({...newLesson,date:event.target.value})} /></label><label>講師<input value={newLesson.teacher} placeholder="例：てんてん先生" onChange={(event)=>setNewLesson({...newLesson,teacher:event.target.value})} /></label><label>タイトル<input value={newLesson.title} placeholder="例：基本牌効率 復習" onChange={(event)=>setNewLesson({...newLesson,title:event.target.value})} /></label><label>YouTubeリンク（任意）<input value={newLesson.videoUrl} placeholder="https://youtu.be/..." onChange={(event)=>setNewLesson({...newLesson,videoUrl:event.target.value})} /></label></div><button className="primary-button" disabled={busy === "new-lesson" || !newLesson.date.trim() || !newLesson.teacher.trim() || !newLesson.title.trim()} onClick={createLesson}>＋ この授業ノートを作る</button></section>
      <div className="admin-lesson-tabs">{lessons.map((lesson) => <button className={adminLessonId === lesson.id ? "is-active" : ""} key={lesson.id} onClick={()=>setAdminLessonId(lesson.id)}>{lesson.date}<br />{lesson.teacher}<br />{lesson.title}</button>)}</div>
      <section className="admin-lesson-editor"><div className="section-heading"><div><p className="section-kicker">LESSON INFO</p><h3>日付・講師・タイトル・動画</h3></div>{adminLessonId !== DEFAULT_LESSON.id && <button className="admin-delete-button" disabled={busy === "lesson-delete"} onClick={removeLesson}>授業を削除</button>}</div><div className="admin-meta-fields"><label>日付<input value={lessonDraft.date} onChange={(event)=>setLessonDraft({...lessonDraft,date:event.target.value})} /></label><label>講師<input value={lessonDraft.teacher} onChange={(event)=>setLessonDraft({...lessonDraft,teacher:event.target.value})} /></label><label>タイトル<input value={lessonDraft.title} onChange={(event)=>setLessonDraft({...lessonDraft,title:event.target.value})} /></label><label>YouTubeリンク（任意）<input value={lessonDraft.videoUrl} onChange={(event)=>setLessonDraft({...lessonDraft,videoUrl:event.target.value})} /></label></div><button className="admin-save-button" disabled={busy === "lesson" || !lessonDraft.date.trim() || !lessonDraft.teacher.trim() || !lessonDraft.title.trim()} onClick={saveLesson}>授業情報を保存</button></section>
      <div className="admin-card-toolbar"><div><p className="section-kicker">CARDS</p><h3>問題と解説</h3></div><button className="primary-button" disabled={busy === "add-card"} onClick={addCard}>＋ カードを追加</button></div><div className="admin-card-list">{adminCards(adminLessonId).map((card) => { const key=cardKey(adminLessonId,card); const draft=cardDrafts[key] ?? {kind:card.kind,question:card.question,answer:card.answer}; return <details className={`admin-card-editor${card.deleted ? " admin-card-editor--deleted" : ""}`} key={key}><summary><span>{card.kind === "question" ? "問題" : card.kind === "section" ? "章" : "メモ"}</span><strong>{card.deleted ? "削除済みカード" : draft.question}</strong><i>＋</i></summary><div className="admin-card-form">{card.deleted ? <button className="admin-restore-button" disabled={busy === key} onClick={()=>restoreCard(card)}>このカードを復元</button> : <><label>種類<select value={draft.kind} onChange={(event)=>setCardDrafts({...cardDrafts,[key]:{...draft,kind:event.target.value as Kind}})}><option value="question">フラッシュカード問題</option><option value="section">セクション見出し</option><option value="note">学習メモ</option></select></label><label>問題文・タイトル<textarea value={draft.question} onChange={(event)=>setCardDrafts({...cardDrafts,[key]:{...draft,question:event.target.value}})} /></label><label className="image-upload image-upload--drop" tabIndex={0} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>{event.preventDefault();addDroppedImage(card,"question",event.dataTransfer.files);}} onPaste={(event)=>addDroppedImage(card,"question",event.clipboardData.files)}>問題文に画像を追加<span>ドロップ・貼り付け可</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy === `${key}:question`} onChange={(event)=>{const file=event.target.files?.[0]; if(file) uploadImage(card,"question",file); event.currentTarget.value="";}} /></label><label>解説・本文<textarea value={draft.answer} onChange={(event)=>setCardDrafts({...cardDrafts,[key]:{...draft,answer:event.target.value}})} /></label><label className="image-upload image-upload--drop" tabIndex={0} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>{event.preventDefault();addDroppedImage(card,"answer",event.dataTransfer.files);}} onPaste={(event)=>addDroppedImage(card,"answer",event.clipboardData.files)}>解説に画像を追加<span>ドロップ・貼り付け可</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy === `${key}:answer`} onChange={(event)=>{const file=event.target.files?.[0]; if(file) uploadImage(card,"answer",file); event.currentTarget.value="";}} /></label><p className="image-help">画像は文字の間にも入れられます。ここへドラッグ＆ドロップ、または画像をコピーして貼り付けた後にカードを保存してください。</p><div className="admin-card-actions"><button className="primary-button" disabled={busy === key || !draft.question.trim() || !draft.answer.trim()} onClick={()=>saveCard(card)}>保存</button><button className="admin-delete-button" disabled={busy === key} onClick={()=>deleteCard(card)}>削除</button></div></>}</div></details>; })}</div>
    </section>}
  </main>;
}
