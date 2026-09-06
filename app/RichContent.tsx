import { tokenizeRichText } from "./lib/rich-text.mjs";
import { tokenizeMahjongText } from "./lib/mahjong-tiles.mjs";
import { BASE_PATH } from "./lib/notebook-types";
export default function RichContent({
  text,
  links = true,
}: {
  text: string;
  links?: boolean;
}) {
  const tiles = (s: string) =>
    tokenizeMahjongText(s).map((t, i) =>
      t.type === "text" ? (
        t.value
      ) : (
        <span className="tile-run" key={i}>
          {(t.digits ?? []).map((digit: string, j: number) => (
            <img
              key={j}
              src={
                BASE_PATH +
                "/tiles/" +
                { m: "man", p: "pin", s: "sou", ji: "ji" }[
                  t.suit as "m" | "p" | "s" | "ji"
                ] +
                digit +
                "-66-90-l.png"
              }
              width={66}
              height={90}
              alt={t.source ?? "麻雀牌"}
            />
          ))}
        </span>
      ),
    );
  return (
    <>
      {tokenizeRichText(text).map((t, i) =>
        t.type === "text" ? (
          <span key={i}>{tiles(t.value)}</span>
        ) : t.type === "image" ? (
          <figure className="note-image" key={i}>
            <img src={t.url} alt={t.alt || "教材画像"} loading="lazy" />
            {t.alt && t.alt !== "画像" && <figcaption>{t.alt}</figcaption>}
          </figure>
        ) : links ? (
          <a
            className="link-chip"
            key={i}
            href={t.url}
            target="_blank"
            rel="noreferrer"
          >
            {t.label}
          </a>
        ) : (
          <span className="link-chip" key={i}>
            {t.label}
          </span>
        ),
      )}
    </>
  );
}
