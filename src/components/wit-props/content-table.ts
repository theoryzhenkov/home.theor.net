// wit sync contract for ContentTable.astro (`::content-table`). The
// adjacent .astro file is the implementation; this file is what
// `wit components sync` introspects (the TS checker cannot read .astro).
// Keep the two in lockstep.

interface Column {
  field: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: "text" | "date" | "link" | "url" | "status" | "links";
}

/** A sortable table of the pages under a path or class. */
export interface Props {
  /** Content path prefix to list, e.g. "concepts/". */
  path?: string;
  /** List members of a class page instead of a path. */
  classSlug?: string;
  /** Column spec — configure in code, not in content. */
  columns?: Column[];
  defaultSort?: { field: string; direction: "asc" | "desc" };
  /** Link each row to its page. @default true */
  linkToPage?: boolean;
}
