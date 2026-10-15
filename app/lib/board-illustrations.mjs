import illustrations from "../../content/verified-board-illustrations.json" with { type: "json" };
import checkpoint from "../../content/october-15-checkpoint-board.json" with { type: "json" };
import "./naga-board-state.js";
const bindings = { ...illustrations, ...checkpoint };
// Exact image-URL bindings preserve editable text, question revisions and past
// answers. New/replaced student image URLs are never guessed or reinterpreted.
export function boardIllustration(url) {
  if (!Object.hasOwn(bindings, url)) return null;
  const scene = bindings[url].boardScene;
  if (!globalThis.NagaBoardStateV248.validate(scene).valid ||
      !scene.players.every(p => p.name === "新人" && p.rank === "初級" && p.rating === null)) return null;
  return scene;
}
