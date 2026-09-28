## Why

Category ids are aliased like every other uuid, but two of the three places that accept a
category take a **slug**, not an id — so the alias is usable in exactly one option and the
user copies raw slugs everywhere else. Meanwhile categories hold 1008 of the 1479 rows in
the alias table, burning the short end of the shared wordlist that every other entity draws
from.

A category-owned identifier table replaces the alias for this entity: one small local
number that the user can hand to any category-taking option, resolved to whichever form the
tool behind it actually wants.

## What Changes

- New `categories` table holding a local autoincrement id, the remote uuid, and the slug. A
  row without a remote uuid cannot exist.
- Every category-taking option accepts a local id, a remote uuid, or a slug, and resolves it
  to the form its tool requires: the uuid for `--parent-id`, the slug for
  `catalog category` and `products search --category`. A value that cannot be resolved fails
  the command.
- A slug that is not yet known is resolved through `silpo_get_category`, whose response also
  records the category's ancestors.
- **BREAKING** `category` is removed from the alias entities. Category listings print the
  local id instead of an alias, and `@`-handles no longer resolve for category options.
- **BREAKING** The category tree prints local id, title and product count instead of slug,
  built by joining the tree against the flat category listing.
- **BREAKING** The flat category listing drops `parent` from its output. `--parent-id`
  remains as an input.
- **BREAKING** Every command that prints a category names it by the local id alone. The slug
  leaves the flat listing, the popular listing and the category page, since the local id now
  reaches every option a slug used to be needed for.
- `catalog category` gains an optional `--delivery-type`; the tool is called with `Unknown`
  when it is not given.
- `CategoryPathEntry` gains the `id` the server actually sends.

## Capabilities

### New Capabilities
- `category-identifiers`: how a category is named on the command line — the local id table,
  the three accepted input forms, the order they are tried in, the remote lookup that fills
  a gap, and the failure when nothing resolves.

### Modified Capabilities
- `catalog-browsing`: every category is printed as local id and title alone — the tree gains
  the count, the flat listing drops the parent, and the slug leaves all three renders;
  `catalog category` takes an optional delivery type.
- `product-search`: `--category` accepts any of the three identifier forms rather than a
  slug only.
- `command-input`: category leaves the list of entities whose options accept an alias.

`id-aliases` is untouched: it names no entity of the fixed set, so dropping one changes
none of its requirements.

## Impact

- `src/db/`: new `categories` table in the schema, new module beside `aliases.ts`.
- `src/utils/`: `ALIASES.category` removed; new uuid test used by the resolver.
- `src/commands/catalog.ts`: all four renders, the tree gains a second call, the flat
  listing loses a column, `catalog category` gains an option.
- `src/commands/products.ts`: `--category` resolves instead of passing through.
- `src/mcp/entities/category.ts`: `CategoryPathEntry.id`.
- Existing `category` rows in the alias table become dead. The database is disposable, so
  they are left in place rather than migrated.
- Fixtures and golden tests covering category output are rewritten.
