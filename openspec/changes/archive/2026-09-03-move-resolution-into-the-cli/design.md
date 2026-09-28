## Context

See proposal.md — Why. Three facts from the current state shape everything below.

**Two different things are called payload compression, and only one of them is exhausted.**
The benchmark ran 100 agent sessions across two arms. Step counts are close; the money is
in volume. The CLI's first lever — JSON rendered as `key: value`, fields hoisted into `common` —
reached a median of 72.6% and has no more to give: what is left is already terse.

But terseness is not the only way a payload shrinks. On the new-year errand a single
`find_products_batch` response ran to **45 612 characters** — more than the entire tool output of the
CLI arm's whole run — and no formatting rule can touch it, because every candidate in it is there
*so that the agent can choose*. The payload exists because the choice does. Move the choice and the
payload stops being rendered at all.

That is this change's largest single lever, and it is worth naming precisely, because the first
draft of this proposal mis-framed it as wrong-turn removal. It is neither: it is **payload
suppression**, a third thing, and it works even when the index is cold.

**And the wrong turns are the second lever, measured separately.** The arm-A-against-arm-A rounds
show the rest of the gain came from deleting wrong turns. On the promotions cell, four rounds moved
the median from 16 steps to 8 and the spread from 8–21 to 6–8. The spread is the signal: a rule that
removes a wrong turn does not make a good run faster, it stops a bad run happening.

**A local identifier layer was removed from this repository the day before this change was
proposed.** `openspec/changes/archive/2026-09-02-drop-local-identifiers` deleted a sqlite mapping
that minted a number for every remote identity, because it "has to be right in six entity families
at once, and it keeps being wrong in a new place". Anything that reintroduces on-disk state has to
say how it differs.

**The CLI already runs a daemon.** `src/daemon/` holds the MCP session and the active cart across
commands, and re-reads the cart around every write. It is the only long-lived process the CLI has.

## Goals / Non-Goals

**Goals:**

- Move three classes of decision out of the agent: which product a list item means, which
  identifier form a command wants, and how a destination becomes a store, a type, an address and a
  slot.
- Shrink the skill by shrinking what the agent must be taught, not by writing more tersely.
- Keep every decision the CLI makes inspectable, because hidden state that fills a cart is
  otherwise undebuggable.
- Leave the measurement harness able to attribute the result.

**Non-Goals:**

- Embeddings, vector search, and any ONNX runtime. See the first decision below.
- Caching catalogue state. The index holds identity only.
- Replacing the MCP. Every command still resolves to a `tools/call` against the same endpoint.
- Choosing for the caller where a choice is genuinely theirs — an ambiguous destination, a
  restricted product, an unresolvable term.

## Decisions

### Lexical ranking now; embeddings only if a measurement demands them

BM25 over character trigrams, plus a 200–300 term Russian-to-Ukrainian product dictionary. No
semantic model.

*Why not `multilingual-e5-small`, as first proposed.* Three reasons, in order of weight.

1. **The semantic fallback is already in the loop and already paid for.** The `ask` outcome hands an
   ambiguity to the agent, which holds something the ranker never sees: the intent behind the
   errand. A model costs its download and its cold start to move some fraction of decisions from
   "ask the agent" to "decide silently". That fraction is unmeasured. Measure it first.
2. **Cost.** `@huggingface/transformers` is 9.5 MB but pulls `onnxruntime-node` at 296 MB unpacked,
   plus `onnxruntime-web` and `sharp`, plus roughly 120 MB of quantised model fetched at first run.
   Against a project whose stated constraint is "no runtime dependencies beyond those", for a CLI
   installed from a clone, that is a four-hundred-fold increase in install weight.
3. **Fit.** The model is 384-dimensional across 100 languages, Ukrainian thinly represented, trained
   on sentences. Product titles are short noun phrases carrying brands and numbers — the case
   sentence embeddings are worst at. And the thing they blur is exactly what matters here: 2.5%
   against 1%, 900 g against 500 g.

*What the dictionary is for.* The real semantic gap in this domain is translation and category
synonymy — `творог` to `сир кисломолочний`, `газировка` to `напої газовані`. A few hundred terms
close most of it deterministically, are debuggable by eye, and weigh nothing. The dictionary is the
precision instrument; an embedding would be the recall extender. Ship precision first.

*What would change this.* The eval splits fixtures by query type. If a lexical channel fails a
nameable class of query at a rate the `ask` path cannot absorb, that number justifies the 400 MB.
Nothing else does.

**Alternative considered:** a hosted embedding API. Rejected — it puts the network back on the
resolution path, costs per call, and makes offline eval impossible, which is the one thing the eval
must be.

### The index is a corpus, not a translator

This is the distinction that separates it from the layer deleted yesterday.

```
deleted resolver              this index
────────────────────────      ──────────────────────────────
minted a number               mints nothing
number → remote identity      text → candidate identities
must be right always          allowed to return nothing
wrong = silent wrong id       wrong = an ask, or a miss
one lookup, one answer        ranked candidates under a policy
```

Concretely: every identifier printed and accepted is the one the server issued. The index widens
what a handle can be looked up *by*; it never substitutes one handle for another it invented.

### There is no `get`, and dissolving it was the review's doing

The first draft merged four card commands into one `get <handle>` dispatching on the form of a
handle and on what the index had seen. It does not survive contact with the identifiers:

```
a bare uuid     names a product, a branch, a company, a settlement or an office
a bare integer  names a coupon id and an external product id
```

Form does not discriminate. And "dispatch on what the index has seen" reproduces, in one clause, the
exact defect the archived change deleted the resolvers for — *"a category uuid the table happens to
hold resolves while one it does not silently fails"*. The corpus-not-translator argument above
answers a different objection: the problem was never minting, it was behaviour that depends on cache
contents.

`get` also bought less than it was credited with. It was justified by killing the skill's identifier
table, but **the index kills that table, not `get`** — the table exists because different tools take
different forms, and the index is what supplies a form the caller's record lacks. What `get` actually
merged was four card commands, worth six or eight lines of skill.

So lookups stay with their families, where a form is unambiguous within the family:

```
product <handle>        uuid, slug or externalId — all three reach one tool
browse <slug> --tree    a category with its subtree
stores <uuid|query>     one store, out of the listing the CLI already pages
me coupon <id>          beside the listing the id came from
```

**Alternatives considered.** An entity prefix — `product:<uuid>` — is a sound mechanism and not a
revival of the deleted layer, because the caller writes the prefix and the identifier under it is
still the server's, with no mapping and no state; it is how `git` and `docker` address things. It is
held in reserve rather than adopted, because once `get` is dissolved there is no site where a handle
crosses families, so it would solve nothing today. An optional `--kind` that prints candidates on
ambiguity was rejected as the most expensive option: probing means calling several tools per lookup,
and a bare uuid is the common case rather than the rare one, so the cost lands on nearly every call.
Ephemeral per-listing numbers were rejected as strictly worse than the persistent ones already
deleted — two listings and a back-reference resolve to the wrong row.

### Identity is cached; state never is

`cart add` already reports `reduced` and `unfillable`. The cart write is therefore the authority on
stock, and the index does not need to be right about it — only about which product a term means.

This is not a small simplification. It dissolves three questions at once:

- **Different TTLs for price, name and availability.** No TTL. Titles and brands move over months
  and are rewritten lazily on every hit; state is never stored, so nothing expires.
- **Keying by branch.** `productId` is catalogue-global. One index. The set of branches a product
  was seen at is a ranking bonus, never a filter.
- **Invalidating on a store move.** Nothing invalidates. A product unseen at the new store loses a
  small bonus; if the store genuinely cannot supply it, the cart write says so on the path that
  already handles that.

**Alternative considered:** per-branch indexes with a validation timestamp per record. Rejected — it
buys accuracy about state that the cart write already provides, at the cost of duplicating identity
across branches and a staleness story in every command.

### Quantity, pack size and specification are three things

The first sketch of this pipeline treated a parsed pack size as a post-filter that blocks a silent
choice. That conflates two different questions:

```
молоко 2,5%   → specification: fat 2.5%     which product   hard filter
молоко 950г   → specification: pack 950 g   which product   hard filter
молоко 2      → quantity: 2                 how much        not a filter
```

Treating `2` in `молоко 2` as a pack size blocks a silent choice on every candidate whose pack is
not two of something — which is all of them. And in dairy the percentage *is* the disambiguator, and
it is not a pack size at all.

Rule: a bare number is a quantity; a percentage is always a specification; a number carrying a mass
or volume unit is a pack size where a candidate carries that pack, and a quantity otherwise.

### Thresholds are asymmetric, and the budget is wrong-auto

A wrong silent choice is discovered at the till. A question costs one line of output and, at worst,
one turn. The thresholds are set to favour asking, and the metric they are tuned against is the rate
of wrong silent choices, not the rate of silent choices.

Three gates must all pass for a silent choice: an absolute score, a relative margin over the second
candidate, and every specification the item named. History raises rank but does not substitute for
any of the three.

### An ask returns to the agent, and all asks return together

An `ask` goes to the agent rather than to the person, because the agent holds the errand's intent —
which coffee, for which machine, for how many people — and the ranker never saw it. That is the
agent's only genuine advantage over the local ranker, and it is real.

All asks are answered in one further call. Resolving one ambiguity per command rebuilds the loop the
skill spent four rounds removing.

### The outcome prints names, not identifiers

The first sketch wrote the full resolved list to a file and handed out the path. That is a second
command to read it, on a change whose whole purpose is fewer steps — and the errand's own pass
criteria require the agent to report the basket to a person.

Seventeen resolved items print as roughly 700 bytes of names and prices against a session context of
half a million tokens. Identifiers appear only on `ask` rows, where one is passed back. The agent
needs names for the person; it needs identifiers only where it owes a decision.

### Dietary restrictions warn; they do not filter

A hard filter that silently drops something the caller asked for by name is exactly the failure the
skill's own Gotchas section catalogues: succeeds, changes nothing, tells no one. The restriction
becomes a `warn` row and the choice stays with the agent, which knows whether the errand is for the
person who holds the restriction.

### Ambiguity in the delivery chain prints and stops

`cart setup --to` chains geocoding, delivery types, branch selection and slot selection. Each step
can have more than one plausible candidate, and the deleted resolver's recorded sin was inventing a
context "out of nothing" when a lookup needed one and had none.

The rule is absolute: more than one plausible candidate and no rule to separate them means print the
candidates and stop, in the same shape as an `ask`. Never the first row of a listing — the store
listing is not ordered by anything the caller cares about and its head is Kyiv.

### Two filters have no server behind them, and the ceiling is 500 records

`get_products` takes no query. `find_products_batch` takes no scope. No product payload carries a
category. `list_branches` is `{limit, offset, hasPickup, hasNP}` — no name, no coordinate. So a query
inside a scope, and a store narrowed by name or place, are both the CLI paging a listing and matching
the text itself.

That is a real cost and the specs state it rather than implying a server does the work. The number
belongs here: **the CLI reads at most 500 records before it stops**, whatever the scope, and says in
the listing when the ceiling truncated it rather than presenting a partial answer as a whole one.

500 is chosen against the two things it has to sit between. The store listing is 455 rows, so one
ceiling covers it whole — and the archived change named "a branch number sends the CLI for a 455-row
listing mid-command" as a defect precisely because it happened *invisibly*, mid-command, to a caller
who had asked for something else. Here it is the caller's own explicit request, and it is bounded and
reported. On the other side, a category the size of a supermarket aisle runs to a few hundred, so 500
answers most scopes completely; the ones it truncates are the ones where a scope was the wrong tool
and the caller wanted a plain search.

**Alternative considered:** an unbounded walk with a warning. Rejected — an unbounded walk over a
large promotion is a minute of latency and dozens of calls for a query that a plain search answers in
one.

### Storage and where the work runs

- **`node:sqlite`.** Built into Node 22; not a dependency. It was removed yesterday because it had
  no reader left, not because it was wrong.
- **`minisearch` for BM25.** 826 KB, zero transitive dependencies, field boosting, and a
  replaceable tokeniser for character trigrams. The alternative, `wink-bm25-text-search`, pulls
  `wink-nlp` and an English language model — the wrong shape for a Ukrainian catalogue.
- **The BM25 index is rebuilt at daemon start**, not persisted. A few thousand records is
  milliseconds; a persisted index is a second source of truth that will diverge from the records.
- **The index lives in the daemon.** It is already the long-lived process. Loading and indexing per
  CLI invocation would pay the cost on every command.
- **Enrichment runs after the answer is printed**, never on the path to it.

### Evaluation bootstraps from the account's own history

Fixtures are the gate on the whole thing: without labelled query-to-product pairs there is no way to
set a threshold, and the policy is guesswork. Building them from scratch is the expensive part.

The shortcut: hold out. Build the index from all orders but the most recent few, and draw queries
from those held-out orders. What still needs producing by hand is the colloquial phrasing — a
receipt's full product title matches nothing as a search term, so the fixture needs how a person
would have written it. Generating candidate phrasings and having them checked is hours, not days.

Eval runs offline against cached fixtures. A rate limit on the tenth run would end the iteration.

### Measurement, given this ships as one change

Shipping as one change costs the ability to attribute the result to a lever. Recovered cheaply: run
the benchmark matrix with two repeats on flows 1 and 5 after the delivery chain lands and again after
resolution lands. Two extra rounds, and the breakdown survives.

The harness is broken as it stands — `reset()` calls `silpo gain clear` and `run()` calls
`silpo gain`, both removed yesterday. Repairing it is the first task, because without the harness
nothing here can be shown to have worked.

## Risks / Trade-offs

**The ranker is weaker than it was designed to be.** The field weighting this change was drafted
around does not exist: no product payload carries a brand or a category, so BM25 has one field. →
The brand is still inside the name and trigrams reach it, and the ru→uk dictionary carries more of
the load. But the honest consequence is that the gates will be tuned against a weaker signal, which
pushes them conservative, which lowers the auto-rate. **This is the risk most likely to decide
whether the change pays for itself**, and it is why the eval in group 12 is not optional.

**The benchmark writes to the index it measures.** Every listing folds into the index, `reset()`
does not clear it, and every run uses the real home directory — so repeat 2 of a cell resolves
against what repeat 1 searched, later runs of a cell are systematically cheaper, and
arm-A-against-arm-A stops meaning anything. → The index location follows from the home directory and
nothing else, so a run gets its own; `reset()` points the home directory somewhere per-run. Without
this the change cannot be measured at all, which is the one thing it must be.

**A cold index makes `fill` worse than what it replaces.** On a first run, after a rebuild, and for
any product never bought, there is nothing to resolve against: the live search runs anyway, and the
caller additionally pays for a printed candidate list and a second call. → The saving that survives
in that state is the one that matters most — the 45 612-character batch response never enters the
context and is never re-sent on later turns. The outcome says a resolution came from a live search
rather than from history, so a low auto-rate reads as a cold index rather than a malfunction.

**The index is hidden state that decides what enters a cart.** → `index why <term>` prints the
candidates, their scores and the deciding rule; `index rebuild` discards everything. Every record is
derivable from the account, so nothing is lost by discarding.

**A wrong silent choice is discovered at the till.** → Three gates, asymmetric thresholds, and
wrong-auto as the tuned metric. Accepted residual: the rate will not be zero.

**Lexical ranking may fail a class of query the dictionary does not cover.** → The eval splits by
query type precisely so an average cannot hide it. The `ask` path absorbs failures at a cost of one
turn, which bounds the damage.

**Everything breaks at once: 43 expected outputs, all fixtures, the whole skill.** → Accepted
deliberately; the alternative is three rounds of the same breakage. Mitigation is ordering: the
harness first, then the index, then the surface, then resolution.

**`--in` may match a category and a promotion by the same name.** → Prints both and stops. The same
rule as everywhere else.

**`me` costs three calls even when the caller wants a name.** → Accepted. The old skill's rule 3
taught the agent to make all three calls together anyway; bundling them removes a step rather than
adding cost.

**The daemon now holds more state, so two concurrent commands can interleave over it.** → Index
writes are enrichment only and are idempotent per record; a read during a write returns the
pre-write record, which is a stale ranking bonus at worst, never a wrong identity.

## Migration Plan

No data migration: there is nothing on disk to carry forward but the token-less configuration and
the stored credential, and neither is touched. The index is built on first use from the account.

Rollback is `git revert` plus deleting the index file. Nothing the CLI wrote is worth preserving —
every record is derivable, and no other program reads it.

## Open Questions

- **How the ru→uk dictionary is seeded.** Hand-written, drawn from the caller's own order history,
  or both. It changes the first day of work on the dictionary and nothing about the specs, the
  approach, or the task breakdown.
