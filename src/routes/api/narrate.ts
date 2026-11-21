import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

async function translate(text: string, language: string, key: string) {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You translate short regulatory narration scripts for a spoken audio guide. Reply with the translation only, no notes, no transliteration, no quotes. Keep statutory references and institution names intact.",
        },
        { role: "user", content: `Translate into ${language}:\n\n${text}` },
      ],
    }),
  });
  if (!res.ok) return text;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || text;
}

export const Route = createFileRoute("/api/narrate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI gateway not configured", { status: 503 });

        const body = (await request.json()) as { text?: string; language?: string };
        const source = (body.text ?? "").slice(0, 3000);
        const language = body.language ?? "English";
        if (!source.trim()) return new Response("Missing text", { status: 400 });

        const spoken =
          language.toLowerCase().startsWith("english") ? source : await translate(source, language, key);

        const res = await fetch(`${GATEWAY}/audio/speech`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: spoken,
            voice: "alloy",
            stream_format: "sse",
            response_format: "pcm",
            instructions: `Speak clearly and calmly in ${language}, at a measured briefing pace suitable for regulators and institutional investors.`,
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          return new Response(detail || "Speech generation failed", { status: res.status });
        }
        return new Response(res.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "X-Spoken-Language": language,
          },
        });
      },
    },
  },
});
