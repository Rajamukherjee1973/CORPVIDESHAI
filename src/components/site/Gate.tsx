import { Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";

/** Shown when the desk being opened does not belong to the signed-in role. */
export function DeskGate({
  desk,
  need,
  holding,
}: {
  desk: string;
  need: string;
  holding: string | null;
}) {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-24 pt-20">
        <Rule label="Access restricted" />
        <h1 className="font-display max-w-3xl text-5xl leading-[1.04] lg:text-6xl">{desk}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{need}</p>
        <p className="font-mono-ui mt-5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {holding ? `Held on this device: ${holding}` : "No desk identity held on this device."}
        </p>
        <Link
          to="/access"
          className="font-mono-ui mt-8 inline-block bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
        >
          Go to desk access
        </Link>
        <div className="mt-10 max-w-2xl border-l-2 border-primary bg-primary/[0.04] px-4 py-3">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            In plain words
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            This screen belongs to a different job. Sign in with the right desk and it opens.
          </p>
        </div>
      </section>
    </Frame>
  );
}
