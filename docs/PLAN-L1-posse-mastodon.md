---
scope: L1
summary: "Plan for home/feed separation and Mastodon announcement POSSE"
modified: 2026-06-22
reviewed: 2026-06-22
lifecycle: ephemeral
type: PLAN
depends:
  - path: README
  - path: docs/L0-content
  - path: docs/L0-infrastructure
  - path: docs/L1-routing
  - path: docs/L2-info-architecture
---

# Mastodon POSSE Plan

> Status: superseded by the tangent direction. Durable pages now live as MDX in `home.theor.net`; short-form social notes live in tangent and syndicate to ActivityPub/Bluesky. Keep this plan as historical context for the earlier Mastodon/feed split, not as current implementation guidance.

Use `feed.theor.net` as the social feed and `home.theor.net` as the durable website. Do not make Mastodon-shaped content fit the home site, and do not mirror every home page into Mastodon.

`feed.theor.net` already runs Mastodon from the stock NixOS Mastodon package. It is the right place for quick thoughts, replies, boosts, links, social context, and rough notes. `home.theor.net` is the right place for long-lived pages: essays, durable notes, project pages, and interlinked writing that can be revised over time.

## Decisions

`feed.theor.net` is the canonical social surface. Native Mastodon posts live there. They do not need matching MDX pages on `home.theor.net`.

`home.theor.net` is the canonical durable surface. Its pages can be announced on Mastodon, but the Mastodon status is a pointer to the page, not a copy of the page body.

There is no automatic synchronization between `home.theor.net` and `feed.theor.net`. The two sites should link to each other and share identity, but they have different content models.

Mastodon syndication from `home.theor.net` means announcement-only POSSE. It posts short, human-written announcement text plus the canonical URL. It does not attempt to render MDX into Mastodon, split posts into threads, preserve footnotes, or keep edits/deletions synchronized.

Edits to home pages update the website. They may mark the Mastodon announcement as stale in a CLI report, but they do not edit the Mastodon status automatically. Deleting a home page does not delete downstream Mastodon posts automatically.

## Site roles

| Surface | Role | Content |
| --- | --- | --- |
| `home.theor.net` | Durable canonical website | Essays, notes, project pages, interlinked writing |
| `feed.theor.net` | Social canonical feed | Short posts, replies, boosts, quick links, rough notes |
| LessWrong | Essay cross-post target | Selected long-form posts |
| Substack | Newsletter/cross-post target | Selected long-form posts |
| Telegram | Optional announcement/feed target | Short announcements or feed-like updates |

## Identity links

`home.theor.net` should link to the Mastodon actor on `feed.theor.net`, for example:

```html
<a href="https://feed.theor.net/@theo" rel="me">Feed</a>
```

The Mastodon profile should link back to `https://home.theor.net` so Mastodon can verify the `rel="me"` relationship.

The home site navigation should include a visible feed link. This establishes identity and makes the split clear without adding syndication complexity.

## Home-to-feed announcements

A home page opts into a Mastodon announcement with frontmatter:

```yaml
syndication:
  mastodon:
    text: |
      I wrote a short note about music taste and coding agents.
    visibility: public
```

`text` is required for automatic posting. The publisher appends the canonical URL, producing:

```txt
I wrote a short note about music taste and coding agents.

https://home.theor.net/blog/agents-and-classic-rock/
```

Optional fields can map to Mastodon API fields:

```yaml
syndication:
  mastodon:
    text: |
      ...
    visibility: public # public | unlisted | private | direct
    spoiler_text: "optional content warning"
    language: en
```

If a page should not be announced on Mastodon, omit `syndication.mastodon`.

## State file

Do not store Mastodon IDs in MDX frontmatter. Store downstream state in a sidecar file that the site can read and render:

```txt
src/data/syndication.json
```

Initial shape:

```json
{
  "schema_version": 1,
  "items": {
    "blog/agents-and-classic-rock": {
      "mastodon": {
        "type": "announcement",
        "status_id": "114000000000000000",
        "status_url": "https://feed.theor.net/@theo/114000000000000000",
        "instance_url": "https://feed.theor.net",
        "canonical_url": "https://home.theor.net/blog/agents-and-classic-rock/",
        "syndicated_at": "2026-05-18T10:30:00Z",
        "source_created_at": "2026-05-18",
        "source_modified_at": null,
        "source_digest": "sha256:...",
        "status_digest": "sha256:..."
      }
    }
  }
}
```

`source_modified_at` records the page's `modified` value at the time of syndication, or `null` when the page had no `modified` field. `source_digest` records the canonical source version. `status_digest` records the exact Mastodon status text that was posted.

## Page display

A home page with a recorded Mastodon announcement should show a discussion link, not a duplicated publication record:

```txt
Discuss on Mastodon
```

The link points to `status_url`. The page's own `created` and `modified` fields remain source metadata. The syndication date is metadata about the announcement, not the page publication date.

If `source_digest` no longer matches the current page, the CLI should report the announcement as stale. The page may later show a low-emphasis "announced before latest edit" indicator, but that is not required for v1.

## Publish behavior

The Mastodon publisher scans `src/content/pages/**/*.mdx` for pages with `syndication.mastodon`.

For each matching page:

1. Compute the canonical URL from `astro.config.ts` `site` plus the page slug.
2. Build the final status from `syndication.mastodon.text` plus the canonical URL.
3. Validate required fields, visibility, URL, and character count.
4. Check `src/data/syndication.json` for an existing Mastodon record.
5. Refuse to post if a record already exists unless an explicit force flag is used.
6. POST to the Mastodon API on `feed.theor.net` with `write:statuses` credentials.
7. Store the returned status ID, URL, timestamp, and digests in the state file.

Use an idempotency key derived from the canonical slug and `created` date when calling the Mastodon API. The state file remains the primary duplicate guard.

## Edit and delete behavior

Version 1 is publish-once. Editing the MDX page updates `home.theor.net` and future home feeds. It does not automatically edit the Mastodon status.

When a page changes after announcement, the CLI reports it as stale by comparing the current digest with the stored `source_digest`. The user can ignore it, manually edit the Mastodon status, or post a follow-up.

Deleting a home page does not delete the Mastodon announcement automatically. Any destructive downstream action requires an explicit command.

## Fast posting

Quick posts should use Mastodon directly on `feed.theor.net`, at least for now. This keeps replies, mentions, boosts, content warnings, visibility, and thread behavior inside the system that already understands them.

A future custom composer for `feed.theor.net` may provide a faster or more personal interface, but it should be designed as a Mastodon/feed composer, not as a `home.theor.net` page editor.

Potential future feed composer fields:

```txt
Text:
[ ... ]

Options:
[ ] public / unlisted / private / direct
[ ] content warning
[ ] reply to status URL or ID
[ ] also send to Telegram
```

## Home authoring speed

Lowering friction for durable home pages is still useful, but it is a different problem from social posting.

After the announcement publisher exists, add a helper command:

```sh
bun run new:note
```

It should prompt for title, body, relations, and optional Mastodon announcement text, then create the MDX file with the right `is:`, `part_of:`, `created`, and `syndication.mastodon` fields. It should not post directly; posting stays in the syndication command so preview and duplicate checks remain in one place.

## Later promotion workflow

Some feed posts may deserve durable treatment later. That should be explicit:

```txt
Mastodon post on feed.theor.net → promote to home note
```

Promotion creates a new `home.theor.net` page that links back to the original feed post. It does not imply that all feed posts are archived on the home site.

## Workflow

Start with a local command before CI automation:

```sh
bun run syndicate:mastodon -- --dry-run
bun run syndicate:mastodon -- --publish
```

Dry run prints the exact announcement statuses that would be posted and any stale records. Publish mode requires `MASTODON_INSTANCE_URL=https://feed.theor.net` and `MASTODON_ACCESS_TOKEN` in the environment.

After local publishing works, add a GitHub Actions job that runs after the deploy job on `main`. That job posts unsyndicated announcements, updates `src/data/syndication.json`, and commits the state file back to the repo. The follow-up commit triggers one more deploy so the website can show the Mastodon discussion link; the second run should find no unsyndicated pages and make no commit.

## Implementation stages

1. Add reciprocal `rel="me"` identity links between `home.theor.net` and `feed.theor.net`.
2. Add a visible feed link to the home site navigation.
3. Adjust the `syndication.mastodon` schema in `src/content.config.ts` while keeping `.passthrough()` for unrelated metadata.
4. Add `src/data/syndication.json` with an empty state object.
5. Add helpers for canonical URLs, source digests, Mastodon status rendering, and state-file reads/writes.
6. Add `scripts/syndicate-mastodon.ts` with dry-run support and tests for rendering and duplicate detection.
7. Add Mastodon API publishing against `feed.theor.net` with token-based auth.
8. Render recorded Mastodon discussion links on canonical home pages.
9. Add CI publishing after the local workflow is proven.
10. Add `new:note` for faster durable notes.

## Acceptance checks

- `feed.theor.net` remains the canonical place for native Mastodon posts.
- Home pages without `syndication.mastodon` are never posted.
- Home pages with `syndication.mastodon.text` produce an announcement containing that text and the canonical URL.
- The publisher never posts raw MDX body content in version 1.
- A page with an existing Mastodon state record is not posted twice.
- Edits to an announced page are detected and reported, but not pushed to Mastodon automatically.
- Deleting a home page never deletes a Mastodon status automatically.
- Announced home pages display a Mastodon discussion link from the sidecar state.
