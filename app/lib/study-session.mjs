// A study run contains questions only. Teaching notes remain in the notebook.
/** @returns {{key:string,type:"flash"|"check"}[]} */
export function lessonStudyEntries(lessonId, cards, checks, orders = []) {
  const order = new Map(orders.filter((o) => o.lessonId === lessonId).map((o) => [o.cardKey, o.sortOrder]));
  const entries = [
    ...cards.filter((c) => !c.deleted && c.kind === "question").map((c, i) => ({
      key: `${lessonId}:${c.source}:${c.id}`, type: "flash",
      sort: order.get(`${lessonId}:${c.source}:${c.id}`) ?? 100000 + (c.sortOrder ?? i + 1),
    })),
    ...checks.filter((q) => !q.deleted).map((q, i) => ({
      key: "check:" + q.id, type: "check",
      sort: order.get("check:" + q.id) ?? 100000 + (q.sortOrder ?? i + 1),
    })),
  ];
  return entries.sort((a, b) => a.sort - b.sort).map(({ key, type }) => ({ key, type }));
}

/** Preserve the current question, not the old index of a removed summary. */
export function resumeStudySession(session, availableKeys, mode = session.mode) {
  const alias = (key) => mode === "mixed" && ["check", "theory"].includes(session.mode) && !key.startsWith("check:") ? "check:" + key : key;
  const available = new Set(availableKeys);
  const previous = session.keys.map(alias);
  const kept = previous.filter((key) => available.has(key));
  if (!kept.length) return null;
  const keys = [...new Set([...kept, ...(mode === "mixed" ? availableKeys : [])])];
  const current = previous[session.index];
  const target = available.has(current) ? current : previous.slice(session.index).find((key) => available.has(key)) ?? kept.at(-1);
  return {
    ...session, mode, keys, index: keys.indexOf(target),
    slot: mode === "mixed" ? `mixed:${session.lessonId}${session.reviewOnly ? ":review" : ""}` : session.slot,
    revealed: target === current && session.revealed,
    // Removed/deleted questions must not make an otherwise valid checkpoint fail.
    tilePicks: Object.fromEntries(Object.entries(session.tilePicks ?? {}).filter(([key]) => available.has(key))),
  };
}

/** Do not resurrect an old flash/check slot after its mixed successor completed. */
export function resumableStudySessions(sessions) {
  const latest = new Map();
  for (const s of [...sessions].sort((a, b) => (a.updatedAt ?? "").localeCompare(b.updatedAt ?? "")))
    latest.set(`${s.lessonId}:${s.reviewOnly ? "review" : "all"}`, s);
  return [...latest.values()].filter((s) => !s.completed).sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export function studyResults(session, checks) {
  const values = session.keys.flatMap((key) => {
    const checkId = key.startsWith("check:") ? key.slice(6) : ["check", "theory"].includes(session.mode) ? key : null;
    if (checkId !== null) {
      const pick = session.picks[checkId];
      return pick === undefined ? [] : [checks.find((q) => q.id === checkId)?.correctIndex === pick];
    }
    return session.ratings[key] === undefined ? [] : [session.ratings[key] === "known"];
  });
  return { answered: values.length, known: values.filter(Boolean).length, remaining: session.keys.length - values.length };
}
