import { ArrowUpRight, BookOpen, Images } from "@phosphor-icons/react";
import { materialDetails } from "./lib/materials.mjs";
import type { Resource } from "./lib/notebook-types";

export function MaterialLink({
  resource,
  preview = false,
}: {
  resource: Resource;
  preview?: boolean;
}) {
  const detail = materialDetails(resource);
  if (!detail) return null;
  return (
    <a
      className="material-link"
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${detail.title}を${detail.action}（新しいタブ）`}
    >
      {preview && detail.image && (
        <img
          className="material-preview"
          src={resource.url}
          alt={detail.title}
          loading="lazy"
        />
      )}
      <span className="material-copy">
        <strong>{detail.title}</strong>
        <small>{detail.service}</small>
      </span>
      <span className="material-action">
        {detail.image && <Images size={18} aria-hidden="true" />}
        {detail.action}
        <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </a>
  );
}

export default function LessonMaterials({
  resources,
  title,
  onOpen,
}: {
  resources: Resource[];
  title: string;
  onOpen: () => void;
}) {
  const visible = resources.filter((r) => materialDetails(r));
  if (!visible.length) return null;
  return (
    <section className="lesson-materials" aria-label={title + "の授業資料"}>
      <div className="materials-heading">
        <BookOpen size={20} aria-hidden="true" />
        <span>授業資料</span>
        <small>{visible.length}件</small>
      </div>
      {visible.slice(0, 2).map((r) => (
        <MaterialLink key={r.id} resource={r} />
      ))}
      {visible.length > 2 && (
        <button
          className="materials-more"
          onClick={onOpen}
          aria-label={
            title + "のすべての資料を見る（" + visible.length + "件）"
          }
        >
          すべての資料を見る（{visible.length}件）
          <ArrowUpRight size={17} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
