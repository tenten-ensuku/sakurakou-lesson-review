"use client";
import { nagaDisplayRows, nagaSourceUrl } from "./lib/naga-evaluation.mjs";
import { tileName } from "./lib/tile-question.mjs";
import type { NagaEvaluation } from "./lib/notebook-types";

export const NAGA_COLORS = ["#8f5bb5", "#d16388", "#44856d", "#687fba", "#bd822a"];
export default function NagaRecommendation({ data, selected }: { data: NagaEvaluation; selected: string }) {
  const rows: string[] = nagaDisplayRows(data, selected);
  const label = (key: string) => data.kind === "call" ? key === "pon" ? "ポン" : "見送り" : tileName(key);
  return <section className="naga-recommendation" aria-label="NAGAの推奨">
    <header><h3>NAGAの{data.kind === "call" ? "副露判断" : "打牌推奨"}</h3><a href={nagaSourceUrl(data)} target="_blank" rel="noreferrer">解析を開く</a></header>
    {data.kind === "call" && <p className="naga-condition">ポン前の判断です。仮定したポン後の打牌推奨は、この解析にはありません。</p>}
    <div className="naga-table-scroll"><table>
      <caption>推奨率はモデルの選択比率です。授業の採点とは分けて表示します。</caption>
      <thead><tr><th scope="col">{data.kind === "call" ? "行動" : "牌"}</th>{data.models.map((m, i) => <th key={m.name} scope="col"><span className="naga-color" style={{ background: NAGA_COLORS[i] }} />{m.name}</th>)}</tr></thead>
      <tbody>{rows.map(key => <tr key={key} className={key === selected ? "naga-selected" : ""}>
        <th scope="row">{label(key)}{key === selected && <small>選択</small>}</th>
        {data.models.map((m, i) => <td key={m.name}><span className="naga-rate-track" aria-hidden="true"><span style={{ width: `${m.rates[key]}%`, background: NAGA_COLORS[i] }} /></span><span>{m.rates[key].toFixed(2)}%</span></td>)}
      </tr>)}</tbody>
    </table></div>
  </section>;
}
