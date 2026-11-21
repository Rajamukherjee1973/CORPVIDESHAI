import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Frame, Rule } from "@/components/site/Frame";
import { AboutNav } from "@/components/site/AboutNav";
import { Button } from "@/components/ui/button";
import { DEMO_AUDIENCES, DEMO_FOCUS, DEMO_SLOTS, demoBookingSchema, earliestDemoDate } from "@/lib/demo-booking";
import { bookDemo } from "@/lib/demo-booking.functions";

const TITLE = "Book a Demo — CorpVidesh AI";
const DESC =
  "Request a guided CorpVidesh AI walkthrough for your treasury, bank, regulator team or fund: pick a date, time slot and the desks you want to see.";

export const Route = createFileRoute("/book-demo")({
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
  component: BookDemo,
});

type Errors = Partial<Record<string, string>>;
const FIELD = "w-full border border-rule/40 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const LABEL = "font-mono-ui block text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

function BookDemo() {
  const submit = useServerFn(bookDemo);
  const [form, setForm] = useState({ fullName: "", workEmail: "", organisation: "", audience: "", preferredDate: "", timeSlot: "", message: "", website: "" });
  const [focus, setFocus] = useState<string[]>([DEMO_FOCUS[0]]);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<{ status: "idle" | "sending" | "error"; msg?: string } | { status: "done"; reference: string; duplicate: boolean }>({ status: "idle" });
  const minDate = useMemo(() => earliestDemoDate(), []);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = { ...form, focus };
    const parsed = demoBookingSchema().safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setState({ status: "sending" });
    try {
      const res = await submit({ data: payload });
      setState({ status: "done", reference: res.reference, duplicate: res.duplicate });
    } catch {
      setState({ status: "error", msg: "We could not save your request. Please check your connection and try again." });
    }
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-primary" role="alert">{errors[k]}</p> : null);

  return (
    <Frame>
      <AboutNav />
      <section className="mx-auto grid max-w-[1400px] gap-10 px-6 pb-12 pt-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Rule label="About · 04 — Book a demo" />
          <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl">
            Forty-five minutes.
            <span className="text-primary"> Your scenario, end to end.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Team Quantum Leap walks you through a live case: company and hub selection, route triage, document checklist, Form FC filing,
            the six-lane review and the hash-chained proof packet.
          </p>
          <ol className="mt-8 border-t border-rule/20">
            {[["Request", "Tell us who you are and what to show."], ["Confirm", "We reply to your work email to fix the slot."], ["Walkthrough", "Live on the prototype, on your scenario."]].map(([h, d], i) => (
              <li key={h} className="grid grid-cols-[2.5rem_1fr] border-b border-rule/20 py-4">
                <span className="font-mono-ui text-[11px] text-primary">{String(i + 1).padStart(2, "0")}</span>
                <span><span className="font-display text-lg">{h}</span><span className="block text-sm text-muted-foreground">{d}</span></span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted-foreground">
            Prefer to explore first? Public showcase desks are open on the{" "}
            <Link to="/gift-portal" className="text-primary underline underline-offset-4">GIFT clearance portal</Link> and the{" "}
            <Link to="/regulator-portal" className="text-primary underline underline-offset-4">regulator portal</Link>.
          </p>
        </div>

        <div className="lg:col-span-7">
          {state.status === "done" ? (
            <div className="border border-primary p-8" role="status">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Request received</p>
              <p className="font-display mt-3 text-4xl">{state.reference}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {state.duplicate ? "We already have a request from this email in the last few minutes — this is its reference. " : ""}
                Keep this reference. The team will reply to your work email to confirm the date and time.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/how-it-works" className="font-mono-ui border border-foreground px-4 py-2.5 text-[10px] uppercase tracking-[0.14em]">Study the diagrams</Link>
                <Link to="/access" className="font-mono-ui bg-primary px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground">Open the desks</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="border border-rule/20">
              <div className="bg-foreground px-5 py-3 text-background"><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em]">Demo request form</p></div>
              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                <div><label htmlFor="fullName" className={LABEL}>Full name</label><input id="fullName" autoComplete="name" maxLength={100} value={form.fullName} onChange={set("fullName")} className={`${FIELD} mt-1.5`} />{err("fullName")}</div>
                <div><label htmlFor="workEmail" className={LABEL}>Work email</label><input id="workEmail" type="email" autoComplete="email" maxLength={255} value={form.workEmail} onChange={set("workEmail")} className={`${FIELD} mt-1.5`} />{err("workEmail")}</div>
                <div><label htmlFor="organisation" className={LABEL}>Organisation</label><input id="organisation" autoComplete="organization" maxLength={150} value={form.organisation} onChange={set("organisation")} className={`${FIELD} mt-1.5`} />{err("organisation")}</div>
                <div><label htmlFor="audience" className={LABEL}>You represent</label>
                  <select id="audience" value={form.audience} onChange={set("audience")} className={`${FIELD} mt-1.5`}>
                    <option value="">Select…</option>{DEMO_AUDIENCES.map((a) => <option key={a}>{a}</option>)}
                  </select>{err("audience")}</div>
                <div><label htmlFor="preferredDate" className={LABEL}>Preferred date</label><input id="preferredDate" type="date" min={minDate} value={form.preferredDate} onChange={set("preferredDate")} className={`${FIELD} mt-1.5`} />{err("preferredDate")}</div>
                <div><label htmlFor="timeSlot" className={LABEL}>Time slot</label>
                  <select id="timeSlot" value={form.timeSlot} onChange={set("timeSlot")} className={`${FIELD} mt-1.5`}>
                    <option value="">Select…</option>{DEMO_SLOTS.map((s) => <option key={s}>{s}</option>)}
                  </select>{err("timeSlot")}</div>
                <fieldset className="sm:col-span-2">
                  <legend className={LABEL}>What should we show?</legend>
                  <div className="mt-2 grid gap-px bg-rule/15 sm:grid-cols-2">
                    {DEMO_FOCUS.map((f) => {
                      const on = focus.includes(f);
                      return (
                        <label key={f} className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm ${on ? "bg-primary/[0.07]" : "bg-background"}`}>
                          <input type="checkbox" checked={on} onChange={() => setFocus((cur) => (on ? cur.filter((x) => x !== f) : [...cur, f]))} className="accent-primary" />
                          {f}
                        </label>
                      );
                    })}
                  </div>{err("focus")}
                </fieldset>
                <div className="sm:col-span-2"><label htmlFor="message" className={LABEL}>Your scenario (optional)</label><textarea id="message" rows={4} maxLength={1000} value={form.message} onChange={set("message")} placeholder="e.g. ₹500 crore ODI into a Singapore subsidiary" className={`${FIELD} mt-1.5`} /></div>
                <div aria-hidden className="absolute -left-[9999px]"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label></div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/15 px-5 py-4 sm:px-6">
                <p className="max-w-sm text-xs text-muted-foreground">Used only to arrange your demo. A prototype walkthrough — not legal, tax or investment advice.</p>
                <Button type="submit" disabled={state.status === "sending"} className="font-mono-ui rounded-none px-6 text-[11px] uppercase tracking-[0.16em]">
                  {state.status === "sending" ? "Sending…" : "Request demo"}
                </Button>
              </div>
              {state.status === "error" ? <p className="border-t border-primary px-6 py-3 text-sm text-primary" role="alert">{state.msg}</p> : null}
            </form>
          )}
        </div>
      </section>
    </Frame>
  );
}
