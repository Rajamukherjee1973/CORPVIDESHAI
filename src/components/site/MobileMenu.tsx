import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PUBLIC_NAV, isGroup } from "@/components/site/nav-data";

/** Phone and tablet menu: every header group in one scrollable panel. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { setOpen(false); }, [path]);
  const item = (to: string, label: string, note?: string) => (
    <Link key={`${to}-${label}`} to={to} aria-current={path === to ? "page" : undefined}
      className={`block border-l-2 px-3 py-2.5 ${path === to ? "border-primary bg-muted/50 text-primary" : "border-transparent hover:bg-muted/40"}`}>
      <span className="block text-sm">{label}</span>
      {note ? <span className="block text-xs text-muted-foreground">{note}</span> : null}
    </Link>
  );
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-none" aria-label="Open menu"><Menu /></Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,92vw)] overflow-y-auto rounded-none border-l-4 border-primary p-0">
        <div className="bg-primary px-5 py-4 text-primary-foreground">
          <SheetTitle className="font-display text-xl text-primary-foreground">CorpVidesh AI</SheetTitle>
          <SheetDescription className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary-foreground/80">All desks · tap to open</SheetDescription>
        </div>
        <nav aria-label="Mobile navigation" className="pb-8">
          {PUBLIC_NAV.map((n) => isGroup(n) ? (
            <section key={n.label} className="border-b border-border px-2 py-3">
              <p className="px-3 pb-1 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">{n.label}</p>
              {n.items.map((i) => item(i.to, i.label, i.note))}
            </section>
          ) : (
            <div key={n.to} className="border-b border-border px-2 py-3">{item(n.to, n.label)}</div>
          ))}
          <div className="px-5 pt-4">
            <Button asChild className="w-full rounded-none"><Link to="/access">Open desks</Link></Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
