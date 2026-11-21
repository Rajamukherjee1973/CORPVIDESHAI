import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type DnsCheck = {
  type: "A" | "TXT" | "CNAME";
  expected: string;
  found: string[];
  ok: boolean;
};

export type HostReport = {
  host: string;
  url: string;
  /** https reachable => a valid, trusted certificate is being served */
  certificate: "issued" | "failed" | "unreachable";
  httpStatus: number | null;
  redirectedTo: string | null;
  tlsError: string | null;
  latencyMs: number | null;
  dns: DnsCheck[];
  dnsReady: boolean;
  checkedAt: string;
};

const TARGET_A = "185.158.133.1";
const DOH = "https://cloudflare-dns.com/dns-query";

async function resolve(name: string, type: "A" | "TXT" | "CNAME"): Promise<string[]> {
  try {
    const res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
    return (json.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, "").replace(/\.$/, ""));
  } catch {
    return [];
  }
}

async function probe(host: string): Promise<HostReport> {
  const url = `https://${host}/`;
  const started = Date.now();
  let certificate: HostReport["certificate"] = "failed";
  let httpStatus: number | null = null;
  let redirectedTo: string | null = null;
  let tlsError: string | null = null;
  let latencyMs: number | null = null;

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "CorpVidesh-SSL-Monitor" },
      signal: AbortSignal.timeout(10_000),
    });
    latencyMs = Date.now() - started;
    httpStatus = res.status;
    redirectedTo = res.headers.get("location");
    certificate = "issued";
  } catch (e) {
    latencyMs = Date.now() - started;
    const msg = e instanceof Error ? e.message : String(e);
    tlsError = msg;
    certificate = /cert|ssl|tls|handshake/i.test(msg) ? "failed" : "unreachable";
  }

  const apex = host.replace(/^www\./, "");
  const [aRecords, txtRecords, cnames] = await Promise.all([
    resolve(host, "A"),
    resolve(`_lovable.${apex}`, "TXT"),
    resolve(host, "CNAME"),
  ]);

  const dns: DnsCheck[] = [
    {
      type: "A",
      expected: TARGET_A,
      found: aRecords,
      ok: aRecords.includes(TARGET_A) || cnames.length > 0,
    },
    {
      type: "TXT",
      expected: "_lovable = lovable_verify=…",
      found: txtRecords,
      ok: txtRecords.some((t) => t.startsWith("lovable_verify=")),
    },
    { type: "CNAME", expected: "proxy setups only", found: cnames, ok: true },
  ];

  return {
    host,
    url,
    certificate,
    httpStatus,
    redirectedTo,
    tlsError,
    latencyMs,
    dns,
    dnsReady: dns[0]!.ok && dns[1]!.ok,
    checkedAt: new Date().toISOString(),
  };
}

export const checkTls = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ hosts: z.array(z.string().min(3).max(253)).min(1).max(6) }).parse(d),
  )
  .handler(async ({ data }) => {
    const reports = await Promise.all(data.hosts.map((h) => probe(h.toLowerCase())));
    return { reports, checkedAt: new Date().toISOString() };
  });