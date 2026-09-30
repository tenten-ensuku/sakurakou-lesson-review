"use client";
import { useState } from "react";
import type { TileQuestionData } from "./lib/notebook-types";
import { normalizeTileQuestion, parseTileCodes, tileCodesText } from "./lib/tile-question.mjs";
import { TileHand } from "./TileQuestion";
export default function TileQuestionEditor({ value, onChange, onValidityChange }: { value?: TileQuestionData | null; onChange: (value: TileQuestionData | null) => void; onValidityChange: (valid: boolean) => void }) {
  const [enabled, setEnabled] = useState(!!value);
  const [fields, setFields] = useState({ hand: tileCodesText(value?.hand), draw: value?.draw ?? "", correct: tileCodesText(value?.correctTiles), label: value?.label ?? "手牌" });
  const parse = (next: typeof fields): TileQuestionData | null => normalizeTileQuestion({ hand: parseTileCodes(next.hand), ...(next.draw.trim() ? { draw: parseTileCodes(next.draw)?.length === 1 ? parseTileCodes(next.draw)?.[0] : "invalid" } : {}), correctTiles: parseTileCodes(next.correct), label: next.label }) as TileQuestionData | null;
  const parsed = parse(fields);
  const update = (field: keyof typeof fields, text: string) => {
    const next = { ...fields, [field]: text }; setFields(next);
    const result = parse(next); onValidityChange(!!result); if (result) onChange(result);
  };
  return <fieldset className="tile-editor">
    <legend>牌を選ぶ問題</legend>
    <label className="tile-editor-toggle"><input type="checkbox" checked={enabled} onChange={(e) => { const active = e.target.checked; setEnabled(active); onValidityChange(!active || !!parsed); onChange(active ? parsed : null); }} />牌をタップして答える</label>
    {enabled && <>
      <p className="muted">例：234m 567p 123s 東ではなく1z。赤5は0m/0p/0s。発=5z、白=6z、中=7z。</p>
      <label>表示名<select value={fields.label} onChange={(e) => update("label", e.target.value)}><option>手牌</option><option>候補牌</option></select></label>
      <label>手牌（ツモ牌を除く）<input value={fields.hand} onChange={(e) => update("hand", e.target.value)} placeholder="234m 567p 123s 11z" /></label>
      <label>ツモ牌（任意・1枚）<input value={fields.draw} onChange={(e) => update("draw", e.target.value)} placeholder="9p" /></label>
      <label>正解牌（複数可）<input value={fields.correct} onChange={(e) => update("correct", e.target.value)} placeholder="8p 9p" /></label>
      {parsed ? <TileHand data={parsed as TileQuestionData} /> : <p className="error" role="alert">手牌と正解牌を確認してください。正解は表示した牌から選びます（合計14枚以下、同種4枚以下）。</p>}
    </>}
  </fieldset>;
}
