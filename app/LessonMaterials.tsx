import { ArrowUpRight, Images } from "@phosphor-icons/react";
import { isFeaturedMaterial, materialDetails, orderMaterials } from "./lib/materials.mjs";
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
  const featured = isFeaturedMaterial(resource);
  return (
    <a
      className={"material-link" + (featured ? " material-link--featured" : "")}
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${featured ? "おすすめの復習教材：" : ""}${detail.title}を${featured ? "開く" : detail.action}（新しいタブ）`}
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
        {featured && <span className="material-feature-label">おすすめの復習教材</span>}
        <strong>{detail.title}</strong>
        <small>{featured ? "授業の要約と問題をまとめて復習" : detail.service}</small>
      </span>
      <span className="material-action">
        {detail.image && <Images size={18} aria-hidden="true" />}
        {featured ? "教材を開く" : detail.action}
        <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </a>
  );
}

export default function LessonMaterials({
  resources,
  title,
}: {
  resources: Resource[];
  title: string;
}) {
  const visible = orderMaterials(resources).filter((r) => isFeaturedMaterial(r) && materialDetails(r));
  if (!visible.length) return null;
  return (
    <section className="lesson-materials" aria-label={title + "の授業資料"}>
      {visible.map((r) => (
        <MaterialLink key={r.id} resource={r} />
      ))}
    </section>
  );
}
