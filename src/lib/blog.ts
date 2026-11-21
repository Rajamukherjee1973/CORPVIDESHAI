/** Engineering blog catalogue. Add new posts at the top; each slug needs its own route file. */
export const BLOG_POSTS = [
  {
    to: "/blog/how-corpvidesh-ai-is-built",
    kicker: "Architecture · Engineering",
    title: "How CorpVidesh AI is built",
    dek: "Layers, domains, record integrity, agents and tests — the engineering behind one pre-validated record for Indian outbound capital.",
    date: "2026-11-18",
    readMin: 12,
    author: "Raja Mukherjee · Team Quantum Leap",
  },
] as const;

export function formatBlogDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}
