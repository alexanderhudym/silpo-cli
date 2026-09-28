## 1. Storage

- [x] 1.1 Add the `categories` table to the schema in `src/db/database.ts`: local id as autoincrement primary key, remote id text not null unique, slug text
- [x] 1.2 Add `src/db/categories.ts` with an upsert keyed on the remote id, a bulk upsert for a whole listing, and lookups by local id, by remote id and by slug
- [x] 1.3 Cover the storage module with tests: a new row takes the next number, a repeat keeps its number and refreshes the slug, and a row cannot be written without a remote id

## 2. Recognising an identifier

- [x] 2.1 Add a uuid test to `src/utils/` matching the canonical dashed form only
- [x] 2.2 Cover it with tests including the thirty-two character unseparated form, which is not a uuid
- [x] 2.3 Add the category resolver: read the input form, look the record up, and return either the remote id or the slug as the call site asks
- [x] 2.4 Give the resolver its gap-filling path — an unrecorded slug is fetched with `silpo_get_category` at the command's branch and delivery type `Unknown`, and the answer plus its ancestors are recorded before the lookup is retried
- [x] 2.5 Make every unresolved value fail the command through the same path the other option readers use, naming the value
- [x] 2.6 Cover the resolver with tests for all three input forms, both output forms, the gap-filling fetch, and each failure

## 3. Retiring the category alias

- [x] 3.1 Remove `category` from `ALIASES` in `src/utils/alias.ts`
- [x] 3.2 Replace every `toAlias(ALIASES.category, …)` in `src/commands/catalog.ts` with the local id from the record written for that payload
- [x] 3.3 Replace `readAlias(command, ALIASES.category, …)` on `--parent-id` with the resolver, asking it for the remote id

## 4. Catalog commands

- [x] 4.1 Add `id` to `CategoryPathEntry` in `src/mcp/entities/category.ts` and note it as documentation-sourced, as the neighbouring type is
- [x] 4.2 Record every category each of the four catalog payloads carries, including the entries of a category page's path
- [x] 4.3 Drop `parent` from the flat listing's output and print the local id in place of the alias
- [x] 4.4 Print the local id in place of the alias in the popular listing and on the category page
- [x] 4.5 Make `--delivery-type` optional on `catalog category` and send `Unknown` when it is absent
- [x] 4.6 Accept all three identifier forms for the category argument of `catalog category`, asking the resolver for the slug
- [x] 4.7 Rebuild the tree render: issue the hierarchy and the pages of the flat listing together, take structure and count from the hierarchy and the local id and title from the listing, resolve any node the listing does not account for, and print no count where the payload carries none
- [x] 4.8 Update the option help of every touched argument to name what it now accepts, in the same words across commands

## 5. Product search

- [x] 5.1 Resolve `--category` on `products search` to a slug instead of passing the text through

## 6. Tests and fixtures

- [x] 6.1 Refresh the catalog fixtures so the flat listing covers the nodes the tree fixture names, since the current one holds four rows and cannot exercise the join
- [x] 6.2 Update the catalog tests for the new flat, popular and category-page output
- [x] 6.3 Add tree tests: the join supplies id and title, a node without a count prints none, a tree with no counts at all still succeeds, and a node missing from the listing is resolved on its own
- [x] 6.4 Update the product search tests for a category given in each of the three forms and for one that resolves to nothing
- [x] 6.5 Update the golden tests covering category output
- [x] 6.6 Run the full suite

## 7. Documentation

- [x] 7.1 Record what was measured for this change: the hierarchy and the flat listing cover the same categories, the count is deduplicated across a subtree, the delivery type and slot change only the count, `silpo_get_category` requires a delivery type but ignores it while honouring the branch, and its `children` is null even for a category that has them
