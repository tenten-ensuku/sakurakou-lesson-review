// Display-only source data. Never use these rates for the lesson's grading.
export function normalizeNagaEvaluation(value, options) {
  if (!value || typeof value !== "object" || !["discard", "call"].includes(value.kind) || !Array.isArray(options) || !options.length) return null;
  const { kind, reportId, tw, ts, tv, handSnapshot, models } = value;
  if (typeof reportId !== "string" || !/^[a-zA-Z0-9_-]{20,160}$/.test(reportId) ||
      !Number.isInteger(tw) || tw < 0 || tw > 3 || !Number.isInteger(ts) || ts < 0 || ts > 99 ||
      !Number.isInteger(tv) || tv < 0 || tv > 10000 || !Array.isArray(handSnapshot) ||
      handSnapshot.length !== options.length || handSnapshot.some((tile, i) => tile !== options[i]) ||
      !Array.isArray(models) || !models.length || models.length > 5) return null;
  const keys = kind === "discard" ? [...new Set(options)] : ["pon", "pass"];
  const clean = [], names = new Set();
  for (const model of models) {
    if (!model || typeof model.name !== "string" || !model.name.trim() || model.name.length > 40 || names.has(model.name) ||
        !model.rates || typeof model.rates !== "object" || Array.isArray(model.rates) ||
        Object.keys(model.rates).length !== keys.length || keys.some(k => !Number.isFinite(model.rates[k]) || model.rates[k] < 0 || model.rates[k] > 100)) return null;
    clean.push({ name: model.name, rates: Object.fromEntries(keys.map(k => [k, model.rates[k]])) });
    names.add(model.name);
  }
  // Only a verified red/ordinary-five correction may preserve an old pick.
  // The answer candidates, tile positions and board signature stay unchanged.
  const previous = value.previousHandSnapshot;
  if (previous !== undefined) {
    if (!Array.isArray(previous) || previous.length !== options.length || !previous.some((tile, i) => tile !== options[i])) return null;
    const invalidCorrection = previous.some((tile, i) => {
      if (typeof tile !== "string") return true;
      if (tile === options[i]) return false;
      return !/^[05][mps]$/.test(tile) || !/^[05][mps]$/.test(options[i]) || tile.replace(/^0/, "5") !== options[i].replace(/^0/, "5");
    });
    if (invalidCorrection) return null;
  }
  return { kind, reportId, tw, ts, tv, handSnapshot: [...options], models: clean,
    ...(previous ? { previousHandSnapshot: [...previous] } : {}) };
}
export function nagaSourceUrl(evaluation) {
  return `https://naga.dmv.nico/htmls/report_viewer.html?report_id=${encodeURIComponent(evaluation.reportId)}&tw=${evaluation.tw}&ts=${evaluation.ts}&tv=${evaluation.tv}`;
}
export function nagaDisplayRows(evaluation, selected) {
  const keys = Object.keys(evaluation.models[0].rates);
  if (evaluation.kind === "call") return keys;
  return keys.filter(k => k === selected || Math.max(...evaluation.models.map(m => m.rates[k])) >= 0.5)
    .sort((a, b) => Math.max(...evaluation.models.map(m => m.rates[b])) - Math.max(...evaluation.models.map(m => m.rates[a])));
}
