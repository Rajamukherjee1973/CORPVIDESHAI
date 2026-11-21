import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Frame, Rule } from "@/components/site/Frame";
import { checkTls, type HostReport } from "@/lib/ssl.functions";
import {
  buildTimeline,
  clearHistory,
  formatDuration,
  isDelay,
  loadHistory,
  recordSample,
  subscribeHistory,
  type SslSample,
  type SslStatus,
} from "@/lib/ssl-history";

const TITLE = "HTTPS / SSL Status — Certificate Watch | CorpVidesh AI";
const DESC =
  "Live certificate and DNS watch for corpvideshai.com: verifies HTTPS issuance, A and _lovable TXT records, and raises an alert when SSL fails or issuance is delayed.";

export const Route = createFileRoute("/ssl")({
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
  component: SslPage,
});

const HOSTS = ["corpvideshai.com", "www.corpvideshai.com"];
/** Lovable issues certificates within minutes; past this an operator should act. */
const DELAY_ALERT_MS = 30 * 60 * 1000;

function useSslWatch() {
  const run = useServerFn(checkTls);
  return useQuery({
    queryKey: ["ssl-watch", HOSTS],
    queryFn: () => run({ data: { hosts: HOSTS } }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

function verdict(r: HostReport) {
  if (r.certificate === "issued")
    return { key: "live" as SslStatus, label: "Certificate live", tone: "ok" as const };
  if (!r.dnsReady) return { key: "dns" as SslStatus, label: "Waiting on DNS", tone: "wait" as const };
  if (r.certificate === "failed")
    return { key: "fail" as SslStatus, label: "SSL failing", tone: "bad" as const };
  return { key: "wait" as SslStatus, label: "Issuing", tone: "wait" as const };
}

const NO_REPORTS: never[] = [];

function SslPage() {
  const { data, isFetching, refetch, error } = useSslWatch();
  const reports = data?.reports ?? NO_REPORTS;
  const [firstSeen] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const announced = useRef<Record<string, string>>({});
  const delayToast = useRef(false);
  const [history, setHistory] = useState<SslSample[]>([]);

  const syncHistory = useCallback(() => setHistory(loadHistory()), []);
  useEffect(() => {
    syncHistory();
    return subscribeHistory(syncHistory);
  }, [syncHistory]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Alert on every state transition, and once when issuance runs long.
  useEffect(() => {
    for (const r of reports) {
      const v = verdict(r);
      recordSample({
        at: Date.parse(r.checkedAt) || Date.now(),
        host: r.host,
        status: v.key,
        label: v.label,
        httpStatus: r.httpStatus,
        latencyMs: r.latencyMs,
        note: r.tlsError,
      });
      const prev = announced.current[r.host];
      if (prev && prev !== v.key) {
        if (v.tone === "ok") toast.success(`${r.host} — certificate issued and serving HTTPS`);
        else if (v.tone === "bad")
          toast.error(`${r.host} — SSL failing`, { description: r.tlsError ?? "TLS handshake refused" });
        else toast(`${r.host} — ${v.label}`);
      }
      announced.current[r.host] = v.key;
    }
    syncHistory();
    const pending = reports.some((r) => verdict(r).tone !== "ok");
    if (pending && !delayToast.current && now - firstSeen > DELAY_ALERT_MS) {
      delayToast.current = true;
      toast.warning("Certificate issuance is delayed", {
        description: "Over 30 minutes without a live certificate. Re-check the A and _lovable TXT records, and any CAA record blocking Let's Encrypt.",
      });
    }
  }, [reports, now, firstSeen, syncHistory]);

  const elapsed = Math.floor((now - firstSeen) / 1000);
  const allLive = reports.length > 0 && reports.every((r) => verdict(r).tone === "ok");

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pt-16">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
          Transport security
        </p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] tracking-tight">
          HTTPS / SSL status
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          This desk polls the live domain every 30 seconds from the server, confirms a trusted
          certificate is actually being served, and checks the DNS records the certificate
          authority depends on. If issuance fails or drags, an alert is raised here and on screen.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3 border border-rule/25 p-4">
          <span
            className={`font-mono-ui px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] ${
              allLive ? "bg-primary text-primary-foreground" : "border border-rule/30 text-muted-foreground"
            }`}
          >
            {allLive ? "All hosts secured" : "Not yet secured"}
          </span>
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Watching for {Math.floor(elapsed / 60)}m {elapsed % 60}s · polls every 30s
          </span>
          <button
            onClick={() => refetch()}
            className="font-mono-ui ml-auto border border-rule/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {isFetching ? "Checking…" : "Check now"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 border border-primary/40 bg-primary/5 p-4 text-sm text-primary">
            The status probe could not run: {(error as Error).message}
          </p>
        ) : null}
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pt-14">
        <Rule label="Per-host certificate report" />
        <div className="grid gap-px bg-rule/15 md:grid-cols-2">
          {reports.length === 0 ? (
            <div className="bg-background p-6 text-sm text-muted-foreground">
              Running the first probe…
            </div>
          ) : null}
          {reports.map((r) => {
            const v = verdict(r);
            return (
              <article key={r.host} className="bg-background p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl tracking-tight">{r.host}</h2>
                  <span
                    className={`font-mono-ui px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${
                      v.tone === "ok"
                        ? "bg-primary text-primary-foreground"
                        : v.tone === "bad"
                          ? "border border-primary text-primary"
                          : "border border-rule/40 text-muted-foreground"
                    }`}
                  >
                    {v.label}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <dt className="text-muted-foreground">HTTPS response</dt>
                  <dd className="font-mono-ui">{r.httpStatus ?? "—"}</dd>
                  <dt className="text-muted-foreground">Handshake time</dt>
                  <dd className="font-mono-ui">{r.latencyMs != null ? `${r.latencyMs} ms` : "—"}</dd>
                  <dt className="text-muted-foreground">Redirects to</dt>
                  <dd className="font-mono-ui break-words">{r.redirectedTo ?? "—"}</dd>
                  <dt className="text-muted-foreground">Last checked</dt>
                  <dd className="font-mono-ui">{new Date(r.checkedAt).toLocaleTimeString()}</dd>
                </dl>
                {r.tlsError ? (
                  <p className="mt-3 border-l-2 border-primary pl-3 text-xs text-primary">
                    {r.tlsError}
                  </p>
                ) : null}

                <p className="font-mono-ui mt-5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  DNS prerequisites
                </p>
                <ul className="mt-2 space-y-2">
                  {r.dns.map((d) => (
                    <li key={d.type} className="border border-rule/20 p-3 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono-ui uppercase tracking-[0.14em] text-primary">
                          {d.type}
                        </span>
                        <span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                          {d.ok ? "satisfied" : "missing"}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">Expected: {d.expected}</p>
                      <p className="break-words">Found: {d.found.length ? d.found.join(", ") : "—"}</p>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 border-t border-rule/20 pt-3 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-mono-ui uppercase tracking-[0.14em] text-primary">
                    In plain words:{" "}
                  </span>
                  {v.tone === "ok"
                    ? "Browsers can open this address over a padlocked connection. Nothing to do."
                    : !r.dnsReady
                      ? "The address does not yet point at the rail, so no certificate can be issued. Add the records above at your registrar."
                      : "DNS is correct but the certificate is not serving yet. If this persists past 30 minutes, retry issuance in Project settings → Domains."}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pt-14">
        <Rule label="Issuance timeline — stored on this device" />
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every probe is written down with its timestamp. Repeat readings collapse into one
            entry so each row shows a state and exactly how long it was held — any non-secure
            state held past 30 minutes is flagged as a delay.
          </p>
          <button
            onClick={() => clearHistory()}
            className="font-mono-ui ml-auto border border-rule/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Clear history
          </button>
        </div>
        <div className="grid gap-px bg-rule/15 md:grid-cols-2">
          {HOSTS.map((host) => {
            const events = buildTimeline(history, host, now);
            const delays = events.filter(isDelay);
            return (
              <div key={host} className="bg-background p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl tracking-tight">{host}</h2>
                  <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {events.length} state{events.length === 1 ? "" : "s"} ·{" "}
                    {delays.length} delay{delays.length === 1 ? "" : "s"}
                  </span>
                </div>
                {events.length === 0 ? (
                  <p className="mt-4 text-xs text-muted-foreground">No probes recorded yet.</p>
                ) : (
                  <ol className="mt-4 border-l border-rule/25 pl-4">
                    {[...events].reverse().map((e, i) => {
                      const delayed = isDelay(e);
                      return (
                        <li key={`${e.at}-${i}`} className="relative pb-5 last:pb-0">
                          <span
                            className={`absolute -left-[21px] top-1 block h-2.5 w-2.5 ${
                              e.status === "live"
                                ? "bg-primary"
                                : delayed
                                  ? "bg-primary/60"
                                  : "border border-rule/50 bg-background"
                            }`}
                            aria-hidden
                          />
                          <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            {new Date(e.at).toLocaleString()}
                          </p>
                          <p className="mt-1 text-sm">
                            {e.previous ? `${e.previous} → ` : "First reading — "}
                            <span className="text-primary">{e.label}</span>
                          </p>
                          <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Held {formatDuration(e.heldMs ?? 0)}
                            {e.httpStatus != null ? ` · HTTP ${e.httpStatus}` : ""}
                            {e.latencyMs != null ? ` · ${e.latencyMs} ms` : ""}
                          </p>
                          {delayed ? (
                            <p className="mt-2 border-l-2 border-primary bg-primary/5 py-1.5 pl-3 text-xs text-primary">
                              Delay: this state ran past 30 minutes without a live certificate.
                            </p>
                          ) : null}
                          {e.note ? (
                            <p className="mt-1 break-words text-xs text-muted-foreground">{e.note}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pt-14">
        <Rule label="If SSL fails" />
        <ol className="grid gap-px bg-rule/15 md:grid-cols-3">
          {[
            ["01", "Confirm DNS", "A records for @ and www must resolve to 185.158.133.1, and _lovable TXT must carry the verification value from the Domains dialog."],
            ["02", "Clear blockers", "Remove stale A/CNAME records for the same names, and make sure any CAA record permits Let's Encrypt."],
            ["03", "Retry issuance", "In Project settings → Domains, use Retry on a Failed domain once DNS is clean; SSL then provisions automatically."],
          ].map(([n, h, b]) => (
            <li key={n} className="bg-background p-6">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">{n}</p>
              <p className="mt-2 font-display text-xl tracking-tight">{h}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{b}</p>
            </li>
          ))}
        </ol>
      </section>
    </Frame>
  );
}