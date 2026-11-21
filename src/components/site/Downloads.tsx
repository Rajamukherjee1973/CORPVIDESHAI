import { Rule } from "@/components/site/Frame";
import { PRESENTATIONS } from "@/data/presentations";

export const DOCS = PRESENTATIONS.filter((p) => !p.edition.startsWith("Archive")).map((p) => ({ ...p, title: p.label }));

export function Downloads() {
  return (
    <div>
      <Rule label="Documents" />
      <div className="grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
        {DOCS.map((d) => (
          <a
            key={d.file}
            href={d.url}
            download={d.file}
            className="group block bg-background p-6 transition-colors hover:bg-secondary"
          >
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              {d.kind}
            </p>
            <p className="font-display mt-3 text-3xl leading-tight">{d.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d.note}</p>
            <span className="font-mono-ui mt-5 inline-block border border-primary px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              Download
            </span>
          </a>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
          In plain words —
        </span>{" "}
        revised 31 October 2026: a one-page synopsis, two-page architecture and 22-page investor pitch.
        Earlier 6-, 17- and 24-page dossiers remain available in the presentation library as dated archives.
      </p>
    </div>
  );
}
