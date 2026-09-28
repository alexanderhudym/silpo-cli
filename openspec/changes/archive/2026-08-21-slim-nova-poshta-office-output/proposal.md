## Why

`np offices` prints six lines per office and three of them carry nothing a caller can use.
Measured against 40 live office records drawn from three settlements — the Ірпінь fixture,
Київ filtered and unfiltered, and Ворзель unfiltered:

- `number` appears literally as `№<number>` inside `title` in 40 records out of 40.
- `address` is `title` with the street part rewritten and the settlement name pasted in
  front. In 23 of the 25 fixture records the normalised address is a substring of the
  title; in the two that differ it is the address that is poorer — office №73 has
  `вул. Прорізна, 9 (м. Хрещатик)` in its title against `Київ, Прорізна, 9` in its
  address, and office №52375 has the word `Пункт` wedged into the address between the
  settlement and the street. The settlement name is the only thing `address` adds, and it
  is constant across the whole listing because `--settlement-id` is required.
- `status` is `Working` in all 40, and no other value has ever been observed.

`number` and `type` survived earlier review because the tool description of
`silpo_find_nova_poshta_offices` says to pass them to `silpo_update_shopping_cart`. That
claim was tested live against the account's own cart, and it is wrong. A NovaPoshta cart
address needs four fields — `addressType`, `officeId`, `latitude`, `longitude` — and
nothing else. `number` and `type` feed only `street`, which the server stores verbatim,
accepts as absent, and reads for nothing: a cart set with `street` omitted updated
cleanly, priced the delivery at 129 ₴, and raised no validation but the order minimum.
Scanning all 39 `inputSchema` definitions finds no tool that takes an office number as a
declared argument; the sole mention is the free-text `title` filter of the office lookup
itself, which matches substrings and so returns decoys rather than the office asked for.

So the office record is paying six lines to deliver two facts a tool consumes and one
sentence a person reads.

## What Changes

- The office record becomes the alias, the coordinates, and the title on a line of its
  own without a key. Roughly 44% fewer bytes on the fixture, and the reader loses nothing
  it could act on.
- `number` and `address` are no longer printed. The number stays legible inside the
  title, where it has always been, and the address was never anything but the title with
  the settlement name in front of it.
- `status` is printed only when the server reports something other than `Working`, on its
  own line under its key, below the coordinates and above the title. Every office observed
  so far reports `Working`, so this line is expected never to appear; it exists so that an
  office that stops working says so rather than being offered silently.
- `type` stays unprinted, as today. It is not consumed by anything, and the recipe that
  claimed to consume it maps both `Відділення` and `Пункт` onto the single word
  `Відділення` — Пункт №955 in Київ would be labelled `Відділення #955`, which is a
  different office. Leaving the field out is safer than passing it on.
- The contract notes gain the NovaPoshta cart address, which they never captured. The
  recipe exists only in the tool description the server publishes in `tools/list`, it asks
  for three fields the server does not want, and its `type`-to-word mapping is wrong for
  `Пункт`. This is written down here rather than separately because it is the whole
  evidence for dropping `number` and `type` — without it the next reader restores both.
- **BREAKING** for anything parsing this command's stdout: three fields leave the record
  and one loses its key.

### Non-goals

- The alias table stays a plain id-to-alias map. Storing whole office records behind an
  alias, so that `cart update --address` could fill in the coordinates itself, would
  shrink the record further and would catch the broken coordinates described below, but
  it is input-side work on a different capability.
- Nothing is done about the two offices found carrying unusable coordinates — №37029 in
  Київ reporting `(0, 0)`, and №50797 in Ворзель reporting a point some 20 km outside the
  settlement. The CLI prints what the server sent. Rejecting or flagging them belongs
  wherever the coordinates are consumed, not in a listing.
- `np settlements` output is unchanged, even though the finding above shows the settlement
  title and area are not needed for a cart address either. Only the settlement id is, and
  the listing already prints its alias.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stores-and-delivery`: the requirement "Address and Nova Poshta output" states that the
  office lookup prints each office's alias, number, title, address, coordinates and
  working status. Three of those six stop being printed, the title loses its key, and the
  status becomes conditional.

## Impact

- `src/commands/np.ts` — `officesText` drops the `number` and `address` rows, prints the
  title as a bare row, and adds the status row behind a comparison against `Working`.
  `settlementsText` and both command registrations are untouched.
- `test/expected/np.offices.txt` — regenerated against the new record shape.
- `test/fixtures/np.offices.json` — one record gains a non-`Working` status so the
  conditional line is covered; the fixture is already synthetic in its ids.
- The cart contract notes gain the NovaPoshta address section.
- No change to the MCP client, the alias store, the daemon, or any other command. No new
  dependency.
