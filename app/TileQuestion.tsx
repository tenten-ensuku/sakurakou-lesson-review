"use client";
import { useState } from "react";
import { BASE_PATH, type TileQuestionData } from "./lib/notebook-types";
import { tileAnswer, tileFile, tileName, tileOptions } from "./lib/tile-question.mjs";
export function TileHand({ data }: { data: TileQuestionData }) {
  return <div className="tile-hand-preview">{tileOptions(data).map((code: string, i: number) => <img key={i} src={`${BASE_PATH}/tiles/${tileFile(code)}`} width={66} height={90} alt={tileName(code)} />)}</div>;
}
export default function TileQuestion({ data, pick, onSubmit }: { data: TileQuestionData; pick?: number; onSubmit: (index: number) => void }) {
  const [selected, setSelected] = useState<number | undefined>(pick);
  const options = tileOptions(data);
  return <div className="tile-question">
    <p className="tile-question-label">{data.label ?? "手牌"}から切る牌を選択</p>
    <div className="tile-choice-scroll"><div className="tile-choice-row" role="group" aria-label="切る牌を選択">
      {options.map((code: string, i: number) => <button key={i} type="button" aria-label={`${i === data.hand.length ? "ツモ牌 " : `${i + 1}枚目 `}${tileName(code)}`} aria-pressed={selected === i} className={(selected === i ? "selected " : "") + (i === data.hand.length ? "draw-tile" : "")} onClick={() => setSelected(i)}>
        <img src={`${BASE_PATH}/tiles/${tileFile(code)}`} width={66} height={90} alt={tileName(code)} />
        {i === data.hand.length && <small>ツモ</small>}
      </button>)}
    </div></div>
    <p className="tile-scroll-hint">手牌は横にスクロールできます。</p>
    <p className="tile-selection" aria-live="polite">{selected === undefined ? "牌をタップ。確定前は選び直せます。" : `${tileName(options[selected])}を選択中`}</p>
    <button className="primary full" disabled={selected === undefined} onClick={() => selected !== undefined && onSubmit(selected)}>この牌で答える</button>
  </div>;
}
export function TileResult({ data, pick }: { data: TileQuestionData; pick: number }) {
  const result = tileAnswer(data, pick);
  if (!result) return null;
  return <p className={`tile-result ${result.correct ? "correct" : "incorrect"}`} role="status">{result.correct ? "正解" : "解説で確認"} · 選んだ牌：{tileName(result.tile)}<span>正解候補：{data.correctTiles.map(tileName).join("・")}</span></p>;
}
