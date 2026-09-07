export type Card = {
  id: string | number;
  kind: "question" | "section" | "note";
  question: string;
  answer: string;
  source: "base" | "custom";
  deleted?: boolean;
  sortOrder?: number;
};
export type Lesson = {
  id: string;
  date: string;
  teacher: string;
  title: string;
  videoUrl: string;
  deleted?: boolean;
};
export type Resource = {
  id: string;
  lessonId: string;
  sortOrder: number;
  kind: "link" | "image";
  label: string;
  url: string;
};
export type Notebook = {
  overrides: {
    lessonId: string;
    id: number;
    question: string;
    answer: string;
    deleted?: boolean;
  }[];
  metadata: (Lesson & { lessonId?: string })[];
  lessons: Lesson[];
  cards: (Omit<Card, "source"> & { id: string; lessonId: string })[];
  resources: Resource[];
};
export type Theory = {
  id: string;
  title: string;
  category: string;
  canonical: string;
  conditions: string;
  exceptions: string;
  sourceLabel: string;
  sourceUrl: string;
  lessonIds: string[];
  cardKeys: string[];
  deleted: boolean;
  sortOrder: number;
};
export type Check = {
  id: string;
  theoryId: string;
  type: "choice" | "cloze";
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  lessonIds: string[];
  sortOrder: number;
  deleted: boolean;
  revision: number;
};
export type Catalog = {
  theories: Theory[];
  items: Check[];
  orders: { lessonId: string; cardKey: string; sortOrder: number }[];
};
export type Session = {
  id: string;
  slot: string;
  lessonId: string;
  mode: "flash" | "check" | "theory";
  keys: string[];
  index: number;
  elapsed: number;
  revealed: boolean;
  picks: Record<string, number>;
  ratings: Record<string, "known" | "again">;
  completed: boolean;
  reviewOnly: boolean;
  updatedAt?: string;
};
export type StudyEntry = {
  key: string;
  lesson: Lesson;
  lessonIds: string[];
  number: number;
  type: "flash" | "check";
  label: string;
  question: string;
  answer: string;
  theoryId?: string;
};
export type TheoryProgress = {
  collected: boolean;
  stars: number;
  firstDay: number | null;
  secondDay: number | null;
  needsReview: boolean;
  lastAt: string | null;
};
export type LearningState = {
  theories: Record<string, TheoryProgress>;
  reviewIds: string[];
  answeredIds: string[];
  sessions: Record<string, Session>;
  outfit: string;
  room: boolean;
  lastReviewedAt: string | null;
  stars: number;
  collected: number;
};
export type LearnEvent = {
  id: string;
  at: string;
  type: string;
  target?: string;
  active?: boolean;
  theoryIds?: string[];
  correct?: boolean;
  itemId?: string;
  choiceIndex?: number;
  revision?: number;
  sessionId?: string;
  session?: Session;
  outfit?: string;
  room?: boolean;
};
export const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const keyFor = (lessonId: string, c: Pick<Card, "source" | "id">) =>
  lessonId + ":" + c.source + ":" + c.id;
export async function api(
  path: string,
  method = "GET",
  data?: unknown,
  secret?: string,
) {
  const res = await fetch(API_BASE + path, {
    method,
    cache: "no-store",
    headers: {
      ...(data ? { "content-type": "application/json" } : {}),
      ...(secret ? { authorization: "Bearer " + secret } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "接続できませんでした。");
  return json;
}
