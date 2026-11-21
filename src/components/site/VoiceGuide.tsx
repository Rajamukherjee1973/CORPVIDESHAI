import { useCallback, useRef, useState } from "react";
import { createParser } from "eventsource-parser";
import { LANGUAGES } from "@/lib/routes-detail";

type Status = "idle" | "preparing" | "speaking" | "error";

/**
 * Streams a spoken narration of the current step in any of the offered
 * languages. Audio is generated server-side and played back as it arrives.
 */
export function useNarrator() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setStatus("idle");
  }, []);

  const speak = useCallback(
    async (text: string, language: string) => {
      stop();
      setError(null);
      setStatus("preparing");
      const controller = new AbortController();
      abort.current = controller;
      const ctx = new AudioContext({ sampleRate: 24000 });
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      let playhead = 0;
      let pending = new Uint8Array(0);

      const push = (incoming: Uint8Array) => {
        const bytes = new Uint8Array(pending.length + incoming.length);
        bytes.set(pending);
        bytes.set(incoming, pending.length);
        const usable = bytes.length - (bytes.length % 2);
        pending = bytes.slice(usable);
        if (usable === 0) return;
        const samples = new Int16Array(bytes.buffer, 0, usable / 2);
        const floats = Float32Array.from(samples, (s) => s / 32768);
        const buffer = ctx.createBuffer(1, floats.length, 24000);
        buffer.copyToChannel(floats, 0);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        if (playhead === 0) playhead = ctx.currentTime + 0.05;
        else playhead = Math.max(playhead, ctx.currentTime);
        src.start(playhead);
        playhead += buffer.duration;
      };

      try {
        const res = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
        setStatus("speaking");
        const parser = createParser({
          onEvent(event) {
            let payload: { type?: string; audio?: string };
            try {
              payload = JSON.parse(event.data);
            } catch {
              return;
            }
            if (payload.type !== "speech.audio.delta" || !payload.audio) return;
            const bin = atob(payload.audio);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            push(bytes);
          },
        });
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          parser.feed(value);
        }
        setStatus("idle");
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message.slice(0, 160) : "Narration unavailable");
        setStatus("error");
      }
    },
    [stop],
  );

  return { speak, stop, status, error };
}

export function LanguagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        Narration language · {LANGUAGES.length} available
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.label}>
            {l.label} — {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
