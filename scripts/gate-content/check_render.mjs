// Step 4: render every stem/option/explanation exactly like GateMarkdown does and report problems.
// usage (from repo root): node scripts/gate-content/check_render.mjs GATE2024_EE
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import fs from "fs";

const code = process.argv[2];
const rows = JSON.parse(fs.readFileSync(`.gate-work/${code}/rows_new.json`, "utf8"));
const render = (s) =>
  renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkMath, [remarkGfm, { singleTilde: false }]], rehypePlugins: [[rehypeKatex, { throwOnError: false }]] },
      s
    )
  );
let bad = 0;
for (const r of rows) {
  const u = r.update;
  const parts = [["stem", u.markdown_content], ["expl", u.explanation_markdown],
    ...(u.type !== "NAT" ? (u.options_array || []).map((o) => ["opt-" + o.id, o.markdown]) : [])];
  for (const [n, s] of parts) {
    const h = render(s);
    const text = h.replace(/<span class="katex">[\s\S]*?<\/annotation><\/semantics><\/math><\/span>/g, "").replace(/<[^>]+>/g, "");
    if (/katex-error/.test(h) || /\\[a-zA-Z]+|\$|\|---|gate-source/.test(text) || h.includes("<del>")) {
      bad++;
      console.log("Q" + r.q, n, (h.match(/title="([^"]*)"/) || [])[1] || text.slice(0, 140));
    }
  }
}
console.log("render problems:", bad);
