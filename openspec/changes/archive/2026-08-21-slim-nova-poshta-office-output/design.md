## Context

`officesText` in `src/commands/np.ts` builds six rows per office. See proposal.md — Why for
the measurements that show three of them carry nothing, and for the live cart probe that
retired the last argument for keeping `number` and `type`.

The composed form this change works inside is already settled by `output-rendering`: a
command names its own fields, a key is printed only where it informs, and several fields may
become one piece of text. Nothing here needs that spec changed — the change is a command
exercising permissions it already has.

## Goals / Non-Goals

Goals: state the office record so that every line either feeds a tool argument or tells a
person which office this is, and so that an office out of service cannot be offered
silently.

Non-goals beyond those in the proposal: no change to how the payload is fetched, typed, or
recorded; `NpOffice` keeps all eight fields, because the type mirrors the tool contract
rather than the output.

## Decisions

**The title is printed without a key rather than renamed to `description`.**
`title` is a poor name for the value — it is a composed sentence carrying the office kind,
the number, a weight limit, the street address, a landmark and sometimes an access
restriction such as `ТІЛЬКИ ДЛЯ МЕШКАНЦІВ`. `description` would be the honest key. But the
value announces itself: no reader meeting
`Поштомат "Нова Пошта" №23632: вул. Соборна, 118/19` needs a word in front of it to know
what it is looking at. `output-rendering` asks for a key only where it informs, so the
better fix for a misleading key is to drop it, not to correct it. This also settles the
position question — a keyless line reads as the record's caption, so it goes last, below
every keyed field.

**The status line is driven by comparison against the literal the server sends for a
working office, not by a list of bad statuses.**
Across 40 live records from three settlements the field held `Working` and nothing else,
and the contract file records no other value ever seen. That leaves the vocabulary of
failure entirely unknown. A rule of the form "print when the status is one of these" would
have to guess that vocabulary and would go silent on the first value nobody predicted —
which is the exact case the line exists for. Comparing against the one known-good value
inverts the risk: an unrecognised status prints, and the worst outcome is a line the reader
did not need.

**The number is left inside the title rather than parsed out of it.**
Extracting it would let the record carry a machine-readable number at no extra line. The
rule that works is "the first `№<digits>` in the title" and it holds in 40 records out of
40 — but 18 of those 40 titles carry a second number, and at least one of the decoys names
a real neighbouring office: `Поштомат "Нова Пошта" №39339: … В клієнтській зоні відділення
№543`, where `Відділення №543` exists a few metres away. A parse that drifts turns into a
parcel sent to the wrong office rather than into an error. Since the live probe showed
nothing consumes the number, the value of extracting it is zero and the downside is not.

**`type` stays unprinted and unmapped.**
The tool description tells callers to render it into `street` as `Відділення` for `office`
and `Поштомат` for `parcelLocker`. That mapping is lossy in a way that misleads: `Пункт`
entries also carry `type: "office"`, so Пункт №955 in Київ becomes `Відділення #955`, which
is a different place. The probe showed `street` is decorative, so the safe move is to write
neither.

**The fixture gains a synthetic non-working office.**
No live office has ever reported anything but `Working`, so the conditional line cannot be
covered by captured data. One record in `test/fixtures/np.offices.json` gets an invented
status. The fixture's ids are already synthetic, so this does not make it less faithful
than it was — but the invented value must be marked as invented wherever the fixture's
provenance is described, so it is not later mistaken for an observation.

## Risks / Trade-offs

**Checkout was never reached, so `street` is proven optional only up to cart update.** The
probe ran against an empty cart under a 599 ₴ order minimum; placing a real order would
cost money and was not done. If order placement turns out to require `street`, the number
and the type become genuinely consumed and this change would need revisiting. → The finding
is written down with its boundary stated, so the gap is
visible rather than assumed closed.

**A read of the cart immediately after a write returned a stale address once.** During the
probe, one read-back still carried the previous `street`. It was seen a single time and not
reproduced, so it is recorded as an observation rather than a claim. → Nothing in this
change reads a cart, so it is only a hazard for whoever writes the cart-address support
later.

**Anything parsing this command's stdout breaks.** → Nothing outside the repository is
known to; inside it, `test/expected/np.offices.txt` is the only consumer and it is
regenerated as part of the change.

## Migration Plan

One commit: the output function, the expected-output file, the fixture record, and the
contract doc move together. Rollback is reverting it — the change touches no stored state,
no database schema, and no tool argument, so an older build reads the same database and
talks to the same server.
