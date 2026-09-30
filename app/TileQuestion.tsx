"use client";
import { useState } from "react";
import { BASE_PATH, type TileQuestionData } from "./lib/notebook-types";
import { tileAnswer, tileFile, tileName, tileOptions } from "./lib/tile-question.mjs";
import RichContent from "./RichContent";
import NagaRecommendation from "./NagaRecommendation";
import { nagaSourceUrl } from "./lib/naga-evaluation.mjs";

export function TileHand({ data }: { data: TileQuestionData }) {
  if (data.board) return <figure className="tile-board-preview"><img src={data.board.imageUrl} alt="問題の元盤面" loading="lazy" /></figure>;
  return <div className="tile-hand-preview">{tileOptions(data).map((code: string, i: number) => <img key={i} src={`${BASE_PATH}/tiles/${tileFile(code)}`} width={66} height={90} alt={tileName(code)} />)}</div>;
}

export default function TileQuestion({ data, question, pick, onSubmit, explanation, model, onModelChange, onRetry, navigation }: {
  data: TileQuestionData; question?: string; pick?: number; onSubmit: (index: number) => void;
  explanation?: string; model?: string; onModelChange: (name: string) => void; onRetry: () => void;
  navigation?: { index: number; total: number; previous: () => void; next: () => void };
}) {
  const [failedImage, setFailedImage] = useState(false);
  const options = tileOptions(data);
  const answered = pick !== undefined;
  const choose = (index: number) => { if (!answered && !failedImage) onSubmit(index); };
  const label = (i: number) => `${i === data.hand.length && data.draw ? "ツモ牌 " : `${i + 1}枚目 `}${tileName(options[i])}`;
  const resultClass = (i: number) => !answered ? "" : i === pick ? (tileAnswer(data, i)?.correct ? " selected correct" : " selected incorrect") : "";
  const board = data.board;
  const supplement = answered && data.naga && explanation?.trim();
  const renderBoard = () => {
    if (!board) return null;
    return <div className={`source-question-stage${supplement ? " with-supplement" : ""}`}><div className="source-board-column"><figure className="source-board" data-naga-evaluated={answered && !!data.naga}>
      <div className="source-board-full" role="group" aria-label="切る牌を選択" style={{ aspectRatio: `${board.width} / ${board.height}` }}>
        <img src={board.imageUrl} alt="出題場面の元盤面。自分の手牌だけを選択できます" onError={() => setFailedImage(true)} />
        {!failedImage && board.regions.map((r, i) => <button key={i} type="button" aria-label={label(i)} aria-pressed={i === pick} disabled={answered} className={`source-tile-hit preview-hit${resultClass(i)}`} style={{ left: `${r.x / board.width * 100}%`, top: `${r.y / board.height * 100}%`, width: `${r.width / board.width * 100}%`, height: `${r.height / board.height * 100}%` }} onClick={() => choose(i)} onKeyDown={e => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(".source-tile-hit");
          buttons?.[(i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length]?.focus();
        }} />)}
        {answered && !failedImage && data.naga && <NagaRecommendation data={data} pick={pick!} model={model} onModelChange={onModelChange} />}
        {navigation && navigation.total > 1 && <nav className="source-board-pager" aria-label="盤面の問題移動">
          <button className="previous-question" type="button" aria-label="前の問題" disabled={navigation.index === 0} onClick={navigation.previous}>←</button>
          <button className="next-question" type="button" aria-label="次の問題" disabled={navigation.index === navigation.total - 1} onClick={navigation.next}>→</button>
        </nav>}
      </div>
      {failedImage ? <p className="error" role="alert">盤面画像を読み込めませんでした。再読み込みするか、<a href={board.imageUrl} target="_blank" rel="noreferrer">元画像を開く</a>から確認してください。</p> : <>
        <figcaption><span>{answered && data.naga?.kind === "discard" ? "赤枠：選択 · 紫枠：NAGA推奨" : answered ? "選んだ牌を枠で表示しています" : "自分の手牌をタップして回答"}</span><a href={board.imageUrl} target="_blank" rel="noreferrer">盤面を拡大</a></figcaption>
      </>}
    </figure>
      {navigation && <div className="source-answer-controls"><span className="source-question-position">{navigation.index + 1} / {navigation.total}</span>{answered && <button type="button" className="source-retry" onClick={onRetry}>もう一度</button>}</div>}
      {answered && data.naga && <><TileResult data={data} pick={pick!} /><p className="source-evaluation-note">{data.naga.kind === "call" ? "ポン前の判断。仮定したポン後の打牌推奨はありません。" : "NAGA推奨と授業の正解候補は別に表示しています。"} <a href={nagaSourceUrl(data.naga)} target="_blank" rel="noreferrer">解析を開く</a></p></>}
    </div>{supplement && <aside className="source-supplement" aria-label="この局面の解説"><h3>この局面のポイント</h3><div className="rich-content"><RichContent text={explanation!} /></div></aside>}</div>;
  };
  return <div className={board ? "tile-question tile-question--source" : "tile-question"}>
    {question && <div className="tile-question-text rich-content"><RichContent text={question} {...(board ? { renderImage: (im) => im.url === board.imageUrl ? renderBoard() : <figure className="note-image"><a href={im.url} target="_blank" rel="noreferrer"><img src={im.url} alt={im.alt || "教材画像"} /></a></figure> } : {})} /></div>}
    {board ? (!question?.includes(board.imageUrl) && renderBoard()) : <>
      <p className="tile-question-label">{data.label ?? "手牌"}の牌をタップして回答</p>
      <div className="tile-choice-scroll"><div className="tile-choice-row" role="group" aria-label="切る牌を選択">
        {options.map((code: string, i: number) => <button key={i} type="button" aria-label={label(i)} aria-pressed={pick === i} disabled={answered} className={resultClass(i) + (i === data.hand.length ? " draw-tile" : "")} onClick={() => choose(i)}>
          <img src={`${BASE_PATH}/tiles/${tileFile(code)}`} width={66} height={90} alt={tileName(code)} />
          {i === data.hand.length && <small>ツモ</small>}
        </button>)}
      </div></div>
      {!answered && <p className="tile-scroll-hint">手牌は横にスクロールできます。</p>}
    </>}
  </div>;
}
export function TileResult({ data, pick }: { data: TileQuestionData; pick: number }) {
  const result = tileAnswer(data, pick);
  if (!result) return null;
  return <p className={`tile-result ${result.correct ? "correct" : "incorrect"}`} role="status"><strong>{result.correct ? "〇 正解！" : "× 不正解"}</strong><span>選んだ牌：{tileName(result.tile)}</span><span>{data.naga ? "授業の正解候補" : "正解候補"}：{data.correctTiles.map(tileName).join("・")}</span></p>;
}
