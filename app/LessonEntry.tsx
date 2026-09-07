import { BookOpen, CaretRight, ListBullets, YoutubeLogo } from "@phosphor-icons/react";
import LessonMaterials from "./LessonMaterials";
import { materialDetails } from "./lib/materials.mjs";
import type { Lesson, Resource } from "./lib/notebook-types";

export default function LessonEntry({ lesson, questionCount, noteCount, reviewCount, hasSaved, resources, onStudy, onResources }: {
  lesson: Lesson;
  questionCount: number;
  noteCount: number;
  reviewCount: number;
  hasSaved: boolean;
  resources: Resource[];
  onStudy: () => void;
  onResources: () => void;
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
          {hasSaved && <span>途中保存あり</span>}
          {reviewCount > 0 && <span>解き直し {reviewCount}問</span>}
        </p>
      </div>
    </div>
    <LessonMaterials resources={materials} title={lesson.title} />
    <div className="lesson-entry-actions">
      {(questionCount > 0 || noteCount > 0) && <button className="lesson-study-entry" onClick={onStudy}>
        <ListBullets size={21} aria-hidden="true" />
        <span>{questionCount > 0 ? "問題を解く" : "学習メモを読む"}<small>{questionCount > 0 ? `${questionCount}問` : `${noteCount}枚`}</small></span>
        <CaretRight size={18} aria-hidden="true" />
      </button>}
      {materials.length > 0 && <button className="lesson-material-entry" onClick={onResources}>
        <BookOpen size={21} aria-hidden="true" /><span>資料を見る<small>{materials.length}件</small></span>
      </button>}
    </div>
    {lesson.videoUrl && <a className="lesson-video-text" href={lesson.videoUrl} target="_blank" rel="noreferrer">
      <YoutubeLogo size={20} weight="fill" aria-hidden="true" />授業動画を見る<span className="link-new-tab">（YouTube）</span>
    </a>}
  </article>;
}
