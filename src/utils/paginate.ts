export type Page<Row> = { readonly rows: readonly Row[]; readonly total: number };

export type PageFetcher<Row> = (limit: number, offset: number) => Promise<Page<Row>>;

export async function paginate<Row>(pageSize: number, fetchPage: PageFetcher<Row>): Promise<Row[]> {
  const first = await fetchPage(pageSize, 0);

  if (first.rows.length === 0) return [];

  const offsets: number[] = [];

  for (let offset = first.rows.length; offset < first.total; offset += pageSize) {
    offsets.push(offset);
  }

  if (offsets.length === 0) return [...first.rows];

  const rest = await Promise.all(offsets.map((offset) => fetchPage(pageSize, offset)));

  return [...first.rows, ...rest.flatMap((page) => page.rows)];
}

/**
 * Reads at most `cap` rows, in pages of `pageSize`. A tool that caps its page size lower than the
 * caller's appetite is read in as many calls as it takes, rather than refusing the call or handing
 * back fewer rows than were asked for without saying so.
 */
export async function readCapped<Row>(
  pageSize: number,
  cap: number,
  fetchPage: PageFetcher<Row>,
): Promise<Row[]> {
  const rows = await paginate<Row>(pageSize, async (limit, offset) => {
    const page = await fetchPage(limit, offset);

    return { rows: page.rows, total: Math.min(page.total, cap) };
  });

  return rows.length > cap ? rows.slice(0, cap) : rows;
}

const FOUND = /^Found (\d+)\b/;

/**
 * The commands print a payload's `summary` as the server wrote it, so a merged list needs one that
 * counts what was merged. A summary the server did not shape as a count is replaced rather than
 * left naming one page's total over a longer list.
 */
export function countedAs(summary: string, count: number): string {
  return FOUND.test(summary) ? summary.replace(FOUND, `Found ${count}`) : `Found ${count}`;
}
