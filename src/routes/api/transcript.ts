import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const Route = createFileRoute("/api/transcript")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { lines?: string[]; language?: string };
        const lines = (body.lines ?? []).slice(0, 60).map((l) => String(l).slice(0, 2000));
        const language = body.language ?? "English (India)";
        if (!lines.length) return new Response("Missing lines", { status: 400 });
        if (language.toLowerCase().startsWith("english"))
          return Response.json({ language, lines });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI gateway not configured", { status: 503 });

        const res = await fetch(`${GATEWAY}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You translate regulatory narration scripts. Return ONLY a JSON array of strings, same length and order as the input array. Keep statutory references, institution names and numbers intact.",
              },
              { role: "user", content: `Translate each item into ${language}:\n${JSON.stringify(lines)}` },
            ],
          }),
        });
        if (!res.ok) return new Response(await res.text().catch(() => "Translation failed"), { status: res.status });
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = data.choices?.[0]?.message?.content ?? "";
        const match = raw.match(/\[[\s\S]*\]/);
        let out = lines;
        if (match) {
          try {
            const parsed = JSON.parse(match[0]) as unknown;
            if (Array.isArray(parsed) && parsed.length === lines.length)
              out = parsed.map((v, i) => (typeof v === "string" && v.trim() ? v : lines[i]!));
          } catch {
            /* fall back to source */
          }
        }
        return Response.json({ language, lines: out });
      },
    },
  },
});
