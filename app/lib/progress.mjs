export const LEARNER_KEY = "ensuku-notebook-learner-v1";
export const REWARDS = [
  { id: "base", label: "いつもの相棒", stars: 0 },
  { id: "glasses", label: "まるい眼鏡", stars: 3 },
  { id: "scarf", label: "あったかマフラー", stars: 10 },
  { id: "hat", label: "学びのベレー帽", stars: 20 },
  { id: "room", label: "ひだまりの書斎", stars: 30 },
];
export const jstDay = (value) =>
  Math.floor((Date.parse(value) + 9 * 3600000) / 86400000);
export function mergeEvents(...groups) {
  const map = new Map();
  for (const events of groups)
    for (const e of events ?? []) if (e?.id) map.set(e.id, e);
  return [...map.values()].sort(
    (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id),
  );
}
/** @returns {import("./notebook-types").LearningState} */
export function progressFrom(events) {
  const theories = {},
    reviews = new Set(),
    reviewTheories = new Map(),
    sessions = {};
  let outfit = "base",
    room = false,
    lastReviewedAt = null;
  for (const e of mergeEvents(events)) {
    if (e.type === "review") {
      reviewTheories.set(e.target, e.theoryIds ?? []);
      if (e.active) reviews.add(e.target);
      else reviews.delete(e.target);
      for (const id of e.theoryIds ?? []) {
        const t = theories[id] ?? {
          collected: false,
          stars: 0,
          firstDay: null,
          secondDay: null,
          needsReview: false,
          lastAt: null,
        };
        t.needsReview = e.active;
        theories[id] = t;
      }
    }
    if (e.type === "session") {
      sessions[e.session.slot] = { ...e.session, updatedAt: e.at };
    }
    if (e.type === "outfit") {
      const stars = Object.values(theories).reduce((n, t) => n + t.stars, 0);
      if (
        REWARDS.some(
          (r) => r.id === e.outfit && r.stars <= stars && r.id !== "room",
        )
      )
        outfit = e.outfit;
      if (typeof e.room === "boolean" && (!e.room || stars >= 30))
        room = e.room;
    }
    if (e.type !== "known" && e.type !== "attempt") continue;
    lastReviewedAt = e.at;
    if (e.type === "attempt")
      reviewTheories.set("check:" + e.itemId, e.theoryIds ?? []);
    if (e.type === "attempt" && e.correct) reviews.delete("check:" + e.itemId);
    if (e.type === "attempt" && !e.correct) reviews.add("check:" + e.itemId);
    for (const id of e.theoryIds ?? []) {
      const t = theories[id] ?? {
        collected: false,
        stars: 0,
        firstDay: null,
        secondDay: null,
        needsReview: false,
        lastAt: null,
      };
      t.lastAt = e.at;
      if (e.type === "known") {
        t.collected = true;
      } else if (!e.correct) {
        t.needsReview = true;
      } else {
        t.collected = true;
        t.needsReview = false;
        const day = jstDay(e.at);
        if (t.stars === 0) {
          t.stars = 1;
          t.firstDay = day;
        } else if (t.stars === 1 && day > t.firstDay) {
          t.stars = 2;
          t.secondDay = day;
        } else if (
          t.stars === 2 &&
          day >= t.firstDay + 7 &&
          day > t.secondDay
        ) {
          t.stars = 3;
        }
      }
      theories[id] = t;
    }
  }
  for (const [id, t] of Object.entries(theories))
    t.needsReview = [...reviews].some((key) =>
      (reviewTheories.get(key) ?? []).includes(id),
    );
  return {
    theories,
    reviewIds: [...reviews],
    sessions,
    outfit,
    room,
    lastReviewedAt,
    stars: Object.values(theories).reduce((n, t) => n + t.stars, 0),
    collected: Object.values(theories).filter((t) => t.collected).length,
  };
}
export function teacherView(state) {
  return {
    theories: state.theories,
    reviewIds: state.reviewIds,
    lastReviewedAt: state.lastReviewedAt,
    stars: state.stars,
    collected: state.collected,
  };
}
export function newSecret() {
  return (
    "ensuku-" +
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("")
  );
}
let lastEventTime = 0;
export function newEvent(type, data, at) {
  if (!at) {
    lastEventTime = Math.max(Date.now(), lastEventTime + 1);
    at = new Date(lastEventTime).toISOString();
  }
  return { ...data, type, at, id: crypto.randomUUID() };
}
export function canRate(revealed, editing = false, advancing = false) {
  return Boolean(revealed && !editing && !advancing);
}
export function snapshotSession(session) {
  return { ...session, elapsed: Math.max(0, Math.floor(session.elapsed ?? 0)) };
}
