import { Link } from "@tanstack/react-router";
import { ENGINE_META } from "@/lib/regulator";
import { STATE_LABEL, countStates, type WorkTask } from "@/lib/worklist";

const STATE_CLASS: Record<WorkTask["state"], string> = {
  done: "bg-primary text-primary-foreground",
  now: "bg-foreground text-background",
  next: "border border-rule/40 text-muted-foreground",
  open: "border border-rule/25 text-muted-foreground",
};

/**
 * The single ready-to-do matrix. One row per task, one owner per row —
 * nothing on this list is executed anywhere else in the prototype.
 */
export function Worklist({
  title,
  caption,
  tasks,
}: {
  title: string;
  caption: string;
  tasks: WorkTask[];
}) {
  const c = countStates(tasks);
  return (
    <div className="border border-rule/25">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-rule/25 bg-primary/[0.04] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{caption}</p>
        </div>
        <p className="font-mono-ui shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {c.done} cleared · {c.now} in hand · {c.pending} pending
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-rule/25 bg-background">
              {["#", "Task", "Who executes it", "Statutory basis / evidence", "Technology", "State", "Desk"].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    className="font-mono-ui px-3 py-2.5 text-[9.5px] uppercase tracking-[0.16em] text-primary"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-rule/15 align-top">
                <td className="font-mono-ui px-3 py-3 text-[11px] text-muted-foreground">
                  {String(t.seq).padStart(2, "0")}
                </td>
                <td className="px-3 py-3">
                  <p className="text-[13.5px] font-medium leading-snug">{t.title}</p>
                  <p className="mt-1 max-w-[36ch] text-[12px] leading-relaxed text-muted-foreground">{t.detail}</p>
                  <p className="font-mono-ui mt-1.5 text-[10px] uppercase tracking-[0.12em] text-primary">
                    Plain words: <span className="normal-case tracking-normal text-muted-foreground">{t.plain}</span>
                  </p>
                </td>
                <td className="px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">{t.owner}</td>
                <td className="px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">{t.basis}</td>
                <td className="px-3 py-3">
                  <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-primary">
                    {ENGINE_META[t.engine].label}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`font-mono-ui inline-block px-2 py-1 text-[9.5px] uppercase tracking-[0.14em] ${STATE_CLASS[t.state]}`}
                  >
                    {STATE_LABEL[t.state]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Link
                    to={t.deskTo}
                    className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-primary underline-offset-4 hover:underline"
                  >
                    {t.deskLabel} →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}