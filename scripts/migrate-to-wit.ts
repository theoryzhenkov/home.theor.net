#!/usr/bin/env bun
// One-off dogfood migration: seed the wit vault from src/content/pages
// through the API door (write key). Not a product feature.
//
// - JSX component uses → markdown directives (string attrs only; a file
//   with expression attrs is flagged and left repo-managed)
// - relation lists [{page, label}] → wikilink-valued frontmatter
// - nested paths → flat wit slugs; the original route is kept in
//   frontmatter `route` so site URLs never change
// - idempotent: re-running PATCHes existing docs by slug
//
// Usage: WIT_WRITE_KEY=... bun run scripts/migrate-to-wit.ts [--dry-run]

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import yaml from "js-yaml";

const config = JSON.parse(readFileSync("wit.config.json", "utf8")) as {
  url: string;
  vaultId: string;
  keyEnv: string;
};
const KEY = process.env[config.keyEnv];
const DRY = process.argv.includes("--dry-run");
if (!KEY && !DRY) {
  console.error(`missing ${config.keyEnv}`);
  process.exit(1);
}

const CONTENT_ROOT = "src/content/pages";
const RELATION_KEYS = [
  "up", "down", "is", "has", "subclass_of", "superclass_of",
  "part_of", "has_part", "subject", "subject_of", "creator",
  "creator_of", "related",
];
const COMPONENTS: Record<string, string> = {
  ContentTable: "content-table",
  LinkCards: "link-cards",
  NotesFeed: "notes-feed",
};

const slugify = (input: string): string =>
  input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";

const routeToSlug = (route: string): string => slugify(route.replace(/\//g, "-"));

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(md|mdx)$/.test(name)) yield full;
  }
}

interface RelationEntry { page: string; label?: string }

function convertFrontmatter(fm: Record<string, unknown>, route: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fm)) {
    if (RELATION_KEYS.includes(key) && Array.isArray(value)) {
      out[key] = (value as RelationEntry[]).map((r) =>
        r.label ? `[[${routeToSlug(r.page)}|${r.label}]]` : `[[${routeToSlug(r.page)}]]`,
      );
    } else if ((key === "next" || key === "prev") && typeof value === "string") {
      out[key] = `[[${routeToSlug(value)}]]`;
    } else if (value instanceof Date) {
      out[key] = value.toISOString().slice(0, 10);
    } else {
      out[key] = value;
    }
  }
  out["route"] = route; // site URLs stay put; docs are addressed by fm.route
  return out;
}

/** JSX → directives. Only string-literal attrs convert; anything with a
 *  `{` expression flags the file as repo-managed. */
function convertBody(body: string): { text: string; flagged: string | null } {
  const names = Object.keys(COMPONENTS).join("|");
  const expressionAttr = new RegExp(`<(?:${names})[^>]*\\{`);
  if (expressionAttr.test(body)) return { text: body, flagged: "expression attrs" };

  let text = body.replace(
    new RegExp(`^import\\s+.*(?:${names}).*$\\n?`, "gm"),
    "",
  );
  text = text.replace(
    new RegExp(`<(${names})((?:\\s+[a-zA-Z]+="[^"]*")*)\\s*/>`, "g"),
    (_, name: string, attrs: string) => {
      const pairs = [...attrs.matchAll(/([a-zA-Z]+)="([^"]*)"/g)]
        .map(([, k, v]) => `${k}="${v}"`)
        .join(" ");
      return `::${COMPONENTS[name]}${pairs ? `{${pairs}}` : ""}`;
    },
  );
  const leftover = text.match(new RegExp(`<(${names})[\\s>]`));
  if (leftover) return { text: body, flagged: `unconverted <${leftover[1]}>` };
  return { text: text.replace(/\n{3,}/g, "\n\n").trimStart(), flagged: null };
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      ...(init.headers as Record<string, string>),
    },
  });
}

async function upsertDoc(slug: string, text: string): Promise<"created" | "updated"> {
  const create = await api(`/api/vaults/${config.vaultId}/docs`, {
    method: "POST",
    body: JSON.stringify({ slug, text }),
  });
  if (create.status === 201) {
    const { id } = (await create.json()) as { id: string };
    await api(`/api/vaults/${config.vaultId}/docs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ visibility: "public" }),
    });
    return "created";
  }
  if (create.status !== 409) throw new Error(`create ${slug}: ${create.status} ${await create.text()}`);

  const lookup = await api(`/api/content/${config.vaultId}/docs?slug=eq.${slug}`);
  const { items } = (await lookup.json()) as { items: { id: string }[] };
  if (!items[0]) throw new Error(`conflict but no doc for ${slug}`);
  const patch = await api(`/api/vaults/${config.vaultId}/docs/${items[0].id}`, {
    method: "PATCH",
    body: JSON.stringify({ text, visibility: "public" }),
  });
  if (!patch.ok) throw new Error(`patch ${slug}: ${patch.status}`);
  return "updated";
}

let created = 0, updated = 0;
const flagged: string[] = [];

for (const file of walk(CONTENT_ROOT)) {
  const route = relative(CONTENT_ROOT, file).replace(/\.(md|mdx)$/, "");
  if (route.startsWith("_") || route.startsWith("scratch")) continue; // drafts stay home
  const raw = readFileSync(file, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    flagged.push(`${route}: no frontmatter`);
    continue;
  }
  const fm = (yaml.load(match[1]!) ?? {}) as Record<string, unknown>;
  const { text: body, flagged: flag } = convertBody(match[2]!);
  if (flag) {
    flagged.push(`${route}: ${flag} — stays repo-managed`);
    continue;
  }
  const slug = routeToSlug(route);
  const doc = `---\n${yaml.dump(convertFrontmatter(fm, route), { lineWidth: 100 }).trimEnd()}\n---\n\n${body}`;

  if (DRY) {
    console.log(`— ${slug}  (${route})`);
    continue;
  }
  const result = await upsertDoc(slug, doc);
  result === "created" ? created++ : updated++;
  console.log(`${result === "created" ? "+" : "~"} ${slug}`);
}

console.log(`\ndone: ${created} created, ${updated} updated, ${flagged.length} flagged`);
for (const f of flagged) console.warn(`⚠ ${f}`);
