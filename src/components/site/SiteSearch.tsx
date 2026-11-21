import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CornerDownLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { searchGroups } from "@/components/site/nav-data";

/** Every typed word must appear; pages whose title contains the words rank first. */
function matchPage(value: string, search: string, keywords?: string[]): number {
  const v = value.toLowerCase();
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((w) => v.includes(w))) return 0;
  const title = (keywords?.[0] ?? "").toLowerCase();
  return words.every((w) => title.includes(w)) ? 1 : 0.5;
}

/** Jump-to-page palette: Ctrl/⌘ K or "/" opens it from anywhere. */
export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const groups = useMemo(() => searchGroups(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((v) => !v); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (to: string) => { setOpen(false); void navigate({ to }); };
  return (
    <>
      <Button variant="ghost" size="icon" className="rounded-none lg:hidden" aria-label="Search pages" onClick={() => setOpen(true)}><Search /></Button>
      <Button variant="outline" size="sm" className="hidden h-8 gap-2 rounded-none px-2.5 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:inline-flex" aria-label="Find a page" onClick={() => setOpen(true)}>
        <Search className="size-3.5" />
        <span className="hidden xl:inline">Find a page</span>
        <kbd className="hidden border border-border px-1 text-[9px] xl:inline">Ctrl K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-none border-t-4 border-primary p-0">
          <DialogTitle className="sr-only">Find a page</DialogTitle>
          <DialogDescription className="sr-only">Type to filter every desk, document and tool, then press Enter.</DialogDescription>
          <Command className="rounded-none" filter={matchPage}>
            <CommandInput placeholder="Type a desk, hub, agent or document…" />
            <CommandList className="max-h-[60vh]">
              <CommandEmpty>No page matches. Try “hub”, “filing” or “agent”.</CommandEmpty>
              {groups.map((g) => (
                <CommandGroup key={g.heading} heading={g.heading}>
                  {g.items.map((i) => (
                    <CommandItem key={`${g.heading}-${i.to}-${i.label}`} value={`${g.heading} ${i.label} ${i.note ?? ""} ${i.to}`} keywords={[i.label]} onSelect={() => go(i.to)} className="rounded-none">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{i.label}</span>
                        {i.note ? <span className="block truncate text-xs text-muted-foreground">{i.note}</span> : null}
                      </span>
                      <span className="font-mono-ui text-[10px] text-muted-foreground">{i.to}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <div className="flex items-center justify-between border-t border-border px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>↑ ↓ move · <CornerDownLeft className="inline size-3" /> open · Esc close</span>
              <span>Ctrl/⌘ K or /</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
