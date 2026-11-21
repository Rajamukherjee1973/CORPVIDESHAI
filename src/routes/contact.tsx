import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Frame, Rule } from "@/components/site/Frame";
import { AboutNav } from "@/components/site/AboutNav";
import { Button } from "@/components/ui/button";
import { CONTACT, CONTACT_AUDIENCES, CONTACT_TOPICS, contactMessageSchema } from "@/lib/contact";
import { sendContactMessage } from "@/lib/contact.functions";

const TITLE = "Contact — CorpVidesh AI";
const DESC =
  "Reach Team Quantum Leap directly: email, phone and postal address for investors, regulators, corporates and banks, plus a secure message form with a tracking reference.";

export const Route = createFileRoute("/contact")({
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
  component: ContactPage,
});

type Errors = Partial<Record<string, string>>;
const FIELD = "w-full border border-rule/40 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const LABEL = "font-mono-ui block text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

const CHANNELS = [
  {
    n: "01",
    label: "Email",
    value: CONTACT.email,
    note: "Fastest for investors and regulators — we reply within one working day.",
    href: `mailto:${CONTACT.email}`,
    action: "Write to us",
  },
  {
    n: "02",
    label: "Phone",
    value: CONTACT.phone,
    note: `${CONTACT.hours}. For walkthrough scheduling and urgent demo questions.`,
    href: `tel:${CONTACT.phoneHref}`,
    action: "Call the team",
  },
  {
    n: "03",
    label: "Post & campus",
    value: CONTACT.addressLines[1],
    note: CONTACT.addressLines.filter((_, i) => i !== 1).join(" · "),
    href: "https://www.google.com/maps/search/Brainware+University+Barasat+Kolkata",
    action: "Open in maps",
  },
] as const;

function ContactPage() {
  const submit = useServerFn(sendContactMessage);
  const [form, setForm] = useState({ fullName: "", workEmail: "", organisation: "", audience: "", topic: "", message: "", website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<{ status: "idle" | "sending" | "error"; msg?: string } | { status: "done"; reference: string; duplicate: boolean }>({ status: "idle" });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = contactMessageSchema().safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setState({ status: "sending" });
    try {
      const res = await submit({ data: form });
      setState({ status: "done", reference: res.reference, duplicate: res.duplicate });
    } catch {
      setState({ status: "error", msg: "We could not send your message. Please check your connection and try again — or email us directly." });
    }
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-primary" role="alert">{errors[k]}</p> : null);

  return (
    <Frame>
      <AboutNav />
      <section className="mx-auto max-w-[1400px] px-6 pb-12 pt-12">
        <Rule label="About · 06 — Contact" />
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl">
              Talk to the team
              <span className="text-primary"> directly.</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Investors, regulators, corporates and AD banks can reach Team Quantum Leap without a form in the way —
              or leave a message here and track it with a reference.
            </p>

            <div className="mt-8 border-t border-rule/20">
              {CHANNELS.map((c) => (
                <div key={c.n} className="grid grid-cols-[2.5rem_1fr] gap-2 border-b border-rule/20 py-5">
                  <span className="font-mono-ui text-[11px] text-primary">{c.n}</span>
                  <div>
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.label}</p>
                    <p className="font-display mt-1 break-words text-2xl leading-tight">{c.value}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{c.note}</p>
                    <a
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noreferrer" : undefined}
                      className="font-mono-ui mt-3 inline-block border border-foreground px-4 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
                    >
                      {c.action}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Want a guided session instead? <Link to="/book-demo" className="text-primary underline underline-offset-4">Book a 45-minute demo</Link> on
              your own scenario.
            </p>
          </div>

          <div className="lg:col-span-7">
            {state.status === "done" ? (
              <div className="border border-primary p-8" role="status">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Message received</p>
                <p className="font-display mt-3 text-4xl">{state.reference}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {state.duplicate ? "We already have a message from this email in the last few minutes — this is its reference. " : ""}
                  Keep this reference. The team will reply to your email — usually within one working day.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={`mailto:${CONTACT.email}`} className="font-mono-ui border border-foreground px-4 py-2.5 text-[10px] uppercase tracking-[0.14em]">Email us directly</a>
                  <Link to="/access" className="font-mono-ui bg-primary px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground">Open the desks</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="border border-rule/20">
                <div className="bg-foreground px-5 py-3 text-background"><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em]">Secure message form</p></div>
                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                  <div><label htmlFor="fullName" className={LABEL}>Full name</label><input id="fullName" autoComplete="name" maxLength={100} value={form.fullName} onChange={set("fullName")} className={`${FIELD} mt-1.5`} />{err("fullName")}</div>
                  <div><label htmlFor="workEmail" className={LABEL}>Email</label><input id="workEmail" type="email" autoComplete="email" maxLength={255} value={form.workEmail} onChange={set("workEmail")} className={`${FIELD} mt-1.5`} />{err("workEmail")}</div>
                  <div><label htmlFor="organisation" className={LABEL}>Organisation (optional)</label><input id="organisation" autoComplete="organization" maxLength={150} value={form.organisation} onChange={set("organisation")} className={`${FIELD} mt-1.5`} />{err("organisation")}</div>
                  <div><label htmlFor="audience" className={LABEL}>You represent</label>
                    <select id="audience" value={form.audience} onChange={set("audience")} className={`${FIELD} mt-1.5`}>
                      <option value="">Select…</option>{CONTACT_AUDIENCES.map((a) => <option key={a}>{a}</option>)}
                    </select>{err("audience")}</div>
                  <div className="sm:col-span-2"><label htmlFor="topic" className={LABEL}>Topic</label>
                    <select id="topic" value={form.topic} onChange={set("topic")} className={`${FIELD} mt-1.5`}>
                      <option value="">Select…</option>{CONTACT_TOPICS.map((t) => <option key={t}>{t}</option>)}
                    </select>{err("topic")}</div>
                  <div className="sm:col-span-2"><label htmlFor="message" className={LABEL}>Your message</label><textarea id="message" rows={5} maxLength={2000} value={form.message} onChange={set("message")} placeholder="Tell us what you would like to explore — a pilot, an investment conversation, a regulatory demonstration…" className={`${FIELD} mt-1.5`} />{err("message")}</div>
                  <div aria-hidden className="absolute -left-[9999px]"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label></div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/15 px-5 py-4 sm:px-6">
                  <p className="max-w-sm text-xs text-muted-foreground">Stored securely and visible only to the team. A prototype contact desk — not legal, tax or investment advice.</p>
                  <Button type="submit" disabled={state.status === "sending"} className="font-mono-ui rounded-none px-6 text-[11px] uppercase tracking-[0.16em]">
                    {state.status === "sending" ? "Sending…" : "Send message"}
                  </Button>
                </div>
                {state.status === "error" ? <p className="border-t border-primary px-6 py-3 text-sm text-primary" role="alert">{state.msg}</p> : null}
              </form>
            )}
          </div>
        </div>
      </section>
    </Frame>
  );
}
