import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { Downloads } from "@/components/site/Downloads";
import { PRESENTATIONS } from "@/data/presentations";

const TITLE = "Presentations — Synopsis, Architecture & Investor Deck | CorpVidesh AI";
const DESC =
  "Dated CorpVidesh AI presentations: one-page synopsis, two-page architecture, 22-page investor pitch and archived 6-, 17- and 24-page dossiers.";

export const Route = createFileRoute("/decks")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DecksPage,
});

const DECKS = PRESENTATIONS;

function DecksPage() {
  const [active, setActive] = useState<(typeof DECKS)[number]["id"]>("vc22");
  const [page, setPage] = useState(1);
  const deck = DECKS.find((d) => d.id === active) ?? DECKS[0];

  const go = (p: number) => setPage(Math.min(deck.pages, Math.max(1, p)));

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pt-16">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
          Presentation library / dated editions
        </p>
        <h1 className="font-display mt-4 max-w-4xl text-5xl leading-[1.02] md:text-7xl">
          Synopsis. Architecture. Investor pitch.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Explore the latest available presentations and earlier archived dossiers. Each PDF is a dated snapshot,
          not an automatically regenerated account of the current prototype.
        </p>
      </section>

      <section className="mx-auto mt-14 max-w-[1400px] px-6">
        <Rule label="Live presentation" />
        <div className="flex flex-wrap items-center gap-px bg-rule/15">
          {DECKS.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setActive(d.id);
                setPage(1);
              }}
              className={`font-mono-ui px-6 py-4 text-[11px] uppercase tracking-[0.16em] ${
                active === d.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-primary"
              }`}
            >
              {d.label} — {d.kind} · {d.date}{d.edition.startsWith("Archive") ? " · Archive" : ""}
            </button>
          ))}
        </div>

        <div className="mt-px border border-rule/25">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/15 px-6 py-4">
            <p className="text-sm text-muted-foreground">{deck.note} · Created {deck.date} · {deck.edition}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => go(page - 1)}
                className="font-mono-ui border border-rule/25 px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
              >
                Prev
              </button>
              <span className="tnum font-mono-ui text-[11px] uppercase tracking-[0.14em]">
                {String(page).padStart(2, "0")} / {deck.pages}
              </span>
              <button
                onClick={() => go(page + 1)}
                className="font-mono-ui border border-rule/25 px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
              >
                Next
              </button>
              <a
                href={`${deck.url}#page=${page}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono-ui border border-primary px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Full screen
              </a>
              <a
                href={deck.url}
                download={deck.file}
                className="font-mono-ui bg-primary px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-primary-foreground"
              >
                Download
              </a>
            </div>
          </div>

          <div className={`w-full bg-secondary ${deck.aspect}`}>
            <iframe
              key={`${deck.id}-${page}`}
              title={`${deck.label} page ${page}`}
              src={`${deck.url}#page=${page}&view=Fit&toolbar=0&navpanes=0`}
              className="h-full w-full"
            />
          </div>

          <div className="flex flex-wrap gap-px border-t border-rule/15 bg-rule/15 p-px">
            {Array.from({ length: deck.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => go(p)}
                className={`tnum font-mono-ui min-w-[46px] px-3 py-2 text-[11px] ${
                  p === page
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-primary"
                }`}
              >
                {String(p).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
            In plain words —
          </span>{" "}
          this is the same file a regulator or an investor would be sent, playing inside the product itself, so the
          story and the working prototype sit on one screen. The 31 October 2026 editions offer a one-page synopsis,
          a two-page architecture and a 22-page investor pitch. Earlier dossiers remain dated archives; they are not
          updated accounts of the current technology or verified current law.
        </p>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-6">
        <Downloads />
      </section>
      <div className="h-10" />
    </Frame>
  );
}
