## 1. Command surface

- [x] 1.1 Rename `products batch` to `products search` and take its queries as variadic positional arguments alone, dropping the repeatable `--product`; require at least one query
- [x] 1.2 Rename `products search` to `products list` and require one of `--category`, `--set` or `--promotion-code`, failing before the call with a message naming all three
- [x] 1.3 Make `products list` the default subcommand of `products`, so the bare group lists
- [x] 1.4 Fail `products list` with a message pointing at `products search` when it is given a bare argument
- [x] 1.5 Create the `categories` group and move `catalog categories` to `categories list`, `catalog tree` to `categories tree`, `catalog category` to `categories details`, `catalog popular` to `categories popular`
- [x] 1.6 Make `categories list` the default subcommand of `categories`
- [x] 1.7 Move `catalog promotions` to `silpo promotions` and `catalog sets` to `silpo sets`, and remove the now-empty `catalog` group from the program
- [x] 1.8 Update every existing test that names a renamed command

## 2. New lookups

- [x] 2.1 Add `categories search <query...>` — page the branch's whole category listing, match titles case-insensitively, require the query
- [x] 2.2 Summarise `categories search` by the number it matched, with no unfiltered server total beside it
- [x] 2.3 Add `branches nearest --latitude <deg> --longitude <deg>` — retrieve the full listing, apply `--has-pickup` and `--has-np` first, order by great-circle distance, print the distance per store, narrow by `--from-distance` and `--to-distance` and cap with `--limit`
- [x] 2.4 Leave stores that carry no coordinates out of the `branches nearest` ordering rather than placing them at an invented distance
- [x] 2.5 Add `branches details <id>` printing one store, resolving an unrecorded number the way branch-scoped commands already do
- [x] 2.6 Cover 2.1–2.5 with tests, including the case where a match sits beyond the first page of the category listing

## 3. Behaviour corrections

- [x] 3.1 Stop sending `--start` and `--end` to the slot listing within the horizon the server returns unasked; compare the bounds against the slots in hand as local wall clock
- [x] 3.2 Forward bounds only for a window reaching past that horizon, and cover the whole-local-day case with a test
- [x] 3.3 Print slot availability as a value of its own rather than as the absence of `unavailable`
- [x] 3.4 Head `products replacements` with the number of products a replacement was found for, and say none were offered when none were
- [x] 3.5 Print the branch an online order's lines were bought at, recording the branch and company under local numbers
- [x] 3.6 Remove the external store number from the store listing output
- [x] 3.8 Print `cart id` as a bare local number, so the active cart can be substituted straight into the command that takes it
- [x] 3.7 Update the affected output tests

## 4. The skill

- [x] 4.1 Rewrite every command entry against the new surface, including the new lookups
- [x] 4.2 Split the cart-context rule: revalidate the timeslot before writing it or ordering on it, use it as it stands for a read
- [x] 4.3 Add the rule that independent commands travel in one shell invocation, and that a write and the read verifying it belong in the same one
- [x] 4.4 Add the rule that a product held by identifier is read through `products details` and a product known by name through `products search`, and that a full title from an order matches nothing
- [x] 4.5 Give the `addressType` vocabulary, state that omitting it lets the server choose, and add a gotcha that a value contradicting the delivery type is stored without complaint
- [x] 4.6 Gloss the cart's validation codes — `order.cost.min`, `order.payment_types.disabled`, `branch.location.not_available` — in the gotchas
- [x] 4.7 State that the numbers the CLI issues are handles for its own commands and are not named to the user
- [x] 4.8 Describe `promotions` as returning campaigns and link its `code` to `products list --promotion-code`
- [x] 4.9 Remove every claim that a command is costly or costlier than another, including the category tree's
- [x] 4.10 Check the skill against the agent-skill spec: every command reachable, no entry naming a command that does not exist

## 5. Documentation

- [x] 5.1 Correct the README's session-cost claim: current Claude Code defers MCP schemas, so the server costs about 130 tokens at session start rather than 11 490, and the per-errand cost moved to `ToolSearch` steps
- [x] 5.2 Update the README's command examples to the new names

## 6. Verification

- [x] 6.1 Run `npm test` and fix what the rename broke
- [x] 6.2 Re-measure the two cells where the CLI did not win — reorder on Opus, promotions on Sonnet — with the existing harness, 20 runs
- [x] 6.3 Record the before-and-after beside the measurements
