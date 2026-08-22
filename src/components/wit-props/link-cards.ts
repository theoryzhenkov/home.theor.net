// wit sync contract for LinkCards.astro (`::link-cards`).

import type { LinkCardInput } from "@/lib/link-cards";

/** Cards linking a project's places: repo, stores, site, docs. */
export interface Props {
  /** Explicit card list — configure in code, not in content. */
  links?: LinkCardInput[];
  label?: string;
  /** GitHub repo URL. */
  github?: string;
  /** Chrome Web Store URL. */
  chrome?: string;
  /** Firefox Add-ons URL. */
  firefox?: string;
  /** Latest release URL. */
  release?: string;
  /** Project website URL. */
  website?: string;
  /** Documentation URL. */
  docs?: string;
}
