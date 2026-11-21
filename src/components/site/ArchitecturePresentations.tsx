import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRESENTATIONS } from "@/data/presentations";
import { Rule } from "./Frame";

export function ArchitecturePresentations() {
  const [selected, setSelected] = useState<string>("deck3");
  const [preview, setPreview] = useState(false);
  const deck = PRESENTATIONS.find((p) => p.id === selected) ?? PRESENTATIONS[1];
  if (!deck) return null;
  return <section id="documents" className="mx-auto max-w-[1400px] px-6 pb-14">
    <Rule label="Presentation library / revised 13 November 2026" />
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="font-display text-3xl">Legal architecture & investor presentations.</h2><p className="mt-2 text-sm text-muted-foreground">Latest available PDFs, with dated editions and earlier dossiers retained.</p></div>
      <Button variant="link" asChild><Link to="/investors">Investor brief <ExternalLink /></Link></Button>
    </div>
    <div className="mt-5 grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-4">
      {PRESENTATIONS.filter((p) => !p.edition.startsWith("Archive")).map((p, i) => <article key={p.id} className="min-w-0 bg-background p-5">
        <p className="font-mono-ui text-[10px] text-primary">0{i + 1} / {p.kind} · {p.date}</p>
        <h3 className="mt-3 font-display text-2xl">{p.label}</h3><p className="mt-2 text-sm text-muted-foreground">{p.note}</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setSelected(p.id); setPreview(true); }}><FileText /> Preview</Button><Button size="sm" asChild><a href={p.url} download={p.file}><Download /> PDF</a></Button></div>
      </article>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-border py-3">
      <label className="min-w-0 flex-1 text-xs">Presentation edition<select aria-label="Architecture presentation edition" value={selected} onChange={(e) => { setSelected(e.target.value); setPreview(true); }} className="mt-1 block w-full max-w-xl border border-border bg-background p-2 text-sm">
        {PRESENTATIONS.map((p) => <option key={p.id} value={p.id}>{p.label} · {p.pages} pages · {p.date} · {p.edition}</option>)}
      </select></label>
      <Button variant="outline" size="sm" onClick={() => setPreview((v) => !v)} aria-expanded={preview}>{preview ? "Close preview" : "Preview selected"}</Button>
      <Button variant="outline" size="icon" title="Open selected PDF" aria-label="Open selected PDF" asChild><a href={deck.url} target="_blank" rel="noreferrer"><ExternalLink /></a></Button>
      <Button size="icon" title="Download selected PDF" aria-label="Download selected PDF" asChild><a href={deck.url} download={deck.file}><Download /></a></Button>
    </div>
    {preview && <div className="mt-3"><p className="mb-2 text-xs text-muted-foreground">{deck.label} · Created {deck.date} · {deck.edition}</p><iframe title={`${deck.label} PDF preview`} src={`${deck.url}#view=FitH`} className="h-[600px] w-full border border-border bg-secondary" /></div>}
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">The 13 November 2026 pitch deck and synopsis, and the 31 October 2026 architecture and investor editions, explain the latest implemented prototype features, workflows and technology, with clear simulation and production boundaries. PDF dates describe the edition, not verified current law or a fresh full-platform audit. Earlier editions and dossiers remain archived and may describe superseded features. Official filing access, regulator endorsement, certified security and granted patents are not implied.</p>
    <Button variant="link" className="mt-2 px-0" asChild><Link to="/decks">Full presentation desk <ExternalLink /></Link></Button>
  </section>;
}