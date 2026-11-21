import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  clearCaptures,
  downloadCaptures,
  recordCapture,
  useFxCaptures,
  useFxPageContext,
  useFxStream,
  setFxPageContext,
} from "@/lib/fx-stream";

/** Route → desk label and the currency that desk's work is denominated in. */
const DESKS: Record<string, { desk: string; code: string }> = {
  "/": { desk: "Rail overview", code: "USD" },
  "/hubs": { desk: "52 hubs atlas", code: "SGD" },
  "/routes": { desk: "Routes desk", code: "USD" },
  "/casefile": { desk: "Case file", code: "SGD" },
  "/section195": { desk: "Section 195 engine", code: "USD" },
  "/gift": { desk: "GIFT IFSC desk", code: "AED" },
  "/supervisor": { desk: "Supervisor ledger", code: "SGD" },
  "/regulator": { desk: "Approvals queue", code: "USD" },
  "/security": { desk: "Security theatre", code: "USD" },
  "/portal": { desk: "Corporate portal", code: "USD" },
  "/processing": { desk: "Processing", code: "USD" },
  "/worklist": { desk: "Ready list", code: "USD" },
  "/console": { desk: "Treasury console", code: "USD" },
  "/treasury": { desk: "Treasury universe", code: "USD" },
  "/apply": { desk: "Clearance simulator", code: "USD" },
  "/proof": { desk: "Proof desk", code: "USD" },
  "/mechanism": { desk: "Mechanism matrix", code: "USD" },
  "/investors": { desk: "Investor brief", code: "USD" },
  "/decks": { desk: "Live decks", code: "USD" },
  "/access": { desk: "Desk access", code: "USD" },
  "/ssl": { desk: "SSL status", code: "USD" },
};

const HEARTBEAT_MS = 20_000;
const ACTION_THROTTLE_MS = 1200;

/**
 * Automated live-FX capture, mounted once for the whole prototype.
 *
 * On every page it stamps the live tape when the desk opens, on a rolling
 * heartbeat while the desk is in view, and on every treasury action the user
 * takes — so no page can be operated without the rate that priced it being
 * written to the record.
 */
export function FxAutoCapture() {
  const tape = useFxStream();
  const ctx = useFxPageContext();
  const captures = useFxCaptures();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const lastAction = useRef(0);
  useEffect(() => { setHydrated(true); }, []);

  // Declare the page context on navigation, then stamp the open.
  useEffect(() => {
    const d = DESKS[path] ?? { desk: path, code: "USD" };
    setFxPageContext({ desk: d.desk, code: d.code });
    recordCapture(d.desk, "open", `Desk opened — ${path}`, d.code);
  }, [path]);

  // Rolling heartbeat while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      recordCapture(ctx.desk, "heartbeat", "Tape heartbeat", ctx.code, ctx.crore);
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [ctx.desk, ctx.code, ctx.crore]);

  // Every action taken on any desk captures the print that priced it.
  useEffect(() => {
    const onAct = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest(
        "button,[role='button'],a[href],select,input[type='range']",
      ) as HTMLElement | null;
      if (!el || el.closest("[data-fx-nocapture]")) return;
      const now = Date.now();
      if (now - lastAction.current < ACTION_THROTTLE_MS) return;
      lastAction.current = now;
      const label =
        (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "Action")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60) || "Action";
      recordCapture(ctx.desk, "action", label, ctx.code, ctx.crore);
    };
    document.addEventListener("click", onAct, true);
    document.addEventListener("change", onAct, true);
    return () => {
      document.removeEventListener("click", onAct, true);
      document.removeEventListener("change", onAct, true);
    };
  }, [ctx.desk, ctx.code, ctx.crore]);

  const latest = captures[0];
  const live = tape.inrPer[ctx.code];

  // The shared tape and capture history are browser-local; SSR must not render
  // their persisted state until hydration has completed.
  if (!hydrated) return null;

  return (
    <div data-fx-nocapture className="fixed bottom-0 left-0 right-0 z-40 border-t border-rule/20 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <span className="font-mono-ui flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-primary">
          <span className="block h-2 w-2 animate-pulse bg-primary" aria-hidden />
          FX auto-capture · {tape.status}
        </span>
        <span className="font-mono-ui tnum text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {ctx.desk} · {ctx.code}/INR{" "}
          <span className="text-foreground">{live ? live.toFixed(4) : "—"}</span> · print #{tape.seq}
        </span>
        {latest && (
          <span className="font-mono-ui tnum hidden text-[10px] uppercase tracking-[0.12em] text-muted-foreground md:inline">
            Last stamp {new Date(latest.at).toISOString().slice(11, 19)}Z · {latest.trigger} ·{" "}
            <span className="text-primary">{latest.digest}</span>
          </span>
        )}
        <span className="font-mono-ui tnum text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {captures.length} captured
        </span>
        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="font-mono-ui border border-rule/30 px-3 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
          >
            {open ? "Hide log" : "Capture log"}
          </button>
          <button
            type="button"
            onClick={() => downloadCaptures(captures, "csv")}
            className="font-mono-ui border border-rule/30 px-3 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => downloadCaptures(captures, "json")}
            className="font-mono-ui border border-rule/30 px-3 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
          >
            JSON
          </button>
        </span>
      </div>

      {open && (
        <div className="max-h-[38vh] overflow-y-auto border-t border-rule/15">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-background">
              <tr className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                {["Time (UTC)", "Desk", "Trigger", "Action", "Pair", "Rate", "Print", "Digest"].map((h) => (
                  <th key={h} className="border-b border-rule/15 px-4 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {captures.slice(0, 120).map((c) => (
                <tr key={`${c.digest}-${c.at}`} className="font-mono-ui tnum text-[10px]">
                  <td className="border-b border-rule/10 px-4 py-1.5">{c.iso.slice(11, 19)}Z</td>
                  <td className="border-b border-rule/10 px-4 py-1.5">{c.desk}</td>
                  <td className="border-b border-rule/10 px-4 py-1.5 text-primary">{c.trigger}</td>
                  <td className="border-b border-rule/10 px-4 py-1.5">{c.action}</td>
                  <td className="border-b border-rule/10 px-4 py-1.5">{c.code}/INR</td>
                  <td className="border-b border-rule/10 px-4 py-1.5">{c.rate.toFixed(4)}</td>
                  <td className="border-b border-rule/10 px-4 py-1.5">#{c.seq}</td>
                  <td className="border-b border-rule/10 px-4 py-1.5 text-primary">{c.digest}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end px-4 py-3">
            <button
              type="button"
              onClick={clearCaptures}
              className="font-mono-ui border border-rule/30 px-3 py-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Clear session log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}