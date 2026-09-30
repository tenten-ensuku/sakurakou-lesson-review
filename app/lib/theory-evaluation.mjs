import "./theory-board-renderer.js";
import { normalizeNagaEvaluation } from "./naga-evaluation.mjs";
import { tileOptions } from "./tile-question.mjs";

// Reuse the theory collection's renderer, not a second bar implementation.
// Only its pure overlay API is used; source screenshots retain their own geometry.
const renderer = globalThis.NagaBoardV248;
export const theoryGeometry = renderer.geometry;

export function nagaModelIndex(evaluation, name) {
  const saved = evaluation.models.findIndex(model => model.name === name);
  if (saved >= 0) return saved;
  const nishiki = evaluation.models.findIndex(model => model.name === "ニシキ");
  return nishiki >= 0 ? nishiki : 0;
}

export function sourceBoardEvaluation(question, pick, name) {
  const options = tileOptions(question);
  const data = normalizeNagaEvaluation(question.naga, options);
  if (!data || !question.board || !Number.isInteger(pick) || pick < 0 || pick >= options.length) return null;
  const modelIndex = nagaModelIndex(data, name);
  const models = data.models.map((model, index) => ({ name: model.name, index }));
  const probabilities = Object.fromEntries([...new Set(options)].map(tile => [tile, data.models.map(model => model.rates[tile])]));
  const rates = data.models[modelIndex].rates;
  const recommended = data.kind === "discard" ? Object.keys(rates).reduce((best, tile) => rates[tile] > rates[best] ? tile : best) : null;
  // The reference places the NAGA frame on the draw when it is the recommended tile.
  const recommendedIndex = question.draw === recommended ? options.length - 1 : options.indexOf(recommended);
  const tiles = data.kind === "discard" ? question.board.regions.map((region, index) => ({
    ...region, index, value: rates[options[index]],
    markup: renderer.tileRecommendationsMarkup(options[index], {
      index, models, probabilities, selectedModel: modelIndex,
      player: index === pick, recommended: index === recommendedIndex,
    }),
  })) : [];
  return { data, modelIndex, modelName: models[modelIndex].name, recommended, tiles };
}

// Reset only this attempt. Historical learning events and every other question stay intact.
export function retryTileQuestion(session, key) {
  const tilePicks = { ...session.tilePicks }, tileSignatures = { ...session.tileSignatures }, ratings = { ...session.ratings };
  delete tilePicks[key]; delete tileSignatures[key]; delete ratings[key];
  return { ...session, revealed: false, tilePicks, tileSignatures, ratings };
}
