import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { AboutNav } from "@/components/site/AboutNav";
import { BLOG_POSTS, formatBlogDate } from "@/lib/blog";

const TITLE = "Engineering Blog — CorpVidesh AI";
const DESC = "Architecture notes from Team Quantum Leap on how CorpVidesh AI is designed, built, tested and kept honest.";

export const Route = createFileRoute("/blog/")({
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
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <Frame>
      <AboutNav />
      <section className="mx-auto max-w-[1400px] px-6 pb-12 pt-12">
        <Rule label="About · 05 — Engineering blog" />
        <h1 className="font-display max-w-4xl text-5xl leading-[1.02] sm:text-6xl">
          Engineering notes.
          <span className="text-primary"> Built in the open.</span>
        </h1>
        <ol className="mt-10 border-t border-foreground">
          {BLOG_POSTS.map((p, i) => (
            <li key={p.to} className="border-b border-rule/20">
              <Link to={p.to} className="group grid gap-4 py-8 md:grid-cols-12">
                <span className="font-mono-ui text-[11px] text-primary md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
                <span className="md:col-span-8">
                  <span className="font-mono-ui block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.kicker}</span>
                  <span className="font-display mt-2 block text-3xl group-hover:text-primary sm:text-4xl">{p.title}</span>
                  <span className="mt-3 block max-w-2xl text-muted-foreground">{p.dek}</span>
                </span>
                <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:col-span-3 md:text-right">
                  {formatBlogDate(p.date)}<br />{p.readMin} min read<br /><span className="text-primary">Read →</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </Frame>
  );
}
