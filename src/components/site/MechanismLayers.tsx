import { useEffect, useRef, useState } from "react";
import { AXES, LAYERS, chainOf, gridFor, scaleLabel, type Level } from "@/lib/mechanism";
import { setMechanismLayer } from "@/lib/readylist.pdf";

function Cell({ v }: { v: Level }) {
  return (
    <div className="flex h-full items-center justify-center bg-background py-3">
      <span
        role="img"
        aria-label={scaleLabel(v)}
        title={scaleLabel(v)}
        className={
          v === 2
            ? "block h-3 w-3 bg-primary"
            : v === 1
              ? "block h-3 w-3 border-2 border-primary"
              : "block h-3 w-3 border-2 border-muted-foreground"
        }
      />
    </div>
  );
}

function FragmentRow({ label, values }: { label: string; values: Level[] }) {
  return (
    <>
      <div className="bg-background p-4">
        <p className="text-sm leading-snug">{label}</p>
      </div>
      {values.map((v, i) => (
        <Cell key={i} v={v} />
      ))}
    </>
  );
}

/** Expandable layer stack. One layer open at a time; clicking an open layer closes it. */
export function LayerStack({
  initialOpen = "L2",
  open: openProp,
  onOpenChange,
}: {
  initialOpen?: string;
  /** Controlled open layer id — keeps the stack in step with the 3D theatre. */
  open?: string;
  onOpenChange?: (id: string) => void;
}) {
  const [inner, setInner] = useState<string>(initialOpen);
  const open = openProp ?? inner;
  const setOpen = (id: string) => {
    if (openProp === undefined) setInner(id);
    onOpenChange?.(id);
  };
  const btns = useRef<Array<HTMLButtonElement | null>>([]);
  const panels = useRef<Record<string, HTMLDivElement | null>>({});
  /** Index of the tab that triggered the last change — focus returns here on collapse. */
  const returnTo = useRef<number | null>(null);

  useEffect(() => {
    setMechanismLayer(open);
  }, [open]);

  // Move focus into the newly expanded panel; return it to the trigger on collapse.
  useEffect(() => {
    if (returnTo.current === null) return;
    const i = returnTo.current;
    returnTo.current = null;
    if (open) panels.current[open]?.focus();
    else btns.current[i]?.focus();
  }, [open]);

  const focusables = (el: HTMLElement) =>
    Array.from(
      el.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((n) => n.offsetParent !== null);

  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, i: number, id: string) => {
    if (e.key === "Escape") {
      e.preventDefault();
      returnTo.current = i;
      setOpen("");
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panels.current[id];
    if (!panel) return;
    const items = [panel, ...focusables(panel)];
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const last = items.length - 1;
    // Trap the cycle inside the expanded layer.
    if (!e.shiftKey && idx === last) {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.shiftKey && idx <= 0) {
      e.preventDefault();
      items[last]?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const last = LAYERS.length - 1;
    const to =
      e.key === "ArrowDown" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowUp" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (to < 0) return;
    e.preventDefault();
    btns.current[to]?.focus();
  };

  return (
        <div className="border border-rule/40">
          {LAYERS.map((l, i) => {
            const active = open === l.id;
            return (
              <div key={l.id} className="border-b border-rule/30 last:border-b-0">
                <button
                  ref={(el) => { btns.current[i] = el; }}
                  type="button"
                  id={`layer-tab-${l.id}`}
                  aria-controls={`layer-panel-${l.id}`}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  onClick={() => {
                    returnTo.current = i;
                    setOpen(active ? "" : l.id);
                  }}
                  aria-expanded={active}
                  className="grid w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-3 px-4 py-5 text-left transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4 sm:px-5"
                >
                  <span
                    className={`font-mono-ui text-[clamp(11px,1vw,14px)] tracking-[0.14em] ${active ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {l.n}
                  </span>
                  <span className="min-w-0">
                    <span className={`font-display block text-[clamp(1.25rem,3vw,1.875rem)] leading-tight ${active ? "text-primary" : ""}`}>
                      {l.name}
                    </span>
                    <span className="mt-1 block text-[clamp(12px,1vw,14px)] leading-relaxed text-muted-foreground">
                      {l.role}
                    </span>
                  </span>
                  <span className="font-mono-ui hidden text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
                    {l.latency}
                    <span className="mt-1 block text-primary">vs {l.manual}</span>
                  </span>
                </button>

                {active ? (
                  <div
                    id={`layer-panel-${l.id}`}
                    role="region"
                    aria-labelledby={`layer-tab-${l.id}`}
                    ref={(el) => { panels.current[l.id] = el; }}
                    tabIndex={-1}
                    onKeyDown={(e) => onPanelKeyDown(e, i, l.id)}
                    className="border-t border-rule/30 bg-primary/[0.03] px-5 pb-7 pt-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                  >
                    <div className="grid gap-px bg-rule/15 lg:grid-cols-3">
                      {[
                        ["Enters the layer", l.input],
                        ["What the layer does", l.action],
                        ["Leaves the layer", l.output],
                      ].map(([t, d]) => (
                        <div key={t} className="bg-background p-5">
                          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                            {t}
                          </p>
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-px grid gap-px bg-rule/15 lg:grid-cols-3">
                      <div className="bg-background p-5">
                        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                          Technology chosen
                        </p>
                        <p className="font-display mt-2 text-xl leading-tight">{l.tech}</p>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.why}</p>
                      </div>
                      <div className="bg-background p-5">
                        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                          Ownership
                        </p>
                        <p className="font-display mt-2 text-xl leading-tight">{l.owner}</p>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          Accountable for the design of this layer and the defensibility of its output.
                        </p>
                      </div>
                      <div className="bg-background p-5">
                        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                          Failure position
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.failsafe}</p>
                        <p className="font-mono-ui mt-4 text-[10px] uppercase tracking-[0.14em]">
                          {l.latency} automated · {l.manual} manual
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-l-2 border-primary bg-background p-5">
                      <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">
                        In plain words
                      </p>
                      <p className="mt-2 text-base leading-relaxed">{l.plain}</p>
                    </div>

                    {/* Chain handoff — every layer names what it receives and what it feeds. */}
                    <div className="mt-px grid gap-px bg-rule/15 md:grid-cols-2">
                      {(() => {
                        const { prev, next } = chainOf(l.id);
                        return (
                          <>
                            <div className="bg-background p-5">
                              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                Received from
                              </p>
                              {prev ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { returnTo.current = i - 1; setOpen(prev.id); }}
                                    className="font-display mt-2 block text-left text-xl leading-tight text-primary underline-offset-4 hover:underline"
                                  >
                                    ← {prev.n} · {prev.name}
                                  </button>
                                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    Hands over: {prev.output}
                                  </p>
                                </>
                              ) : (
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                  Chain origin — the treasury's own intake starts the record.
                                </p>
                              )}
                            </div>
                            <div className="bg-background p-5">
                              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                Sealed and passed to
                              </p>
                              {next ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { returnTo.current = i + 1; setOpen(next.id); }}
                                    className="font-display mt-2 block text-left text-xl leading-tight text-primary underline-offset-4 hover:underline"
                                  >
                                    {next.n} · {next.name} →
                                  </button>
                                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    Which consumes: {next.input}
                                  </p>
                                </>
                              ) : (
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                  Chain terminus — the record stays live for continuing obligations.
                                </p>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
  );
}

/** Cross-layer control matrix grid. */
export function ControlMatrix() {
  return (
    <>
        <p id="control-matrix-caption" className="sr-only">
          Cross-layer control matrix, scrollable horizontally
        </p>
        <div
          className="overflow-x-auto border border-rule/40 focus-visible:outline-2 focus-visible:outline-primary"
          tabIndex={0}
          role="group"
          aria-labelledby="control-matrix-caption"
        >
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[240px_repeat(4,1fr)] gap-px bg-rule/15">
              <div className="bg-background p-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Layer
                </p>
              </div>
              {AXES.map((a) => (
                <div key={a} className="bg-background p-4 text-center">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">{a}</p>
                </div>
              ))}
              {LAYERS.map((l) => (
                <FragmentRow key={l.id} label={`${l.n} · ${l.name}`} values={gridFor(l.id)} />
              ))}
            </div>
          </div>
        </div>

        <div className="font-mono-ui mt-4 flex flex-wrap items-center gap-6 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="block h-3 w-3 bg-primary" /> Full
          </span>
          <span className="flex items-center gap-2">
          <span className="block h-3 w-3 border-2 border-primary" /> Partial
          </span>
          <span className="flex items-center gap-2">
            <span className="block h-3 w-3 border-2 border-muted-foreground" /> None
          </span>
        </div>
    </>
  );
}
