"use client";
import { useState } from "react";
import { BASE_PATH, type TileQuestionData } from "./lib/notebook-types";
import { tileAnswer, tileFile, tileName, tileOptions } from "./lib/tile-question.mjs";
import RichContent from "./RichContent";

export function TileHand({ data }: { data: TileQuestionData }) {
  if (data.board) return <figure className="tile-board-preview"><img src={data.board.imageUrl} alt="問題の元盤面" loading="lazy" /></figure>;
  return <div className="tile-hand-preview">{tileOptions(data).map((code: string, i: number) => <img key={i} src={`${BASE_PATH}/tiles/${tileFile(code)}`} width={66} height={90} alt={tileName(code)} />)}</div>;
}

export default function TileQuestion({ data, question, pick, onSubmit }: { data: TileQuestionData; question?: string; pick?: number; onSubmit: (index: number) => void }) {
  const [failedImage, setFailedImage] = useState(false);
  const options = tileOptions(data);
  const answered = pick !== undefined;
  const choose = (index: number) => { if (!answered && !failedImage) onSubmit(index); };
  const label = (i: number) => `${i === data.hand.length && data.draw ? "ツモ牌 " : `${i + 1}枚目 `}${tileName(options[i])}`;
  const resultClass = (i: number) => !answered ? "" : i === pick ? (tileAnswer(data, i)?.correct ? " selected correct" : " selected incorrect") : "";
  const board = data.board;
  const renderBoard = () => {
    if (!board) return null;
    return <figure className="source-board">
      <div className="source-board-full" role="group" aria-label="切る牌を選択" style={{ aspectRatio: `${board.width} / ${board.height}` }}>
        <img src={board.imageUrl} alt="出題場面の元盤面。自分の手牌だけを選択できます" onError={() => setFailedImage(true)} />
        {!failedImage && board.regions.map((r, i) => <button key={i} type="button" aria-label={label(i)} aria-pressed={i === pick} disabled={answered} className={`source-tile-hit preview-hit${resultClass(i)}`} style={{ left: `${r.x / board.width * 100}%`, top: `${r.y / board.height * 100}%`, width: `${r.width / board.width * 100}%`, height: `${r.height / board.height * 100}%` }} onClick={() => choose(i)} />)}
      </div>
      {failedImage ? <p className="error" role="alert">盤面画像を読み込めませんでした。再読み込みするか、<a href={board.imageUrl} target="_blank" rel="noreferrer">元画像を開く</a>から確認してください。</p> : <>
        <figcaption>{answered ? "選んだ牌を枠で表示しています" : "自分の手牌をタップして回答"}<a href={board.imageUrl} target="_blank" rel="noreferrer">盤面を拡大</a></figcaption>
      </>}
    </figure>;
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
  return <p className={`tile-result ${result.correct ? "correct" : "incorrect"}`} role="status">{result.correct ? "正解" : "不正解"} · 選んだ牌：{tileName(result.tile)}<span>正解候補：{data.correctTiles.map(tileName).join("・")}</span></p>;
}
