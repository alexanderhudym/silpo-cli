## Context

See proposal.md — Why. What follows is the state that shapes the approach, most of it measured
against the live server and the reference web client on 2026-09-01.

- The background process in `src/daemon/` is the only thing that survives between CLI invocations.
  Each command is its own short-lived process; there is no other place a session could live.
- Its idle countdown restarts on every request, so during active work it does not expire.
- Credentials are re-read from disk on every token lookup, so the process holding a long life does
  not hold a stale token. The access token's own lifetime is thirty days.
- The server flags a bad cart but never repairs one. A cart with a lapsed slot stays lapsed
  indefinitely; every line in it reports zero stock while it does.
- The web client repairs it, and only on a cart read: read cart → see a timeslot validation → read
  the branch's slots → write the first one marked available → read the cart again. Observed twice,
  once at page load and once mid-session after an unrelated add. Four minutes of an idle open page
  produced no requests at all, and left a deliberately broken slot broken.
- The web client reads the cart once per page load and never again for a read. Moving between pages
  inside the app and opening the cart panel in full both cost no request; only a write does, and it
  is answered `202` and followed immediately by one read.
- The web client caches `basketId`, the branch and the address in `localStorage`, and nothing else —
  no timeslot, no delivery type, no cart lines. It rewrites those keys from every cart response.
- One page load performed eight catalogue calls off a single cart read, with the branch, delivery
  type and slot frozen into each URL.
- A write reports success regardless of what it did. Over-stock quantities, unavailable products and
  nonexistent product ids all return `success: true`; the cart read afterwards is the only evidence.
  The server's own tool description now says so.
- `address` on a cart update replaces the stored address wholesale. A partial address silently
  truncates the stored one, which is how the account under test lost the city and street of its
  pickup address and became impossible to check out.

## Goals / Non-Goals

**Goals:**

- One place owns the cart, and every call that needs the branch, the delivery type or the time slot
  reads them off it.
- The cart can be absent, never stale beyond the process that holds it.
- The CLI performs the repairs the server expects a client to perform.

**Non-Goals:**

- A local draft of cart contents, or any deferred write. Measured across the 101 recorded runs:
  seventeen of the nineteen that touch the cart already issue exactly one `cart add`, so batching is
  already happening and a draft would save a call in roughly one run in ten while introducing a
  window in which this CLI and the Silpo app disagree about what is in the cart.
- Matching the web client's silence about a reduced quantity. It reduces without a word; an agent
  relaying to a person has to say it.
- Placing an order. The checkout link stays the only exit.

## Decisions

### The cart lives in the background process, not on disk

A file would have to carry an invalidation policy — when it is stale, what clears it, what a logout
does to it — and every command process would have to remember to update it. The background process
already outlives a command and already dies on logout, which disposes of the previous identity's
cart for free.

Alternatives considered. A JSON file beside `token.json`: needs a hand-written staleness rule, and a
file can hold a value that is wrong with no way to know. SQLite: the same, plus the cart is session
state rather than a record, and the database is treated as disposable, so it would have to survive
its deletion anyway.

The trade-off is that a cold process pays two calls to seed. Those two calls are
`silpo_get_my_shopping_cart` followed by `silpo_get_shopping_cart_by_id` — precisely the session
start the server's documentation prescribes — so this is the documented opening, not overhead. They
are made before the process listens, not when something first asks. That is what lets the cart be a
plain field rather than an optional one: a running process always has it, no request path has to seed
it, and the only in-flight operation left to guard is a repair. The price is that a cart that cannot
be built stops the process from starting at all, which the login failure already does, and which
tells the user the one thing they can act on.

### The process holds the cart, and the CLI consumes it through cart operations

An earlier shape of this had commands read the cart themselves while the process watched the traffic
go by, refreshing the context whenever a proxied answer happened to be a cart. That left two paths to
the same fact and a line of code that had to know which tool names matter — every tool call, cart or
not, went through a test for one of them. A command could also reach the cart without the process
learning anything, if it ever called the tool by another name.

The process holds the cart instead, and offers it through operations named for what they do to a
cart: read it, add products, remove them, empty it, change delivery, apply certificates. No tool name
crosses that boundary, so the commands do not have to be edited when the tools underneath move. A
command never calls a cart tool, never holds a copy, and cannot forget the read the server demands
after a write. The proxy goes back to forwarding answers it does not look at.

There is no second structure beside the cart. An earlier draft carried a derived context — branch,
delivery type, time slot, address, shipments — over the socket as well, and it was the same facts in
a second shape, kept in sync with the first. Commands read what they need off the cart, and the one
awkward field, the branch, is reached through the shipment the cart is on.

Nor is there anything guarding the repair against being run twice. Commands are separate processes
that arrive one at a time in ordinary use, and two of them repairing the same slot writes the same
slot twice — a wasted call, not a wrong cart. A promise held to prevent it would be machinery
standing against nothing.

The cart is answered from what is held, and re-read only after a write the process itself made. This was measured against the reference client on 2026-09-01 rather than argued:

| on the web | reads of the cart |
| --- | --- |
| page load | one, followed by the branch's slot listing |
| moving to a category within the app | none |
| opening the cart panel — three lines, discount, total, checkout button | none |
| changing a quantity | `PATCH …/products` → `202`, then one read |

The panel renders the whole cart with no request at all. We go one step further than that and confirm
the cart's identity on every read, because a CLI process outlives a page load differently: a tab is
abandoned when the user walks away, while our process sits for ten minutes and is asked again.

That leaves one way to be wrong: the contents of the same cart changed on another device. The
reference client has the same hole and lives with it, and the accepted cost of closing it would be a
full cart read on every catalogue call. The mandatory read after a write still happens — the process
makes it, so a command cannot forget to.

### The cart is not re-read before each catalogue call

The alternative is reading the cart before each catalogue call, which was considered and rejected.
It cannot reach certainty: a window remains between the cart read and the catalogue call, and
another between the catalogue call and the write. The guarantee that actually holds is the server's
check at write time, which the mandatory read-after-write already surfaces. Meanwhile the cost is
real — the reference client answers eight catalogue calls from one cart read, so reading per call
would multiply cart reads by roughly that, each a full cart payload.

What remains is a narrow hole: if another client moves the branch mid-session, a price quoted to the
user from a catalogue lookup can differ from what the cart charges, because price and stock are
per-branch. The cart total is always right, because it comes from a cart the process read. Every
write shortens the window, because the read behind it replaces what is held.

### The context options are removed, not kept as overrides

Keeping `--branch-id` as an override would be useful for comparing branches, but an override that
sticks would send the next write to the wrong branch, and an override that does not stick is a
different command wearing the same name. The cart is the one context, as it is on the web. A caller
who wants another branch changes the cart.

### A lapsed slot is repaired on two triggers

The web client repairs on one: a cart read that reports a timeslot validation. The CLI adds a second,
cheaper one — the held slot's end has already passed — which needs no call to detect. Both write the
branch's first slot marked available, which is what the web picks, verified against the slot listing
on both occasions it was observed.

Repair is silent. The caller chose no slot, so there is nothing to report a change against.

### Reduce what can be reduced, name what cannot

The web client does exactly this, and the split falls out of the API rather than taste: `quantity`
has an exclusive minimum of zero, so a line whose available stock is zero cannot be expressed as a
reduced quantity at all — reducing it would mean deleting it. Deleting is not the CLI's call to make
about a product the user asked for, and the web does not do it either: it keeps the line, isolates it,
and offers replacements.

The observed reduction is a single `add_or_update` for the affected line at the reported stock. Cost
is two calls in the ordinary case and four when a reduction fires.

### A write closes on the cart it produced

The server requires a cart read after every write and requires the caller to check its validations
before telling the user anything. Reduction needs that same read to know what to reduce to. So the
read happens either way — and without folding it into the write's output, it happens twice: once
inside the command, whose payload is then discarded, and once again when the caller runs the cart
snapshot to satisfy the mandate. Printing what was already fetched removes the second read, the
second process and the second round trip, and costs nothing that was not already paid for.

It also removes the worst line in the current output. A write echoes back the quantity it was
*asked* for, never the quantity the cart ended up with — an increment of two against a line of five
echoes two. Printing that next to a snapshot that says seven would be contradictory; printing it
instead of a snapshot is what the CLI does today. The echo goes.

Alternatives considered. Leaving the snapshot behind an option: an option that switches off the
verification the server mandates is a trap, and the payload is fetched regardless, so the option
would only choose whether to waste it. Printing a reduced form of the cart, just the validations:
cheaper, but the caller needs the resulting quantities and totals as well, and a second shape of
cart output is a second thing to keep true.

### An update sends only what is being changed

The tool declares `deliveryType`, `timeslot`, `address` and `shipments` required on every call, even
one whose only subject is a promo code. The recorded contract says so in as many words: every probe
against it "had to pass through the current cart's own values unchanged alongside the field actually
being tested". That pass-through was the caller's job because nothing else held those values. The
cart carries all four, and the process holds the cart, so the CLI does the pass-through itself and
the caller names only what is changing.

This is the same address guarantee as a repair, for the same reason: the argument replaces the stored
address rather than merging into it, so an update that leaves the address out has to send the stored
one whole or silently truncate it.

The shipments are passed through as the cart carries them, including when the update moves the cart
to another branch. Whether the server expects a shipment naming the new branch instead is
**unverified** — the recorded contract never exercised `branchId` on this tool — so the CLI sends
what it can vouch for and leaves `--shipments` available to a caller who needs to say otherwise.

Alternatives considered. Keeping the four required and letting the skill tell the agent to copy them
out of `cart details`: that is what the skill says today, it costs a read and four arguments per
update, and getting the address wrong truncates the stored one with `success: true`. Defaulting only
the address: the other three are just as mechanical, and a rule that covers three of four is a rule
nobody remembers.

### The idle timeout becomes a staleness bound

It previously meant only "how long the connection stays warm", which was free to lengthen. It now
also means "how long the held cart is trusted", so lengthening it widens the window in which another
client can diverge from us. Ten minutes is chosen as a balance between cold starts and that window,
and the setting's description says what it bounds so that a later change is made knowingly.

### Calls the CLI makes for itself are not accounted

Recording them would put payloads with no rendered output into a report whose whole subject is
payload against rendered output. Excluding them silently would let the report overstate the saving.
The report therefore states its scope: it measures what commands rendered. The comparison that
matters is how the surface behaves with an agent, not the raw ratio.

## Risks / Trade-offs

- **A branch changed by another client makes an intermediate price quote wrong** → the cart total is
  always taken from the cart, so the number the user acts on is right; write-through shortens the
  window to the gap between cart reads; the idle timeout caps it.
- **Two commands hit a cold process together and both seed** → seeding is a single shared in-flight
  operation; the second waits on the first.
- **Repairing a slot rewrites the cart, and a partial address would truncate the stored one** → the
  address is echoed field for field from the cart that was just read, never rebuilt. This is a
  specified requirement, not an implementation note, because the failure is silent.
- **A branch that cannot be resolved returns 500 rather than a validation** → the CLI only ever sends
  a branch the cart or the branch listing gave it, so it should not reach this; worth recording in
  the contract as a server behaviour.
- **Removing the context options removes the ability to look at another branch without moving the
  cart** → accepted; the cart is the context, and moving it is one command.
- **Losing the cart's local number breaks any script that reads it** → nothing consumes the value, so
  a script reading it had nowhere to put it.

## Migration Plan

Breaking, and deliberately not staged: leaving the options in place as deprecated no-ops would leave
the skill describing two ways to do one thing, which is the cost this change exists to remove.

1. Refresh the recorded tool snapshot and wrap `silpo_create_shopping_cart`.
2. Hold the cart in the background process and serve it to commands.
3. Drop the cart argument and the context options from the commands.
4. Fold in repair, bootstrap and reduction.
5. Rewrite the skill's preamble and the two entries the server rewrote.

Rollback is a revert; nothing persists that a downgrade would have to read.

## Open Questions

- Whether order placement demands the address fields that a priced cart update ignores. Unresolved
  since the contract was recorded, and out of reach without paying for an order. It does not change
  what is built here: the CLI never places an order, and it now echoes the stored address whole
  rather than rebuilding it, so whatever the checkout demands is preserved either way.

`exists: false` is treated as reachable and `silpo_create_shopping_cart` is trusted to be idempotent
per user, on the strength of its own description. Confirming it empirically would mean placing an
order, which is out of scope; the decision is deliberate, not deferred.
