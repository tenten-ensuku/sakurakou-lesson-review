import { BookOpen, CaretRight, ListBullets, YoutubeLogo } from "@phosphor-icons/react";
import LessonMaterials from "./LessonMaterials";
import { materialDetails } from "./lib/materials.mjs";
import type { Lesson, Resource } from "./lib/notebook-types";

export default function LessonEntry({ lesson, questionCount, noteCount, unansweredCount, reviewCount, progressReady, hasSaved, resources, onStudy, onResources, onList, onNotes, onReview }: {
  lesson: Lesson;
  questionCount: number;
  noteCount: number;
  unansweredCount: number;
  reviewCount: number;
  progressReady: boolean;
  hasSaved: boolean;
  resources: Resource[];
  onStudy: () => void;
  onResources: () => void;
  onList: () => void;
  onNotes: () => void;
  onReview: () => void;
}) {
  const materials = resources.filter((r) => materialDetails(r));
  return <article className="lesson-line" aria-label={`${lesson.date} ${lesson.teacher} ${lesson.title}`}>
    <div className="lesson-heading">
      <span className="lesson-date-badge">{lesson.date}</span>
      <div className="lesson-heading-copy">
        <p className="lesson-teacher">{lesson.teacher}</p>
        <h3>{lesson.title}</h3>
        <p className="lesson-status-line">
          {questionCount > 0 && <span>アプリ内 {questionCount}問</span>}
          {noteCount > 0 && <span>学習メモ {noteCount}枚</span>}
          {hasSaved && <span>途中から再開できます</span>}
        </p>
      </div>
    </div>
    {questionCount > 0 && <div className="lesson-learning-status" aria-label="この授業の復習状況">
      {progressReady ? <>
        <span className={unansweredCount > 0 ? "status-unanswered" : "status-clear"}>未回答 <strong>{unansweredCount}</strong>問</span>
        <span className={reviewCount > 0 ? "status-review" : "status-clear"}>解き直し <strong>{reviewCount}</strong>問</span>
      </> : <span>学習記録を確認中…</span>}
    </div>}
    <LessonMaterials resources={materials} title={lesson.title} />
    <div className="lesson-entry-actions">
      {questionCount > 0 && <button className="lesson-study-entry" onClick={onStudy}>
        <ListBullets size={21} aria-hidden="true" />
        <span>問題を解く<small>{hasSaved ? "続きから" : `${questionCount}問`}</small></span>
        <CaretRight size={18} aria-hidden="true" />
      </button>}
      {materials.length > 0 && <button className="lesson-material-entry" onClick={onResources}>
        <BookOpen size={21} aria-hidden="true" /><span>資料を見る<small>{materials.length}件</small></span>
      </button>}
    </div>
    <div className="lesson-reading-actions">
      {questionCount > 0 && <button onClick={onList}><ListBullets size={18} />問題・解説一覧</button>}
      {noteCount > 0 && <button onClick={onNotes}><BookOpen size={18} />要約・学習メモ</button>}
      {reviewCount > 0 && <button onClick={onReview}>解き直す {reviewCount}問</button>}
    </div>
    {lesson.videoUrl && <a className="lesson-video-text" href={lesson.videoUrl} target="_blank" rel="noreferrer">
      <YoutubeLogo size={20} weight="fill" aria-hidden="true" />授業動画を見る<span className="link-new-tab">（YouTube）</span>
    </a>}
  </article>;
}
