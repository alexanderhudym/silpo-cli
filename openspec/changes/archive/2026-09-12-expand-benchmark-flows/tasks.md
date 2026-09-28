## 1. Criteria out of the checker and into the flows

- [x] 1.1 Add a `## Checks` block to each of `flow-1` … `flow-5`, encoding the criteria
      `verdictFor` already enforced for them.
- [x] 1.2 Replace the `if (run.flow === …)` chain in the analyzer with `checksFor`, which reads
      and caches the block from the flow file, and `holds`, which evaluates one check against the
      facts read off the cart.
- [x] 1.3 Add `total` to those facts, and derive `mechanicalOnly` from the flow's own `Type:` line
      rather than from its number.
- [x] 1.4 Report the failing check by name in `mechanicalFailures`, not just the cart state.

## 2. Flows that ship a file

- [x] 2.1 Add `placeAssets`, copying each flow's own assets into the run's working directory and
      skipping anything that is not a file at the top level.
- [x] 2.2 Take `cwd` in `readFlow` and substitute `{{asset:name}}` with the absolute path of the
      copy, failing loudly when a flow names an asset that is not there.
- [x] 2.3 Add a `prompt` subcommand that resolves flows without launching an agent, so a missing
      asset or a dead reference is found in a second rather than mid-matrix.
- [x] 2.4 Generate `assets/flow-6/shopping-list.jpg` and keep its HTML in `source/`, which does not
      ship.

## 3. Faults that destroy runs instead of recording them

- [x] 3.1 Split `assertNoLeak`: a leak still halts the matrix, a run that reached no Silpo surface
      becomes a recorded failure, and three of those in a row on one arm halt.
- [x] 3.2 Add `silpoPatiently` and use it for both writes in `reset`, waiting out the server's rate
      limit and falling back to transient so the matrix retakes the run.
- [x] 3.3 Scope the payment-navigation check to Silpo's own hosts.
- [x] 3.4 Count `WebFetch`, `WebSearch` and shell fetches separately with their payload sizes,
      report them per run, and add `externalChars` to the analysis.

## 4. The ten errands

- [x] 4.1 `flow-6` список від руки — a shipped image, the densest `cart fill` in the suite.
- [x] 4.2 `flow-7` пиріг з картинки — a Pinterest pin `WebFetch` cannot read.
- [x] 4.3 `flow-8` рецепт на шістьох — schema.org data that omits the fruit in the dish's own name.
- [x] 4.4 `flow-9` великий список на тиждень — twenty explicit terms, the volume control.
- [x] 4.5 `flow-10` рівно 700 гривень — the budget trim loop and its repeated cart read-backs.
- [x] 4.6 `flow-11` чеки з магазину — in-store receipts, which nothing else reads.
- [x] 4.7 `flow-12` що вигідніше за кілограм — product cards and price arithmetic.
- [x] 4.8 `flow-13` набір під ккал і білок — the nutrition attributes the cards carry.
- [x] 4.9 `flow-14` сину не можна арахіс — a constraint the catalogue cannot answer from data.
- [x] 4.10 `flow-15` кошик тільки з акцій — the promotion surface behind a write.

## 5. Prove every flow is passable

- [x] 5.1 Run all fifteen flows on both arms, Opus, one repeat — thirty runs.
- [x] 5.2 Re-run the six cells the rate limit destroyed, after 3.2 landed.
- [x] 5.3 Read every run back by hand and decide each against the frozen criteria, since the
      mechanical check settles almost nothing on a read flow.
- [x] 5.4 Correct the two flow-file claims about the catalogue that the runs disproved.
- [x] 5.5 Update the reproduce command and the matrix defaults to the suite's real size.
- [x] 5.6 Add the skill rule the smoke showed was missing: composition, allergens, nutrition and
      origin live only on the card, so such a question is one `products find --details` over every
      product at once, never the model's own knowledge, and a card without the attribute is not a
      card denying it.

## 6. The resolution defect every failing step came from

- [x] 6.1 Let a named delivery type pick the listings a destination text is resolved against:
      self-pickup against stores alone, Nova Poshta straight to the offices, a courier type with the
      store listing skipped, and the cascade unchanged where no type is named.
- [x] 6.2 Fail a self-pickup destination that matches no store by saying so, and name the two
      commands that get the caller out — `stores --pickup` and `--branch`.
- [x] 6.3 Put the parsed store matcher the store listing already uses behind the containment test,
      so a street type spelled out in full, or the shop's name written ahead of its address, still
      finds the branch.
- [x] 6.4 Match every geocoded candidate rather than only a lone resolved one: the geocoder answers
      a store's address with several spellings of one street, and their converging on one branch is
      not an ambiguity.
- [x] 6.5 Refuse a uuid passed as a destination by naming the option that takes one.
- [x] 6.6 Cover all of it in `test/resolve-stores.test.ts`, and confirm every previously failing
      call against the live account.

### What the six errors became

Each line is the exact call from the smoke that failed.

| call | before | after |
| --- | --- | --- |
| `--to "Дніпро, вулиця Лазаря Глоби, 7" --delivery-type SelfPickup` | SelfPickup does not serve this destination | resolves |
| `--to "Сільпо Дніпро вул. Лазаря Глоби 7" --delivery-type SelfPickup` | 5 geocoded candidates, exit 1 | resolves |
| `--to "Сільпо Дніпро вул. Незалежності 36" --delivery-type SelfPickup` | SelfPickup does not serve this destination | 2 stores, each with the uuid `--branch` takes |
| `--to "Дніпро, проспект Олександра Поля, буд. 84" --delivery-type SelfPickup` | SelfPickup does not serve this destination | no store matches, naming `stores --pickup` and `--branch` |
| `--to "1edb733f-…"` | could not resolve destination | a branch identifier goes to `--branch` |

Group 8 then went further and removed `--branch` altogether, so the last two rows read as the
state that step reached, not the one this change ships.

The fourth is a correct refusal: that is a home address, and self-pickup from one's own flat is not
a thing the catalogue can offer. What changed is that the message now points at the destination
rather than at the delivery type, which was the one part of the request that was right.

`npm test`: 655 tests, 655 pass.

## 7. The read-back the skill was asking for

- [x] 7.1 Stop the budget rule telling the agent to read the cart again after reducing it. Every
      write ends by printing the whole cart, the new total with it, so the next round reads that.
- [x] 7.2 Say once, among the rules, that `cart details` after a write reads back what the write
      just printed, and is for a cart untouched this turn.

Counted across the arm-A runs: eighteen `cart details` calls, **eleven of them immediately after a
write**. Compared a write's output against the `cart details` that followed it in flow 10 — the
delivery type, slot, address, total, subTotal, bonus and shipments are identical, line for line. The
agent was not being careless: one rule said the write's report already carries the total, another
told it to read the cart again, and it followed the one nearer the task. The two flows with the most
redundant reads are the two budget flows, which is exactly where that rule fires.

## 8. One destination, one option

- [x] 8.1 Make `--to` accept a branch uuid, resolving it to that store directly, and fail naming the
      uuid when it matches no branch rather than carrying it on to the settlement lookup.
- [x] 8.2 Remove `cart setup --branch` and the `--to or --branch, not both` refusal with it. Its own
      semantics — move the branch, keep the address — produced a self-pickup cart naming one shop
      while another fulfilled it, reported as "Shopping cart updated". `slots --branch` is a
      read-only override of a different command and stays.
- [x] 8.3 Point the ambiguity block and the no-store message at `--to`.
- [x] 8.4 Rewrite the five `--branch` tests against `--to` rather than deleting them, and drop only
      the one whose error no longer exists.
- [x] 8.5 Update the skill's `cart setup` entry: one destination option, and `--delivery-type
      SelfPickup` is what makes a text resolve against the store listing.

### The requirement this changed, and why

`Changing one setting leaves the rest standing` said in as many words that moving the cart to
another branch leaves the delivery type and the address unchanged, and a test asserted it with the
message "an address nobody named was invented". That is right for a courier cart, where the branch
only says who fulfils an order going elsewhere. Under self-pickup the address *is* the branch, and
carrying it forward leaves two fields naming two different shops.

The requirement is amended rather than worked around: a destination fixes the delivery type, the
branch, the address and the slot together and they are resolved together. Time remains a setting
that stands on its own.

Verified live: `--to <branch uuid>` moves delivery type and address together; an unknown uuid fails
naming it. `npm test`: 654 tests, 654 pass.

## 9. The timeout that cost two runs seventy steps

- [x] 9.1 Split the daemon client's single 10-second bound into 5 seconds for the connection and
      120 seconds for the answer, the second set once the socket is connected.
- [x] 9.2 Rewrite the timeout message: the client stopped waiting, the daemon may still be working,
      a write may already have landed, read the cart before repeating one.
- [x] 9.3 Add the skill rule that a network failure says nothing about the shape of the request —
      repeat the same call once, shorten a list only after a short one fails too, and read the cart
      before repeating a write that timed out.

### Why 120 seconds

Measured across the fifteen arm-A runs of the last sweep, over 170 successful `silpo` calls with the
agent's own `sleep` prefixes subtracted: median 2.7s, p90 7.9s, p95 11.6s, p99 16.1s. The 10-second
bound sat between the ninetieth and ninety-fifth percentiles — and that distribution is of the calls
that *survived*, so its tail is thinner than the truth.

The number is set above the MCP SDK's own `DEFAULT_REQUEST_TIMEOUT_MSEC` of 60 seconds deliberately.
One command is several requests, so the honest ceiling is a multiple of that; and where one request
is what hung, the SDK's error naming the server is what should reach the caller, instead of this one
blaming a daemon that is working. The old bound fired first and hid it.

Not scaled by list length, though that was suggested: in the run that prompted this, a four-item
`cart fill` timed out at 10.2s exactly as the thirty-three-item one did. The variable is the server's
health, not the size of the request, and scaling by size would put the agent's own false conclusion
into the code.

## 10. Correcting several lines in one call

- [x] 10.1 Give `cart set` further product and quantity pairs after the first, written in one call.
- [x] 10.2 Fail before writing on arguments that do not pair up, a product named twice, a rejected
      quantity anywhere among the pairs, and `--comment` passed with more than one pair.
- [x] 10.3 Cover all five in `test/cart.test.ts`; the single-pair tests are untouched and still pass.
- [x] 10.4 Update the skill's entry, naming the shell loop as the thing not to write.

`cart fill` and `cart remove` were already variadic and only `cart set` was not, which is what forced
a caller correcting several lines into a shell loop. In the run that prompted this the loop's quoting
went wrong twice — nine `FAILED:` lines, then nine `missing required argument 'quantity'` — before
landing on a form that worked, four steps spent on quoting rather than on the errand. Weighed lines
come back at the step their branch sells in, so several corrections at once is the normal case.

`npm test`: 659 tests, 659 pass.

## 11. The cart writes nobody asked for

Flow 11 could not be measured: the account went rate-limited on `update-shopping-cart` and the agent
slept 20s, 60s, 180s, 120s, 420s and 600s against it. The account was not the problem.

- [x] 11.1 Measure what the limiter actually does, rather than reasoning from the docs. The docs say
      only `"429" — використай експоненційний backoff`, with no numbers. Measured: the rejection is
      not a 429 at all but a tool result in a 200 — `{content, isError}`, no header, no retry-after,
      nothing to back off from below the tool layer. It trips on the **third** cart write in quick
      succession, and the window is **under two seconds**; repeating into it does not extend it.
- [x] 11.2 Reconcile that with the run. A two-second window cannot survive a 600-second sleep, so the
      limit was not the account's. Counted the writes one command makes, on a cart poisoned with a
      lapsed slot:

      | command | calls | writes |
      | --- | --- | --- |
      | `cart details` — a read | 5 | 1 |
      | `cart setup --to`, moving branch | 8 | **3**, the third refused |

      `settle` runs inside `refresh`, which is the path of every read, and again inside `changed`
      after every write. The CLI was rate-limiting itself inside a single command, which is why no
      amount of sleeping helped.
- [x] 11.3 Retry a rate-limited call inside the session wrapper, at 1s, 2s, 4s. Safe on a write, and
      only there: a call the limiter turned away never reached the cart, unlike one that timed out.
      Extracted as `pastRateLimit` so a test can spend zero-length waits.
- [x] 11.4 Stop `settle` discarding why a repair failed. Both catches were bare, so a rejected repair
      became "no slot at the branch is available to replace it" while the slot listing answered
      sixteen. The reason is kept and spoken by the refusal it causes; reads are still served, which
      is why it is kept rather than thrown.
- [x] 11.5 Fold the repair into the write that follows it. `setup` was repairing the slot of the
      branch it was about to leave, one write before overwriting it. After: **4 calls, 1 write** on
      the same poisoned cart, against 8 and 3.

The before-and-after was taken with the same probe against both builds. The pre-fix run shows both
halves at once — the third write refused by the limiter, and the retry that carried the command
through anyway:

```
getTimeSlots
WRITE                 ← settle repairs the branch being left
getShoppingCartById
WRITE  <<< ERROR      ← the third write, refused. Flow 11's failure, reproduced
WRITE                 ← the retry, which succeeded
```

Deferred, not rejected: **a read still writes.** `cart details` on a lapsed cart costs a cart write,
because the repair sits on the read path. That is specified behaviour — `cart-session` has it, and
`agent-skill` tells the agent a read repairs the slot — so removing it is a spec change and a skill
change, not a bug fix. It stays.

- [x] 11.6 Work out what actually needs re-measuring, rather than re-running the arm on principle.

      Arm B needs nothing, ever, for any of this: it is the raw MCP with no CLI and no skill in it,
      and nothing in this change reaches it.

      Arm A's runs on disk already carry six of the nine changes — checked in the transcripts, not
      assumed: `--details` is called ten times in flow 13 and five in flow 14, so the card rule was
      live; `cart set` carries four, five and two pairs in single calls, so the batch form was live;
      no run mentions the daemon at all. The three that landed after them are the rate-limit retry,
      the repair reason and the folded repair — and all three fire only on a rate limit or a lapsed
      cart. **No arm-A run on disk contains either**: zero occurrences of `Rate limit exceeded`,
      zero of `cannot be booked`, across all thirteen. Re-running them would measure run-to-run
      variance and call it a result.

      So one run is owed, and it is the one the suite is missing anyway.
- [x] 11.7 Run flow 11 on arm A. It is the only cell of the suite with no arm-A run, and it is the
      only flow that ever hit the limiter — which makes it the one place all three of today's fixes
      are observable at once.

      **10 steps, $1.40, no limiter, no slot refusal** — against arm B's 24 and $2.28. It read the
      receipts, moved the cart to the home address on `DeliveryHome`, and filled 23 lines. The run
      that could not be measured at all is now the suite's widest arm gap after flow 2.
## 12. Prove the fixes on the runs that found them

- [x] 12.1 Re-run flow 2 and flow 11. Both blew up on the daemon timeout — 47 and 41 steps against
      27 and 24 — and both are the direct test of the change that fixed it.

### What the re-run returned

Flow 2 answers the question the change was argued from:

| | steps | errors | cost | wall |
| --- | --- | --- | --- | --- |
| arm A, before | 47 | 6 | $2.80 | 520s |
| arm A, after | **8** | 1 | **$1.13** | 250s |
| arm B | 27 | 0 | $2.91 | 273s |

The shape of the run is the shape the change designed for. One `cart setup --to` naming a street
address, resolved to a store by the parsed fallback. One `cart fill` carrying the whole list, a
second answering its `ask` blocks. One `cart set` correcting eight weighed lines in a single write.
No daemon timeout at any point, and no step spent on the help page.

Its one error is not a defect. Two distinct branches stand at Незалежності 36; the CLI reported
both uuids and the agent chose between them in one step, which is what the ambiguity requirement
asks for.

**Flow 11 could not be measured.** The account went rate-limited on `update-shopping-cart` partway
in and stayed so for the rest of the run — the agent slept 20s, 60s, 180s, 120s, 420s and 600s
against it before the run was stopped. Nothing about arm A was under test by then. It has to be
re-run against a rested account.

That failure did expose a defect of the same class as the daemon timeout, and one the change has
not fixed:

- `Cart.settle` swallows every exception from both the slot lookup and the rebooking write
  (`src/daemon/cart.ts:347` and `:359`). When either is rate-limited, `writable` then finds the slot
  still lapsed and throws `SLOT_UNUSABLE` — "no slot at the branch is available to replace it".
- In this run that sentence was false as it was printed. `silpo slots` answered **16 available** for
  the same branch and delivery type, twice, in the same transcript.
- It cost the agent the same way the daemon timeout did: a transient failure wearing a semantic
  message sends it to solve a problem that does not exist. It went looking for slots, found plenty,
  and was left holding a contradiction.

### What the smoke returned

Thirty runs, thirty completed. Twenty-eight passed their mechanical checks. Zero
payment-navigation reports. Every run was then read by hand, because for a read flow the
mechanical check only asks whether the cart was left alone, which is nearly nothing.

Thirteen of the fifteen flows had at least one arm that passed in the sweep itself; flow 13 joined them
once the card rule landed, as recorded below.

**Flow 13 failed on both arms of the first sweep and is now proven on arm A.** As first run, both
produced a day's menu totalling 1996 kcal and 146 g of protein, summing correctly, with no nutrition
figure ever received from Silpo — `Енергетична цінність` appeared nowhere in either transcript. Arm A
ran eight plain `products find` calls and grepped them to price lines; arm B ran two
`find_products_batch` calls, whose response carries no attributes either. Criterion 2 failed on both.
The criterion was not relaxed: without it the flow measures nothing, since a plausible calorie table
needs no shop.

The card rule from 5.6 is what closed it, and the arm-A run on disk is the one taken after it. That
run calls `products find --details` ten times and receives 72 `Енергетична цінність` figures and 81
`Білки`. Its answer names brands and pack sizes, and — the part criterion 2 is actually for — it says
outright which three cards carry no nutrition at all and that reference values were used for those.
Arm B was not re-read; one passing arm is what proves a flow passable, so the suite now stands at
**fourteen of fifteen proven**, with only flow 11 outstanding for want of an arm-A run.

Two mechanical failures, both left standing as findings:

- `flow-11/a-1` — the request says *на доставку* and the agent stopped to ask for an address the
  account already has saved, leaving the cart on pickup. The other arm looked one up and set
  delivery. The criterion was corrected before this run: it had been copied as `SelfPickup`,
  contradicting the flow's own prompt.
- `flow-7/b-1` — `WebFetch` returned nothing on the pin, the agent tried it twice, searched, and
  asked what the pie was rather than inventing a basket. The other arm fell back to curl,
  downloaded the image, read it and finished the errand in 21 steps. The flow is passable; which
  route an agent takes is not.

Two observations the runs produced rather than confirmed:

- `flow-14` is the sharpest separator in the suite. Arm B answered it with sixty
  `get_product_details` calls — 69 steps, $2.66 — against arm A's 5 steps and $0.52.
- `flow-6` worked end to end on the first attempt: the agent read the image, transcribed the list,
  skipped the struck-through item unprompted, and put the ambiguous one back as a question.

Two claims written into flow files before the smoke turned out to be wrong about the catalogue and
were corrected against it:

- Allergen declarations **do** exist, on some products and not others — `Містить алергени:
  ПШЕНИЦЮ, СОЮ` is an attribute of one Oreo at this branch and absent from the Oreo beside it.
  Flow 14's criterion 3 had been written on the opposite premise and now asks the agent to separate
  what it read from what it inferred, which is what the passing arm already did.
- Flow 12 does not exercise a card fan-out. Pack weight is in the product name, so a plain search
  carries everything its arithmetic needs, and neither arm opened a card.

## Review checklist

- [x] No flow file can be admitted without criteria: `checksFor` throws on a missing or unparseable
      `## Checks` block rather than defaulting to a verdict.
- [x] A check naming a field the cart did not print fails rather than passes. `holds` returns false
      on a null fact, and no path treats an absent value as satisfied.
- [x] Nothing under a flow's `source/` reaches the run's working directory, and `placeAssets`
      cannot throw on a directory entry.
- [x] An asset named in a prompt but absent from the asset directory fails the run rather than
      leaving `{{asset:…}}` in the text handed to the agent.
- [x] `silpoPatiently` retries only on the rate limit. Any other failure of a cart write propagates
      unchanged and is not silently retried into a dirty account.
- [x] The transient it raises after exhausting its attempts is the one `runMatrix` recognises, so
      the run is retaken rather than recorded as a flow failure.
- [x] A leak still halts the matrix. Only `UNREACHED` was moved out of the halting condition, and
      the consecutive counter resets on a successful run of that arm.
- [x] The payment check still fires on a Silpo checkout URL. Scoping narrowed the hosts, not the
      paths.
- [x] The fetch-route counters attribute each step to exactly one route and cannot double-count a
      Bash step that mentions curl inside a longer pipeline.
- [x] `externalChars` tolerates a run record written before the counters existed rather than
      throwing on the missing field.
- [x] Every `## Checks` block agrees with its own prompt — particularly `delivery`, which flow 11
      proved is easy to copy from a neighbour that asks for something else.

## 13. The flow that measured the model instead of the arm

Flow 7 handed the agent a Pinterest URL and let it work out how to get at the contents. `WebFetch`
returns nothing on that page — 1.1 MB of JavaScript shell — so the agent had to invent a fallback,
and which one it invented was a property of the model rather than of the arm: `curl` for the
`<title>`, or downloading the `i.pinimg.com` image. The two routes differ by an order of magnitude
in tokens, and the flow's own notes conceded that runs could only be compared after being grouped by
route. That is a coin toss with a comparison attached. None of the retrieval was ever the point; the
point begins once the dish is known.

- [x] 13.1 Capture the pin page once with Playwright at 1100×900 and ship it as
      `assets/flow-7/pinterest-pin.jpg`, using the machinery flow 6 already proved. The signup modal
      covers half the page and has to be removed from the DOM first; the snippet that does it is in
      the flow file so a recapture is not archaeology.
- [x] 13.2 Capture the **whole page**, not a crop of the dish: the Pinterest chrome, the source
      domain and the pin's heading are all in frame. The agent has to decide what on a saved web
      page is the dish, which is a different reading task from flow 6's handwritten list rather than
      a second copy of it.
- [x] 13.3 Keep the page's disagreement with itself rather than cleaning it up. The heading says
      `Рецепты Блюд Из Баранины` — lamb; the `<title>` says venison; the related pins are cottage
      pie, which is beef; the photograph is a mashed-potato crust over minced meat. So the meat is
      genuinely unsettled, which is why criterion 2 is written against the structure of the dish.
- [x] 13.4 Add criterion 4: any meat passes provided the choice is said out loud. Picking one
      silently, or asserting the page named a meat it did not, fails.
- [x] 13.5 Re-run arm A. **12 steps and $1.61, against 19 and $1.65.** The run reads the image,
      identifies the dish, and handles the meat exactly as criterion 4 asks: *"Баранини немає — взяв
      свинячий фарш … вийде не зовсім Shepherd's Pie (і навіть не Cottage Pie)"* — the branch stocks
      no lamb and no beef at all, and the run says the substitution changes what the dish is.

Two things this did not settle, both recorded rather than papered over:

- **External calls did not go to zero, and that is accepted.** Arm A still spent one `WebFetch` and
  two `WebSearch` calls, 5 638 characters, looking up the recipe from `thelastfoodblog.com` once it
  knew the dish — and came back empty, because that blog has since dropped its meat recipes. Looking
  up a recipe is a normal part of cooking from a picture, it is available to both arms, and arm B
  did not take it at all this run. So it is a choice a run makes, not a tax the flow levies, and it
  stays.
- [x] 13.6 Re-run arm B. Changing a flow's prompt invalidates **both** arms, not only the one whose
      code changed: the old arm-B run answered the URL prompt and was the suite's one mechanical
      failure — `products: 0`, stopped and asked. Re-run against the shipped page: **18 steps and
      $2.77, against arm A's 12 and $1.61**, no errors. The suite now has **zero mechanical
      failures**.

## 14. The defect flow 11 found on its way through

- [x] 14.1 `silpo me orders --offline --limit 15` fails with the server's own validation error:
      `Too big: expected number to be <=10`. The cap is real and the CLI passes the caller's number
      straight through.

      The cap is already known in three places — `resolve/stores.ts:514` and `resolve/products.ts:359`
      both declare `OFFLINE_ORDERS_PAGE_SIZE = 10` and paginate against it, and `test/harness.ts:27`
      guards every tool call against a table of caps. The guard never fired because no test reads
      offline orders above the cap. Only the `me orders` command asks for the caller's number
      directly, and it is the one path with no cap and no pagination.

      Silent truncation is the wrong fix: a caller who asked for fifteen and got ten would not know.
      Either the command paginates — the machinery is there — or it refuses naming the cap.

- [x] 14.2 Read the caps off the server instead of writing another table. Nine tools publish a
      `maximum` on their own `limit` schema — offline orders 10, online orders 50, products and
      batch and time slots and certificates 100, branches and favourites 500, categories 1000 —
      which is where the validation error came from in the first place. `pageCaps` builds the map at
      session open, so a cap that moves on the server cannot go on being wrong here.

      Worth noting against the hand-maintained table in `test/harness.ts`: it carries
      `silpo_get_similar_products: 100`, a cap the server does not declare at all. Tables drift; this
      is what that looks like.
- [x] 14.3 Page in `pagedCall`, wrapped around the rate-limit retry so every page survives the
      limiter. Rows are found rather than looked up — every paged result carries exactly one array
      beside `success`, `summary` and `meta` — and a result where they cannot be told apart fails
      naming the cap rather than extending a guess.
- [x] 14.4 Put it at the session's own `callTool`, **not** at the typed surface. The first attempt
      paged in `createSurface` and changed nothing at all, because the commands do not use the
      session's surface: they use the one in `daemon/client.ts`, which serialises the call over the
      socket, and the daemon answers by going to `session.callTool` directly. Paging there covers
      every path — the commands, the daemon's own surface, and `silpo raw` — and N server calls
      still cost one round trip over the socket.
- [x] 14.5 Rewrite the summary over a merged result. The commands print `payload.summary` verbatim,
      so a merged list under a summary reading `Found 10` would have been a lie printed to the user.

Verified live, which is the only way this class of defect shows up at all — the fake in the test
harness answers whatever it is asked for:

```
silpo me orders --offline --limit 15   →  Found 15 offline orders (total: 20), 15 receipts printed
silpo me orders --offline --limit 25   →  Found 20 offline orders (total: 20), 20 receipts printed
```

`npm test`: 686 tests, 686 pass.

## 15. Flow 7 measured the model twice over

- [x] 15.1 Shipping the page removed the retrieval coin toss but not the variance under it. The
      first run against the asset still spent one `WebFetch` and two `WebSearch` calls fetching the
      recipe from `thelastfoodblog.com` once it had identified the dish — and came back empty,
      because that blog has since dropped its meat recipes. Arm B, on the same prompt, fetched
      nothing at all and went straight to Silpo. One arm was assembling from a recipe and the other
      from what it knew, so the two carts were not answers to the same question.

      `Рецепт не шукай, збери по пам'яті` in the prompt settles it. Criterion 7 checks it off the
      run record's `external` counters rather than by reading, so it costs nothing to enforce.

## 16. Auditing the change against what was actually built

Groups 7 through 14 were written after the proposal was, and it showed.

- [x] 16.1 `proposal.md` stopped at group 6. It described one modified capability where the change
      now carries five delta specs, said "the skill gains the rule" where five rules changed, and
      listed none of the daemon timeout, the batch `cart set`, the rate-limit retry, the repair
      reason, the folded repair, the paging or the flow-7 rebuild. Rewritten against what is on
      disk.
- [x] 16.2 `design.md` had the same gap, and two of its statements had been overtaken by the work:
      "which fetch route an agent picks is variance we did not add **and cannot remove**" — removed
      for flow 7 in group 13 — and "three of the four external flows depend on a live URL", now one.
      Both corrected, and decisions added for the six later groups.
- [x] 16.3 **The skill changed in five ways and the change carried no `agent-skill` delta at all.**
      Checked each rule against `openspec/specs/agent-skill/spec.md`: the read-back rules from
      group 7 are already required by an existing requirement, so those edits made the skill
      consistent with a spec it was violating and need nothing new. Three had no requirement
      anywhere — the card rule, the transient-failure rule and the rate-limit rule. Delta written.
- [x] 16.4 Checked the reverse direction too, that nothing in the deltas is unimplemented:
      `--branch` is gone from `cart setup` and survives only on `slots`, where it belongs; the
      no-store message names `--to` rather than the removed option; `cart set` is variadic; the
      daemon bounds are 5s and 120s; the uuid guard fires before the settlement lookup; the scope
      threads through `resolveDestination`. The benchmark itself is governed by no spec — it is
      measurement apparatus, not product behaviour — so the flow and harness work
      correctly has tasks and no delta.

## 17. The skill, reviewed for waffle

A read-only review of `SKILL.md` against `agent-skill/spec.md`. Every token in that file is loaded
on every run, so its length is a measured cost. The review found two things worth more than the
words:

- [x] 17.1 **A requirement the skill did not satisfy.** The spec has the skill state that
      independent commands travel in one shell invocation, and that several product cards are read
      by putting the several calls in one invocation. The skill said "one shell invocation" only of
      `np`. Stated as a rule of its own now.
- [x] 17.2 **A requirement the skill half-satisfied.** The spec has the skill state, beside the
      description of the automatic choice, the rule that decided it — every word of the term
      accounted for, and no other candidate answering as fully — because nothing can be asked after
      the fact. The skill described only the *tie-break between* candidates that had already matched
      in full, never the rule they were tying inside. An agent asked why it picked a product had
      nothing to answer from.
- [x] 17.3 Cuts applied where a rule was stated more than once and one statement was plainly the
      canonical one: the cart-print rule stood in three places, the shortfall-becomes-an-`ask` rule
      in three, the selector gloss twice inside one entry. The four `cart fill` outcomes became a
      table. Roughly 120 words out, against two rules added.

Left deliberately: the rate-limit and network-failure rationale, which reads like waffle and is what
makes the prohibitions credible — an agent told only "don't sleep" sleeps. And every repetition the
spec itself compels, of which there are four.

Noted for later, outside this change: the spec requires the subtree rule be "stated once" and then
requires it at two different entries, which is a contradiction in the spec rather than in the skill.

## 18. Re-measuring what the last two groups touched

Four runs: flow 7 on both arms, because its prompt changed and a prompt change invalidates both;
flows 13 and 14 on arm A, as the two that lean hardest on the card rule the review reworded.

| run | steps | cost | external chars | before |
| --- | ---: | ---: | ---: | --- |
| 7 / A | **8** | $1.32 | **0** | 12, $1.61, 5 638 |
| 7 / B | **15** | $1.84 | 0 | 18, $2.77, 0 |
| 13 / A | **9** | $1.07 | 0 | 12, $0.67, 0 |
| 14 / A | **5** | $0.64 | 0 | 7, $0.68, 0 |

Zero mechanical failures, zero anomalies, zero payment navigation across the suite.

Flow 7 did what the prompt change was for: external payload went to nothing, so criterion 7 is
satisfied off the counters rather than by reading, and the run got shorter on both arms.

**Flow 13 is a trade, not a win, and is recorded as one.** Three fewer steps but sixty percent more
cost. The cause is visible in the call shapes: before the review it made **seven separate
single-term `--details` calls**, each grepped down to a few lines; after, it makes **two batched
ones** carrying ten terms each. It receives the same data — 68 `Енергетична цінність` figures
against 72 — in a fifth of the calls, but a batched card read returns ten whole cards where seven
narrow ones returned fragments.

That is the card rule being obeyed rather than worked around: the rule asks for one call over every
product at once, and the old run technically used `--details` while still going one product per
call, which is the shape the rule forbids. Whether fewer-and-fatter beats more-and-thinner is a
question for the full sweep, not for one run of one flow. The answer's honesty survived either way —
it again names the three cards that carry no nutrition and says reference values were used for them.

### The caveat this group does not cover

These four runs check that nothing broke where the edits were aimed. They do not show the skill
edits left the other eleven flows alone, and two of the edits were **additions** rather than
rewordings — the shell-invocation rule and the automatic-pick rule. The second in particular can
move any write flow, because the agent now has a rule to give when asked why it chose a product.
Settling that is the full sweep, group 19.

## 19. The full sweep

11.6 asked what needed re-measuring and answered it for the fixes of that day; 11.7 took the one run
that was owed. Neither is the sweep, and the sweep had no task of its own — three places in this file
pointed at 11.6 as though it were still open when it was checked off. This is that task.

Every arm-A number this change is argued from predates some part of what it ships. Arm B does not:
no code change and no skill edit reaches it, and flow 7 — the one flow whose prompt moved — was
re-run on arm B when it moved. Sweeping it again was started and stopped: thirty runs were begun,
then cut to fifteen once it was clear the other fifteen would cost roughly twenty dollars and an
hour to answer a question nothing in this change asks.

The cost of that decision, stated so it is not forgotten when the numbers are read: arm B's runs are
a day older than arm A's. Steps and tokens follow how much work an errand takes rather than what
things cost, so the drift should not reach them — but an odd gap on one flow is worth checking
against stock before it is believed.

- [x] 19.1 Run all fifteen flows on arm A, Opus, one repeat. Arm B stands.
- [x] 19.2 Read the result as a single-repeat estimate and say plainly that it is one. `anomalies`
      compares a run against its cell's median and a cell of one has no spread, so nothing here
      separates a real difference from a run that went badly. The previous sweep reported zero
      anomalies while holding a 69-step run against a 5-step one on the same errand.

### What the sweep returned

Fifteen flows, arm A fresh, arm B standing. Zero mechanical failures, zero anomalies, zero payment
navigation.

| | arm A | arm B | |
| --- | ---: | ---: | --- |
| steps | **147** | 183 | −20% |
| cost | **$15.72** | $19.80 | −21% |
| tool output read | **481 458** | 1 119 855 | −57% |

Arm A is cheaper and shorter on **ten of the fifteen** flows and loses on five — 4, 6, 9, 13 and 14.
The widest wins are the flows with the most cart work in them: flow 2 at 12 steps against 27, flow
12 at 3 against 10, flow 11 at 14 against 24, flow 1 at 9 against 17.

**Read this as one repeat and nothing more.** `anomalies` compares a run against its cell's median
and a cell of one has no spread, so it reported zero while the table holds an 18-step run and a
3-step one. Nothing here separates a real difference from a run that went badly.

### Arm A got worse against itself, and only part of that is explained

Against the arm-A runs this sweep replaced — themselves a mix of last night's smoke and today's
individual re-runs — it is **147 steps against 119, $15.72 against $13.26, and nine errors against
three**. That is the risk written down before the sweep was started, and it has happened.

Six of the nine errors are one defect, and it is **not** a regression from this change:

```
silpo cart fill …
→ Invalid arguments for tool silpo_get_similar_products:
    timeslotStart: expected string, received undefined
    timeslotEnd:   expected string, received undefined
```

All three places that call it — `daemon/fill.ts:216`, `commands/fill.ts:214`,
`commands/products.ts:508` — pass `branchId`, `slug` and `deliveryType` and no timeslot, and always
have. The path only runs when a resolved product is out of stock and alternatives are fetched for
it, which no run had exercised until this one: the same grep over every earlier arm-A transcript
finds the error zero times. Worse stock today, and a defect that had been sitting there surfaced.

The rest is not explained. Flow 14 went from 5 steps to 17 with **no** errors at all: the agent
worked category by category, reading allergen lines across `Печиво`, `Зефір`, `Мармелад`,
`Желейні цукерки` and `Вафлі` rather than searching by name. That is a more thorough answer to
"сину не можна арахіс", not a broken one, and whether it is the reworded card rule or the spread of
a single run cannot be told apart at one repeat. Flow 4 doubled with no errors either.

- [x] 19.3 Fix the missing timeslot at all three `getSimilarProducts` call sites. Same shape as the
      offline-orders cap: the CLI sends the server something it rejects, and the raw validation
      error reaches the agent. It cost six errors and the steps spent around them in this sweep.
Repeats are **not** part of this change. This one takes the CLI and the skill to something worth
shipping; averaging the benchmark is separate work against a frozen arm, and doing it here would
mean re-running the suite after every fix the suite finds. What this change owes is a suite that
passes and an arm without known defects in it, which is what the sweep now shows.

The caveat travels with the number rather than being resolved by it: every cell is one run, and one
run per cell cannot separate a real difference from the spread. Today produced three demonstrations
— a figure quoted from one run twice turned out to be a property of that run, and a four-step
"win" turned out to be a failure.

### Why the compiler could not have caught it

The three call sites were not careless. `GetSimilarProductsArgs` did not declare `timeslotStart` or
`timeslotEnd` **at all**, and declared `deliveryType` optional where the server requires it — so
there was no type for the call sites to violate. Adding the fields to the type is the fix; the
compiler enforces the three call sites from here, and any fourth.

Two of the three had the values in hand and were dropping them on the floor: `ShipmentContext`
already carries `timeslotStart` and `timeslotEnd`, and the other two sites already hold the cart.

Checked the same question across the whole surface rather than fixing the one tool and moving on —
the server publishes `required` for every tool, so our argument types can be compared against it:

```
40 tools, 27 of them with required fields
silpo_get_similar_products
    MISSING from our type : timeslotEnd, timeslotStart
    declared OPTIONAL     : deliveryType
```

One tool, the one already found. The other twenty-six agree with their schemas. Verified live after
the fix: the same call that returned `expected string, received undefined` now returns
`success: true, Found 33 similar products`, and `cart fill` over ten items runs clean.

This is the third defect of one shape — the CLI sends the server something it will not accept, and
the raw validation error reaches the agent as though the agent had done something wrong. The other
two were the offline-orders cap and, in a different register, the daemon timeout. The comparison
above is cheap to re-run and worth running whenever the server's tool list changes.

## 20. Paging was in the wrong layer, twice

- [x] 20.1 It went into `src/mcp/` first. That folder is a faithful client of somebody else's
      server — tool types, transport, session — and a paged result is one this CLI assembled that no
      single call to that server ever returned. Moved out.
- [x] 20.2 Then into `src/daemon/`, wrapping the session so every path was covered. Also wrong: the
      daemon holds the connection and proxies, and giving it a behaviour of its own makes it
      something else.
- [x] 20.3 Put it where the repository already puts this: `readCapped` in `utils/paginate.ts`,
      called by whoever wants the rows. `resolve/products.ts` had a private copy of exactly that
      function and `resolve/stores.ts` paged offline receipts by hand — the pattern was established
      and `me orders` was the one caller outside it. The private copy is gone and both resolvers use
      the shared one.
- [x] 20.4 The caps live beside the tools they describe, in `mcp/tools/`, as `OFFLINE_ORDERS_CAP`
      and `ONLINE_ORDERS_CAP`. A cap is a fact about the server, which is what that folder holds;
      what the two resolvers had were two copies of the same number.

What this gave up, stated plainly: the caps are no longer read from the served schemas at runtime, so
a cap the server lowers would go unnoticed until a call failed. The check that found this defect —
comparing every tool's published `required` and `maximum` against our types — is written up in group
19 and is worth re-running when the server's tool list changes. That is a cheaper guard than an
interceptor that has to sit in the wrong layer to work.

- [x] 20.5 A trimming bug the move surfaced. `readCapped` caps the *total* it pages towards but reads
      whole pages, so asking for 25 rows at a page size of 10 returned 30. Harmless where it was —
      both resolvers feed the rows into a `Set` of ids — and not harmless at all under `me orders`,
      which would have printed twenty receipts for `--limit 15`. Trimmed, and covered by a test that
      fails without it.

Verified live at the command, which is the only place this defect was ever visible:

```
me orders --offline --limit 15  →  Found 15 offline orders (total: 20), 15 printed
me orders --offline --limit 25  →  Found 20 offline orders (total: 20)
me orders --offline --limit 4   →  Found 4 offline orders (total: 20)
me orders --limit 3             →  Found 3 orders (total: 11)
```

`npm test`: 680 tests, 680 pass.

## 21. A skill rule written from one run, and reverted

Flow 11's arm-A run in the sweep stopped and asked which of the account's saved addresses to deliver
to, wrote nothing, and failed its checks. The reflex was to give the skill a rule: where the account
answers a question, take the answer rather than putting it back. That rule was written, specced, and
then taken out again.

- [x] 21.1 Check the premise before keeping the fix. Counted the real `Bash` commands — not a grep
      over the transcript, which contains the skill's own text — across all three arm-A runs of flow
      11:

      | run | `cart setup` | `cart fill` |
      | --- | ---: | ---: |
      | before the sweep | 1 | 2 |
      | the sweep | 1 | 8 |
      | after the similar-products fix | **0** | **0** |

      Two runs in three resolved the address and did the work. There is no systematic gap to close —
      there is a behaviour that shows up about a third of the time. The rule was written from a
      single run, which is the error this change has now made twice: the first was reporting flow 14
      as "the sharpest separator in the suite, 5.1×" off one pair.

- [x] 21.2 Two further reasons the fix was in the wrong place, found while checking the first:

      It is not knowledge about the CLI. The skill exists so the reader can drive `silpo` without
      reading its help output; when to ask a person a question is not that, and group 17 had just
      taken 120 words out of the same file.

      It may be actively wrong. The account's fourteen saved addresses span five settlements. Picking one silently risks sending an order to
      another city, so stopping to ask is defensible behaviour rather than a failure, whatever the
      flow's criterion says about it.

- [x] 21.3 Revert both the rule and its requirement.
- [x] 21.5 Name the destination in the prompt instead. The ambiguity was deliberate, but what it
      actually did was split the same arm against itself — two runs resolved the address and filled
      the cart, the third asked and wrote nothing — which put a coin toss in front of the thing the
      flow exists to measure. A run that fails on the address fails before it has shown whether it
      can read in-store receipts at all.

      What that gives up is stated in the flow file rather than quietly dropped: nothing in the suite
      now measures whether an agent resolves an unnamed destination or stalls on it. That is a
      question about handling an underspecified request rather than about this CLI, and it deserves
      a flow of its own.

      Criterion 5 is stronger for it — the cart must reach the address the request names, not merely
      be set to delivery.

- [x] 21.4 Put `askedQuestion` in the summary table beside `err` and `rep`. The verdict already
      carries it and the analyzer already reads it, but it only reaches `analysis.json` — this
      failure was invisible in the table and was found by opening that file. A run that answered with
      a question rather than the work should be visible where the numbers are read, so the frequency
      can be measured instead of patched. Added as an `asked` column, blank where nobody asked, so
      it reads as an exception rather than a column of zeroes.

## 22. The sweep read back, and the six defects it named

The suite ran clean — no mechanical failure, no anomaly, no payment navigation — and reading the
transcripts rather than the totals found six defects the totals had hidden. Two of them are the
reason the totals looked good.

- [x] 22.1 Read the sweep. Arm A takes 126 steps against 178, $13.67 against $19.60, and 474 332
      characters of tool output against 1 093 752. Output tokens are 122 682 against 119 771 — a 2.4%
      **loss**. The wrapper does not make the model think or write less. It makes it read less, and
      every saving is on the input side.

      Wall clock is a loss too: 2 275 s against 1 957 s. Outside the API arm A spends 285 s against
      55 — 2.3 s a step against 0.3 — for node's start, the daemon, and the calls one command makes
      in series. Whoever quotes the steps and the cost has to quote this beside them.

      Where the reading goes: 76 of arm B's 178 steps fetch cart, profile, family, restrictions,
      branches and timeslots before any work, which the CLI holds; `find_products_batch` alone is
      673 542 characters, 62% of arm B's whole output; 16 shell steps and a `Read` go on `jq` over
      spilled payloads, against none in arm A; and 151 `silpo` invocations fit into 106 shell steps,
      which no sequence of tool calls can do.

- [x] 22.2 Two of the three flows arm A loses on, it loses by doing the work. Flow 13: arm A received
      `Енергетична цінність` five times and arm B not once, and arm B's nutrition table was invented
      — its five steps are cheap because it skipped the errand's second criterion. Flow 14: arm A
      received 64 allergen declarations and arm B none, went to silpo.ua for them, was refused with a
      403, and then stated in its answer that the catalogue carries no allergen data at all, which
      arm A had disproved the same day.

      A benchmark reporting steps and characters with no quality axis rewards the arm that cut the
      corner. Flow 9 is the same trade run the other way: arm A won all four headline metrics while
      putting a smoked deli fillet at 679 UAH/kg in the cart under `куряче філе`.

- [x] 22.3 The tie-break was overriding the shop's own relevance. `settleTerm` called every candidate
      sharing the top's coordination tied, and a single-word term expands to a single probe, so all
      hundred were tied and the promotion rule picked whatever was discounted anywhere in the pool.
      Measured against the live server: `морква` settled on a baby purée, `банани` on a milk drink,
      `рис` on noodles — while the carrot, the banana and the rice sat at position zero, accounted,
      in the same list.

      The candidate set was never the problem. The matcher scores the carrot 0.84 against the purée's
      0.64 and marks both accounted; sorting is correct; `settleTerm` discarded the result. Requiring
      a tied candidate to answer the term at least as well as the first one does confines the
      tie-breaks to the several right answers they were written for. All six tie-break tests stand.

      Cost of the defect: on the four unconstrained fill flows arm A's basket is 48%, 62%, 72% and
      48% dearer than arm B's for the same list.

- [x] 22.4 Asking for an amount of a weighted product was impossible, not merely inaccurate. A mass
      beside a term became a pack specification, a weighted product carries no pack, so the
      comparison failed and the term asked instead of settling — `морква 0.5 кг` returned a question
      with the right carrot as its first candidate. That is why every write flow ends in a separate
      quantity write: eight of them across seven of the nine flows, carrying 0.2, 0.22, 0.4, 0.5,
      0.6, 0.75 and 1.9. A mass is now the quantity, converted by division so that 950 g is 0.95 and
      not 0.9500000000000001.

- [x] 22.5 `шт` was being searched for. It is the unit a count is written in, so `яйця курячі 10 шт`
      was searched as `яйця курячі шт` and answered among its candidates with a chicken drumstick. It
      is now read with the number and never reaches the term.

      `10 шт` still reads as ten, which is wrong for eggs and right for `авокадо 2 шт` and
      `йогурт питний 3 шт` — two of the three such items in the sweep. Left as it is, because the
      settled line now prints `×10` where it used to print nothing, so the misreading surfaces on the
      line rather than in the cart total.

- [x] 22.6 Settled lines name their term and their amount. Twenty items went in, seventeen lines came
      back, in an order of their own, with no mapping between them — so the agent caught the three
      matches absurd on their face and not the fillet at 679 UAH/kg, and `--pick`, keyed on the term
      as the parser made it, had nothing to key on for an item that settled. Weighted amounts print
      always, a quantity of one there being a whole kilogram.

- [x] 22.7 `--ask-all` could not offer what it had not recorded. A settled line kept only the product
      it settled on, so the flag re-asked with a single candidate: measured, one where eight existed.
      A settled line now keeps the candidates it chose among.

- [x] 22.8 `--limit` bounded the merged listing rather than each query. Ten queries under a limit of
      four answered four and returned nothing for six, while the summary reported a found count for
      all ten. The agent named it in its own narration — *«`--limit` ріже весь список, а не кожен
      запит»* — and spent three searches and 15 840 characters, 36% of that flow's output, working
      around it. The limit is now per query; a selector's residue stays a filler.

- [x] 22.9 The harness measured three things wrongly, and this change put one of them there.

      `asked` fired on every read flow. The rule is an empty cart plus a question mark, and an empty
      cart is what a read flow requires — so flow 4 and flow 5 arm B were flagged for closing a
      finished answer with an offer. It now asks only of flows that write.

      `repeats` keyed on the whole tool input, and a shell step's input carries a `description` the
      model rewrites every time, so a repeated command could never be recognised as one. Arm A's
      zero was unearned: keyed on the command, it has two. Arm B's fourteen are all one call —
      re-reading the cart after a write, which the MCP gives no other way to do — so the headline
      "0 against 14" was wrong in both directions.

      `anomalies` compares a run against its own cell's median, and with one run to a cell the median
      is the run. The rule cannot fire. Its zero is arithmetic, not evidence, and should not be read
      as a clean matrix.

- [x] 22.10 A quality axis in the checks, mechanical enough to keep. A `cites:` line names a phrase
      that has to appear somewhere in what the tools handed back — the question being whether a
      figure the answer rests on was ever received at all, which is where a remembered number and a
      read one stop looking alike. Flow 13 cites `Енергетична цінність`, flow 14 `Містить алергени`.

      Run against the sweep it fails exactly the two runs that invented their answers, and passes
      both arm-A runs beside them. Asserting prices or basket totals was considered and refused: the
      assortment moves, and a check that rots in a week teaches nothing.

## 23. The review of group 22, and the three regressions it caught

- [x] 23.1 The tie rule existed in two copies and only one was fixed. `decisiveTop` in the listing
      asks the same question — was the ordering decisive enough to fetch alternatives for an
      unavailable match — and still filtered on coordination alone, so a term `settleTerm` now
      settles was read by the listing as tied and its alternatives went unfetched. Extracted as
      `tiedCandidates`, read from one place by both. This also retires the `tied[0]!` assertion: the
      first tied candidate is the first candidate, always.

- [x] 23.2 The per-query bound was losing which queries matched a product. `matchedBy` was recorded
      inside the slice, so a query that matched past its own allowance a product another query had
      placed no longer named itself on that record — against a requirement the delta kept unchanged.
      Recording runs over every candidate; only placement spends the allowance.

- [x] 23.3 A settled line printed the amount asked for beside the price the cart came back with. Two
      moments stated as one: a quantity the branch cannot honour is reduced on the way in, so the
      line read `×3` above a `reduced: from 3 to 2` row and a cart holding two. It prints what the
      cart holds, falling back to what was asked only where the product is not in the cart to ask.

- [x] 23.4 `шт` was consumed only where it was written apart from the number. `2шт` is three
      characters, so it survived the probe filter and went out as its own probe — the noise the rule
      was written to remove, in the form a list is as likely to carry.

- [x] 23.5 A shortfall's remainder is counted in the short product's own unit, and was being carried
      over to the first alternative whatever that was counted in: 0.35 of a kilogram written as 0.35
      of a packet. `ResolvedCandidate` carries `weighted`, and the top-up happens only between
      products counted the same way.

- [x] 23.6 `orderedWeight` accepted a zero. `морква 0кг` would have passed the stock test and written
      a cart line holding nothing; it is read as no amount given.

- [x] 23.7 Nothing tested the gate the group turned on. Every candidate in the fixtures carried the
      same score, so deleting `score >= top.score` left all 683 tests green. Three tests now cover
      it — a promotion and a purchase each failing to reach a worse answer, and an equal answer still
      being reached — and removing the clause fails two of them.

      Four more gaps closed beside it: `шт` in both forms and a mass that is not a count; `--ask-all`
      over a term with more than one candidate, which the only existing test did not have;
      a weighted term written and printed; and a selector's residue against the room the queries left.

- [x] 23.8 A rewritten test had gone vacuous. The page-size guard on fetching alternatives was
      exercised by a setup that, under a per-query bound, no longer pushes anything off the page —
      both products were accounted, so the run never reached the guard and would have passed with it
      deleted. Split in two: the guard is reached through `--limit 0`, which is the only way left to
      print nothing, and a second test states the new invariant, that a query's decisive top is on
      the page whatever the page size.

- [x] 23.9 A second requirement said the opposite of the change. `product-search` carries the page
      size in two places, and the delta had modified only one; the other still read "SHALL NOT cap
      each query separately", which would have archived the capability into contradicting itself.
      Both now carry the same rule.

- [x] 23.10 The gate's reach is bounded in the spec rather than overstated. The score rewards a name
      the term fills more of, so a candidate scoring above the first is admitted — deliberate, and
      why a promoted `Морква` may still take a term first answered by `Морква мита`. What stays
      unguarded is an off-kind product whose name is also mostly the term. Nothing measured produces
      one, and the requirement says that rather than claiming it cannot happen.

## 24. The server moved under the change

The MCP reached 1.110.1 while this change was being written, with six entries. Checked live against
the running server, which is already on it.

- [x] 24.1 Nothing breaks. The one breaking entry — `silpo_get_similar_products` now requiring the
      delivery timeslot to report stock accurately — is the defect this change already found and
      fixed from the other side: `GetSimilarProductsArgs` has carried `timeslotStart` and
      `timeslotEnd` since group 18, and all three call sites pass them.

- [x] 24.2 One entry is load-bearing for what group 22 built. `silpo_get_product_details` was
      reporting `weighted: false` for products sold by weight. Read from a card, that is the flag
      `orderedWeight` decides on, and `resolvePicked` reaches `finalizeChoice` without passing
      through `matchesSpecification` — so `--pick` on a weighted item written with a mass would have
      fallen back to a quantity of one and bought a kilogram where 300 g was asked for, silently.
      Verified live: `morkva-myta-367056` now reports `weighted: true`. The code was right and the
      server was lying to it; nothing to change, but the fix is a precondition rather than a bonus.

- [x] 24.3 The price filters never reached us. `fromPrice`/`toPrice` were broken server-side and are
      now fixed, but `matchesFilters` applies both itself and the CLI does not send them. Pushing
      them to the server would narrow a population before the read ceiling truncates it, which is
      worth measuring — and it is a change to what the CLI asks for rather than a fix to what this
      change broke, so it is noted and not made.

- [x] 24.4 `displayPrice` is new on both the listing and the card, and is the price of one
      `displayRatio`: `Морква мита` carries `price: 30.99` per kilogram, `displayRatio: "100г"` and
      `displayPrice: 3.1`. For a packaged product it equals `price`. Our own rendering already prints
      `30.99 ₴/кг`, which states the same thing without a second number to reconcile. Not adopted.

- [x] 24.5 Empty and whitespace-only search entries never left the CLI: `expandProbes` drops a probe
      whose normalised form is empty, so the crash that entry fixes was unreachable from here.

- [x] 24.6 The sort limitation is real, inherited, and now stated in the skill. `--sort-by price`
      orders on the `price` field, which is per kilogram for a weighed product and per pack for a
      packaged one — `Морква мита` at 30.99/kg sorts against `Морква свіжа «Моркішка» 85г` at 46.49 a
      pack. The server documents this as upstream and unfixable, so the skill says to read such an
      order as rough and compare the printed prices rather than the positions.

- [x] 24.7 The sweep this change ends on will measure the CLI fixes and the server's move together.
      They cannot be separated after the fact, and arm B's stored rows predate both. Whoever quotes
      the numbers says so.

## 25. The sweep, re-measured, and the parser finished

Arm A re-run over all fifteen flows against the fixed CLI and a server already on 1.110.1. The
previous arm-A runs were deleted rather than kept beside it, so the comparison below is against the
figures recorded in group 22 and not against anything still on disk.

- [x] 25.1 The headline reads flat and is not. 128 steps against 126, $13.57 against $13.67, and
      385 802 characters against 474 332 — a fifth less read, and the step count unmoved.

      Eight HTTP 502s explain it, and all eight fall in two flows: four in flow 7 and four in flow 11,
      the two that blew up (9 → 18 and 9 → 34 steps). A 502 kills a whole `cart fill` and then costs
      two or three more steps re-reading the cart to learn what landed before it died. **Without
      those two flows: 76 steps against 108, a third fewer.** Retrying a 5xx is out of scope by
      decision — it is the server — but the price of not retrying is now measured rather than
      assumed.

- [x] 25.2 The basket claim held. Flow 9, the twenty-item list: **3096 UAH against 1803**, 42% off,
      where the raw-MCP arm spent 1798 for the same list. The tie-break was the whole of it. Flow 6
      came down 1246 → 1087. The two budget-bound flows land where they landed before, 698 of 700 and
      497 of 500.

- [x] 25.3 Flow 4 went 14 steps to 4, and flow 14 seventeen to four. Flow 4 is the one whose agent
      had written the `--limit` defect down in its own narration and spent three searches around it.

- [x] 25.4 The weight in an item is in use, widely: 135 positions across eight flows carry one —
      `фарш баранячий 500 г`, `яблуко Голден 0.6 кг`, `Пангасіус Філе с/м в глазурі 0.8 кг`. The
      separate quantity write is down to six calls, and they are cart edits after review rather than
      repairs of a fill that could not say what was wanted.

- [x] 25.5 Every arm-A run passes its mechanical checks, the two failures in the report being arm B's
      fabricated nutrition and allergen answers from the earlier sitting. What that says is bounded:
      the checks are the `## Checks` block, and the prose criteria in the flow files are a person's
      judgement that nothing here has made. `anomalies: 0` remains arithmetic.

- [x] 25.6 The count is read against the product now, which finishes what 22.5 left. The run caught
      the residue live: `яйця курячі 10 шт` bought ten cartons of ten and took the basket to 4795 UAH.
      The mitigation worked exactly as designed — the agent saw `×10` on the settled line and
      corrected it in the next step, to 4206 — but a line the caller has to correct is a line the CLI
      got wrong.

      `шт` after a number is now carried as a count candidate and read where the weight is read: where
      the product's own pack is that many pieces the number named the pack and one is bought, and
      anywhere else it is how many to buy. Verified live — a pick of a ten-carton settles at one, and
      `авокадо 2 шт` still settles at two.

- [x] 25.7 One defect is left open and named. Flow 11 steps 10 and 12 refused a fill with `the cart's
      delivery slot cannot be booked and no slot at the branch is available to replace it`, while
      `silpo slots --type DeliveryHome` two steps later listed four available, including the very
      slot the cart was holding. That is ours, it cost four steps, and it is the same shape as the
      defect group 14 addressed from the other side. Not diagnosed here.
