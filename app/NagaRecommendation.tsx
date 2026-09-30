"use client";
import { sourceBoardEvaluation } from "./lib/theory-evaluation.mjs";
import type { TileQuestionData } from "./lib/notebook-types";

// ExactEvaluation in ensuku-theory/QuestionPanel.jsx, adapted to measured screenshot
// coordinates. Bar SVGs come byte-for-byte from the reference board renderer.
export default function NagaRecommendation({ data, pick, model, onModelChange }: {
  data: TileQuestionData; pick: number; model?: string; onModelChange: (name: string) => void;
}) {
  const evaluation = sourceBoardEvaluation(data, pick, model);
  if (!evaluation || !data.board) return null;
  const { data: naga, modelIndex, modelName, tiles } = evaluation;
  const board = data.board;
  const call = naga.kind === "call";
  const selected = board.regions[pick];
  return <>
    {!call && tiles.map((tile: { index: number; x: number; y: number; width: number; height: number; markup: string }) =>
      <div key={tile.index} className="source-naga-overlay" aria-hidden="true" style={{ left: `${tile.x / board.width * 100}%`, top: `${(tile.y - tile.height) / board.height * 100}%`, width: `${tile.width / board.width * 100}%`, height: `${2 * tile.height / board.height * 100}%` }} dangerouslySetInnerHTML={{ __html: tile.markup }} />)}
    <svg className="source-naga-values" viewBox={`0 0 ${board.width} ${board.height}`} role="img" aria-label={`NAGA推奨率・${modelName}（%）`}>
      {call && <rect x={selected.x + 1} y={selected.y + 1} width={selected.width - 2} height={selected.height - 2} fill="none" stroke="#ff0000" strokeWidth="2"><title>選んだ牌</title></rect>}
      {!call && tiles.map((tile: { index: number; x: number; y: number; width: number; height: number; value: number }) => tile.value >= 1 ?
        <text key={tile.index} data-exact-value={tile.value} x={tile.x + tile.width / 2} y={tile.y - tile.height * tile.value / 100 - 5} textAnchor="middle" fontSize={12 * tile.width / 29.3} fill="#fff" stroke="#12345e" strokeWidth={2} paintOrder="stroke">
          <title>{modelName}：{tile.value.toFixed(2)}%</title>{tile.value.toFixed(1)}
        </text> : null)}
      {call && <g className="source-call-judgment" transform={`translate(${board.width * 501 / 700} ${board.height * 381 / 650}) scale(${board.width / 700} ${board.height / 650})`}>
        <rect width="130" height="116" rx="6" fill="#083b68" stroke="#ffffff66" />
        <text x="65" y="17" textAnchor="middle" fontSize="13" fill="white">ポン前の副露推奨</text>
        <rect x="27" y="25" width="76" height="62" fill="#e6e6e6" />
        <path d="M27 56H103" stroke="#999" />
        {naga.models.map((m: { name: string; rates: Record<string, number> }, i: number) => <rect key={m.name} data-judgment-model={i} data-exact-value={m.rates.pon} x={32 + i * 66 / naga.models.length} y={87 - m.rates.pon * .62} width={60 / naga.models.length - 2} height={m.rates.pon * .62} fill={i === modelIndex ? "#64c8c8" : "#aaa"}>
          <title>{m.name} ポン {m.rates.pon.toFixed(2)}%</title>
        </rect>)}
        <path d="M27 87H103" stroke="#646464" />
        <text x="65" y="106" textAnchor="middle" fontSize="14" fill="white">ポン {naga.models[modelIndex].rates.pon.toFixed(1)}%</text>
      </g>}
    </svg>
    <select className="source-evaluation-model" aria-label="評価モデル" value={modelName} onChange={e => onModelChange(e.target.value)}>
      {naga.models.map((m: { name: string }) => <option value={m.name} key={m.name}>{m.name}（%）</option>)}
    </select>
  </>;
}
