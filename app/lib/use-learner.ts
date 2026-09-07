"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LEARNER_KEY,
  newSecret,
  newEvent,
  mergeEvents,
  progressFrom,
} from "./progress.mjs";
import { STORAGE_KEY } from "./lesson.mjs";
import { api, type LearnEvent, type LearningState } from "./notebook-types";
type Cache = {
  secret: string;
  events: LearnEvent[];
  pending: LearnEvent[];
  created: boolean;
  imported: boolean;
};
export function useLearner(enabled = true) {
  const cache = useRef<Cache>({
    secret: "",
    events: [],
    pending: [],
    created: false,
    imported: false,
  });
  const running = useRef<Promise<void> | null>(null),
    generation = useRef(0);
  const [ready, setReady] = useState(false),
    [state, setState] = useState<LearningState>(() => progressFrom([])),
    [status, setStatus] = useState("準備中"),
    [storageWarning, setStorageWarning] = useState(false);
  const publish = useCallback(() => {
    setState(
      progressFrom(mergeEvents(cache.current.events, cache.current.pending)),
    );
    try {
      localStorage.setItem(LEARNER_KEY, JSON.stringify(cache.current));
    } catch {
      setStorageWarning(true);
    }
  }, []);
  const sync = useCallback(async () => {
    if (!cache.current.secret || !enabled) return;
    if (running.current) return running.current;
    const gen = generation.current,
      secret = cache.current.secret;
    const work = async () => {
      try {
        setStatus("同期中");
        if (!cache.current.created) {
          await api("/api/learning/profile", "POST", {}, secret);
          if (gen !== generation.current) return;
          cache.current.created = true;
        }
        let rejected = false;
        do {
          const pending = cache.current.pending.slice(0, 100);
          const result = await api(
            "/api/learning/sync",
            pending.length ? "POST" : "GET",
            pending.length ? { events: pending } : undefined,
            secret,
          );
          if (gen !== generation.current) return;
          cache.current.events = result.events;
          const sent = new Set(pending.map((e) => e.id));
          cache.current.pending = cache.current.pending.filter(
            (e) => !sent.has(e.id),
          );
          publish();
          rejected ||= !!result.rejected?.length;
          setStatus(
            rejected
              ? "教材が更新された記録があります。確認問題を解き直してください。"
              : cache.current.pending.length
                ? "未送信の記録あり"
                : "保存済み",
          );
        } while (cache.current.pending.length && gen === generation.current);
      } catch {
        if (gen === generation.current) setStatus("端末に保存・接続後に同期");
      }
    };
    running.current = work();
    try {
      await running.current;
    } finally {
      running.current = null;
    }
  }, [enabled, publish]);
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = JSON.parse(localStorage.getItem(LEARNER_KEY) ?? "null");
      if (
        saved &&
        /^ensuku-[a-f0-9]{64}$/.test(saved.secret) &&
        Array.isArray(saved.events) &&
        Array.isArray(saved.pending)
      )
        cache.current = saved;
    } catch {
      setStorageWarning(true);
    }
    if (!cache.current.secret) cache.current.secret = newSecret();
    if (!cache.current.imported) {
      try {
        const old = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        if (Array.isArray(old.reviewIds))
          for (const target of old.reviewIds)
            if (typeof target === "string")
              cache.current.pending.push(
                newEvent("review", { target, active: true }),
              );
      } catch {
        /* Old storage is optional and never erased. */
      }
      cache.current.imported = true;
    }
    publish();
    setReady(true);
    void sync();
    const online = () => void sync(),
      timer = setInterval(online, 15000);
    window.addEventListener("online", online);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [enabled, publish, sync]);
  const record = useCallback(
    (
      type: string,
      data: Omit<LearnEvent, "id" | "at" | "type"> & { id?: string },
    ) => {
      const e: LearnEvent = newEvent(type, data);
      if (type === "attempt")
        e.id = "attempt:" + data.sessionId + ":" + data.itemId;
      if (
        mergeEvents(cache.current.events, cache.current.pending).some(
          (v) => v.id === e.id,
        )
      )
        return;
      // Keep previous runs too: an offline restart must not erase earlier flashcard ratings.
      if (type === "session")
        cache.current.pending = cache.current.pending.filter(
          (v) => v.type !== "session" || v.session?.id !== data.session?.id,
        );
      cache.current.pending.push(e);
      publish();
      setStatus("端末に保存");
      void sync();
      return e;
    },
    [publish, sync],
  );
  const restore = async (secret: string) => {
    const normalized = secret.trim();
    const result = await api(
      "/api/learning/sync",
      "GET",
      undefined,
      normalized,
    );
    let pending: LearnEvent[] = [];
    try {
      localStorage.setItem(
        LEARNER_KEY + "-backup-" + cache.current.secret.slice(-16),
        JSON.stringify(cache.current),
      );
      const previous = JSON.parse(
        localStorage.getItem(
          LEARNER_KEY + "-backup-" + normalized.slice(-16),
        ) ?? "null",
      );
      if (previous?.secret === normalized && Array.isArray(previous.pending))
        pending = previous.pending;
    } catch {
      setStorageWarning(true);
    }
    generation.current++;
    cache.current = {
      secret: normalized,
      events: result.events,
      pending,
      created: true,
      imported: true,
    };
    publish();
    setStatus("引継ぎ完了");
  };
  return {
    ready,
    state,
    status,
    storageWarning,
    record,
    sync,
    restore,
    getSecret: () => cache.current.secret,
  };
}
