import { startTransition, useEffect, useState, type ReactNode } from "react";

/** Paints the page shell first, then mounts heavy content in a non-blocking transition so navigation feels instant. */
export function Deferred({ children, minHeight = 600, label = "Loading desk" }: { children: ReactNode; minHeight?: number; label?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => startTransition(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  if (ready) return <>{children}</>;
  return (
    <div aria-busy="true" aria-label={label} style={{ minHeight }} className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="h-1 w-24 animate-pulse bg-primary motion-reduce:animate-none" />
      <div className="mt-6 h-12 w-2/3 animate-pulse bg-muted motion-reduce:animate-none" />
      <div className="mt-6 grid gap-px bg-border sm:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-20 animate-pulse bg-muted/60 motion-reduce:animate-none" />)}</div>
    </div>
  );
}
