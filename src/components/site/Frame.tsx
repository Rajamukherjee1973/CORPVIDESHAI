import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ContextStrip } from "@/components/site/ContextStrip";
import { SiteSearch } from "@/components/site/SiteSearch";
import { MobileMenu } from "@/components/site/MobileMenu";
import { FxTicker } from "@/components/site/FxTicker";
import { FxAutoCapture } from "@/components/site/FxAutoCapture";
import { Button } from "@/components/ui/button";
import { saveSession, sessionLabel, useSession, type Session } from "@/lib/session";

import { DIRECTORY, PUBLIC_NAV, isGroup, type NavItem, type NavNode } from "@/components/site/nav-data";

export function navFor(_session: Session | null): NavNode[] {
  return PUBLIC_NAV;
}

const NAV_LINK =
  "px-2.5 py-2 font-mono-ui text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary [&.active]:text-primary";

function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const hoverOpened = useRef(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const activeGroup = items.some((i) => i.to === path || (i.to.startsWith("/blog") && path.startsWith("/blog")));
  const later = (v: boolean, ms: number) => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(v), ms); };
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open || !root.current) return;
    const menuWidth = Math.min(320, window.innerWidth * 0.88);
    const left = root.current.getBoundingClientRect().left;
    // Keep the whole menu inside the viewport with an 8px margin on either side.
    setShift(Math.max(8 - left, Math.min(0, window.innerWidth - 8 - menuWidth - left)));
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const links = () => Array.from(root.current?.querySelectorAll<HTMLAnchorElement>("[role=menuitem]") ?? []);
  const focusAt = (i: number) => { const l = links(); if (l.length) l[(i + l.length) % l.length]!.focus(); };
  const onKey = (e: KeyboardEvent) => {
    const l = links(); const i = l.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === "Escape") { setOpen(false); root.current?.querySelector<HTMLButtonElement>("button")?.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (!open) { setOpen(true); requestAnimationFrame(() => focusAt(0)); } else focusAt(i + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!open) { setOpen(true); requestAnimationFrame(() => focusAt(-1)); } else focusAt(i - 1); }
    else if (open && e.key === "Home") { e.preventDefault(); focusAt(0); }
    else if (open && e.key === "End") { e.preventDefault(); focusAt(-1); }
  };
  return (
    <div
      ref={root}
      className="relative"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") hoverOpened.current = true; later(true, 80); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") hoverOpened.current = false; later(false, 180); }}
      onKeyDown={onKey}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    >
      <Button
        variant="ghost"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => { if (timer.current) clearTimeout(timer.current); if (hoverOpened.current) { hoverOpened.current = false; setOpen(true); } else setOpen((v) => !v); }}
        className={`${NAV_LINK} inline-flex items-center gap-1.5 ${open || activeGroup ? "text-primary" : ""}`}
      >
        {label}
        <span aria-hidden className={`text-[8px] leading-none opacity-70 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
        {activeGroup ? <span aria-hidden className="absolute inset-x-3 bottom-0 h-[2px] bg-primary" /> : null}
      </Button>
      <div
        id={menuId}
        role="menu"
        aria-label={label}
        hidden={!open}
        style={{ left: shift }}
        className="absolute top-full z-50 max-h-[70vh] w-[min(20rem,88vw)] overflow-y-auto border border-rule/20 bg-background shadow-lg"
      >
        <div className="flex items-center justify-between bg-primary px-4 py-1.5 font-mono-ui text-[9px] uppercase tracking-[0.18em] text-primary-foreground">
          <span>{label}</span><span>{items.length} {label === "About" ? "pages" : "desks"}</span>
        </div>
        <ul>
          {items.map((item, i) => {
            const here = item.to === path;
            return (
              <li key={`${item.to}-${item.label}`} className="border-b border-rule/10 last:border-0">
                <Link
                  role="menuitem"
                  to={item.to}
                  aria-current={here ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`group grid grid-cols-[1.75rem_1fr] px-4 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted ${here ? "border-l-2 border-primary bg-muted/40" : "border-l-2 border-transparent"}`}
                >
                  <span className="font-mono-ui text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className={`font-mono-ui block text-[11px] uppercase tracking-[0.12em] group-hover:text-primary ${here ? "text-primary" : "text-foreground"}`}>{item.label}</span>
                    {item.note ? <span className="font-mono-ui mt-1 block text-[10px] tracking-[0.06em] text-muted-foreground">{item.note}</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const nav = navFor(session);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-rule/15 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-baseline gap-2.5" aria-label="CorpVidesh AI home">
            <span className="block h-3.5 w-3.5 bg-primary" aria-hidden />
            <span className="font-display text-xl tracking-tight">CorpVidesh AI</span>
            <span className="font-mono-ui hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground 2xl:block">
              Outbound capital workspace
            </span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-x-0.5 lg:flex">
            {nav.map((n) =>
              isGroup(n) ? (
                <NavDropdown key={n.label} label={n.label} items={n.items} />
              ) : (
                <Link
                  key={`${n.to}-${n.label}`}
                  to={n.to}
                  preload={n.to === "/access" ? "render" : "intent"}
                  activeOptions={{ exact: n.to === "/" }}
                  className={NAV_LINK}
                >
                  {n.label}
                </Link>
              ),
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5">
            <SiteSearch />
            {session ? (
              <span className="hidden items-center gap-2 border-l border-rule/20 pl-3 lg:flex">
                <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-primary">
                  <span className="block max-w-36 truncate" title={sessionLabel(session)}>{sessionLabel(session)}</span>
                </span>
                <Button variant="outline"
                  onClick={() => saveSession(null)}
                  className="font-mono-ui h-8 border border-rule/25 px-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
                >
                  Clear demo desk
                </Button>
              </span>
            ) : (
              <Link
                to="/access"
                preload="render"
                className="font-mono-ui hidden h-8 items-center bg-primary px-3 text-[10px] uppercase tracking-[0.14em] text-primary-foreground sm:inline-flex"
              >
                Open desks
              </Link>
            )}
            <span className="lg:hidden"><MobileMenu /></span>
          </div>
        </div>
      </header>
      <FxTicker compact />
      <ContextStrip />
      <main className="pb-16">{children}</main>
      <footer className="mt-8">
        {/* Brand band */}
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-x-10 gap-y-4 px-6 py-6">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] opacity-80">
                CorpVidesh AI · Regulated rail for Indian outbound corporate capital
              </p>
              <p className="mt-2 font-display text-2xl leading-[1.05] md:text-3xl">Compliance at the speed of settlement.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono-ui text-[10px] uppercase tracking-[0.18em]">
              <span>52 financial hubs + 10 African</span>
              <span>6 Indian regulators</span>
              <span>Sub-9-minute clearance</span>
              <span>GIFT City · IFSC</span>
            </div>
          </div>
        </div>

        {/* Team + posture grid */}
        <div className="border-t border-rule/15 bg-muted/40">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-6 py-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
                Team Quantum Leap
              </p>
              <p className="mt-2 font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Department of Law · Brainware University
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  ["Raja Mukherjee", "Team Lead", "BWU/BBL/25/002"],
                  ["Priyanshu Dhar", "Team Co-Lead", "BWU/BBL/24/158"],
                  ["ADITI KULKARNI", "Concept & Corporate Law Support", "BWU/BBL/25/081"],
                ].map(([name, role, code]) => (
                  <li key={name} className="border-l-2 border-primary/70 pl-4">
                    <p className="font-display text-base leading-tight">{name}</p>
                    <p className="mt-0.5 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {role}
                      {code ? ` · ${code}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-4">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
                Posture
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Data resident in India",
                  "No custody of client funds",
                  "Append-only evidence ledger",
                  "Prototype — not legal advice",
                ].map((p, i) => (
                  <li key={p} className="flex items-baseline gap-3 text-sm">
                    <span className="font-mono-ui text-[10px] tracking-[0.14em] text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-4">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
                All desks
              </p>
              <p className="mt-4 text-sm text-muted-foreground">Press <kbd className="border border-border px-1 font-mono-ui text-[10px]">Ctrl K</kbd> or <kbd className="border border-border px-1 font-mono-ui text-[10px]">/</kbd> on any page to jump straight to a desk.</p><details className="mt-3"><summary className="cursor-pointer text-sm text-muted-foreground">Complete desk directory</summary><div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                {DIRECTORY.map((d, i) => (
                  <Link
                    key={`${d.to}-${i}`}
                    to={d.to}
                    className="font-mono-ui text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary"
                  >
                    {d.label}
                  </Link>
                ))}
              </div></details>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-primary bg-background">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 pb-32 pt-4 sm:pb-20">
            <p className="font-mono-ui text-[11px] tracking-[0.08em] text-foreground">
              All Copyrights Protected @ Raja Mukherjee | Department of Law | Brainware University
            </p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              corpvideshai.com — prototype build · <span className="text-primary">Team Quantum Leap</span>
            </p>
          </div>
        </div>
      </footer>
      <FxAutoCapture />
    </div>
  );
}

export function Rule({ label }: { label: string }) {
  return (
    <div className="mb-8 flex items-center gap-4 border-t border-rule pt-3">
      <h2 className="font-mono-ui text-[10px] font-normal uppercase tracking-[0.22em] text-primary">
        {label}
      </h2>
    </div>
  );
}