## MODIFIED Requirements

### Requirement: Every command is reachable from the skill

The skill SHALL carry exactly one entry for every leaf command the agent drives, so that no such
command is reachable only by reading the CLI's own help and no command is carried twice.

A leaf command SHALL be counted as one invocation form that performs an action of its own: each
subcommand counts separately from its siblings and from its group, and a group that acts when it is
named with no subcommand counts as one leaf besides them. A group that does nothing when named alone
SHALL NOT be counted, having no action of its own. The same rule SHALL be used on both sides of any
comparison of one surface with another, because a count taken by one rule and compared against a
count taken by another says nothing.

Counted that way the surface holds thirty-seven leaves, thirty of which the agent drives and which
therefore require an entry apiece. The cart's own snapshot is named here as `cart details`, which is
the leaf that exists: the group `cart` performs no action when it is named alone, so under the rule
above it is not a leaf.

`login`, `logout`, `cart details`, `cart fill`, `cart remove`, `cart clear`, `cart setup`, `cart promo`,
`cart bonus`, `cart certificate add`, `cart certificate remove`, `cart adult`, `cart set`,
`products find`, `products card`, `products favorite`, `products unfavorite`, `catalog`, `me`,
`me addresses`, `me family`, `me restrictions`, `me coupons`, `me promos`, `me certificates`,
`me coupon`, `me orders`, `slots`, `stores`, `np`.

The remaining seven SHALL NOT have entries: the three that read and write the CLI's settings, the
three that report, test and stop its background process, and the one that passes a call through to the
server unformatted. The agent does not drive those, and an entry for them costs the reader attention
without changing anything the reader does.

Where the CLI decides something on its own, the skill SHALL state what decides it at the point where
that decision is described. No command exists to explain such a decision after the fact, so the rule
itself is what the skill owes the reader.

#### Scenario: The index is checked against the surface

- **WHEN** the skill's command entries are compared with the leaf commands the agent drives, both
  counted by the rule above
- **THEN** every one of those thirty commands has exactly one entry, the entry count is thirty, and
  no entry names a command outside that set

#### Scenario: A group that only groups

- **WHEN** the group naming the product commands is named with no subcommand
- **THEN** it performs no action, is not counted as a leaf, and has no entry of its own

#### Scenario: A command exists but no situation calls for it

- **WHEN** a command exists that no situation the agent meets calls for — changing the CLI's
  configuration, inspecting its background process, or printing a server payload verbatim
- **THEN** it does not appear in the skill at all, and the CLI's own help is where a person
  debugging the CLI finds it

#### Scenario: An automatic choice is questioned

- **WHEN** the reader is asked why a product was chosen without being asked about
- **THEN** the skill has already stated, beside the description of that automatic choice, the rule
  that decided it — that every word of the term was accounted for in that product and that no other
  candidate answered it as fully — there being no command to ask after the fact

## ADDED Requirements

### Requirement: What the CLI does on its own is stated, and nothing it keeps

The skill SHALL state the things the CLI does without being asked, so that the reader recognises the
output rather than treating it as an error, and does not repeat work that is already done. It SHALL
state each of these:

- that every product named comes from a call made for the question that was asked, so that a term is
  always searched and no run is warmer or colder than another;
- that a shopping list stated as free text is normalised, matched and resolved by the CLI, which
  writes the cart itself;
- that a destination stated as free text is resolved into the address, the delivery type, the branch
  and the slot, and written to the cart;
- that a lapsed timeslot is replaced before any call whose answer depends on stock or price, because
  a cart standing on a slot that has passed reports every line out of stock, and that this replaces
  the slot alone and never the store, the delivery type or the address;
- that a quantity the branch cannot fill is reduced, and a product it cannot fill at all is named
  and left in the cart;
- that an item the branch can fill only in part is put to the reader rather than written short, and
  what the three answers to it are;
- that where more than one candidate is plausible the CLI prints them and stops rather than choosing,
  so a printed candidate list is a decision owed to the reader and not a failure to retry.

It SHALL NOT claim that a cart is among the things the CLI opens on its own, and it SHALL NOT claim
that anything is carried from one command to the next.

#### Scenario: The output reports a reduced quantity

- **WHEN** an add reports that a quantity was reduced to what the branch holds
- **THEN** the skill has established that the CLI did this, and that the reduced quantity is what is
  in the cart

#### Scenario: The output names an unfillable product

- **WHEN** a write reports a product the branch cannot fill at all
- **THEN** the skill has established that the line is still in the cart, that the CLI will not remove
  it, and that replacing or dropping it is the reader's decision to put to the user

#### Scenario: The reader looks for the verification step

- **WHEN** the reader has changed the cart and looks for the command that confirms the result
- **THEN** the skill has established that the write already printed it, and that reading the cart
  again buys nothing

#### Scenario: Every term is searched

- **WHEN** a product the account buys every week is named in a list
- **THEN** the skill has established that it was searched like any other, that no run resolves it
  more cheaply than another, and that the price beside it came from the call that printed it

#### Scenario: An item the branch can only partly fill

- **WHEN** a list asks for more of a product than the branch holds
- **THEN** the skill has established that the CLI asks rather than writing the line short, and names
  the three answers available

#### Scenario: The command prints candidates and stops

- **WHEN** a destination or a term matches more than one plausible candidate and nothing was written
- **THEN** the skill has established that this is the CLI declining to choose, that repeating the
  same command will produce the same list, and that the way forward is to answer it

### Requirement: The skill states how selectors compose

The skill SHALL state the rule by which the product listing's selectors compose — that repeating one
kind unions, that different kinds intersect, and that a query is not a selector but the filter and
the ordering over what the selectors chose. The rule SHALL be stated once, where the listing is
described, and SHALL NOT be left to be inferred from the options standing beside one another.

Because the catalogue population is named by one option per kind rather than by one option taking a
handle of any kind, the skill SHALL name each of those options and SHALL say that one of them repeated
unions while two of them together intersect. It SHALL say why the kind is named rather than inferred: a
handle can belong to two kinds at once, so the option is what settles which was meant.

The skill SHALL also state that naming a category names its whole subtree, so that a reader does not
name a parent and its children together believing the parent alone would return less.

The skill SHALL state what orders a listing the CLI ranked: how many of the query's own probes
returned a product, and then the shop's own position. It SHALL say that nothing else enters the order
— not what the reader has bought, not what they have saved, not what is discounted — so that a reader
takes the order as an answer to the words they wrote rather than as a view shaped around them.

The skill SHALL NOT carry any constant of the matcher. A reader cannot act on one, and a skill that
carries one goes stale the first time it moves.

#### Scenario: The composition rule is stated once

- **WHEN** the reader looks for what happens when two selectors are given together
- **THEN** the rule is stated at the listing's entry, and no other entry restates it

#### Scenario: The options of each kind are named

- **WHEN** the reader looks for how to narrow a listing to a part of the catalogue
- **THEN** the entry names the option of each kind and says which composition each produces

#### Scenario: The ordering is declared unshaped

- **WHEN** the reader reads what the listing returns
- **THEN** the skill says the order follows the query's own probes and the shop's position, and that
  nothing about the reader shapes it

#### Scenario: Constants are not carried

- **WHEN** the matcher's rules change
- **THEN** no line of the skill has to change with them


### Requirement: The skill describes no store the CLI keeps

The skill SHALL NOT tell the agent that the CLI holds a personal record of what the account has
bought, saved or seen, that a search draws on such a record, or that a term the agent asks for may be
answered from one. Every product the CLI names SHALL be described as coming from the call that named
it.

Where the skill explains why a term resolved as it did, it SHALL explain it by what the agent can
see — how many of the query's words the chosen product accounts for, how many products matched, and
the candidates the CLI asked between — and SHALL NOT attribute it to anything the CLI remembers.

The skill SHALL state that the caller's order history and saved products separate two candidates that
account for the query equally well, and SHALL state that they are read when the search is made rather
than held between commands, so that an agent does not offer to warm, rebuild or check anything.

#### Scenario: No stored corpus is described

- **WHEN** the skill's account of how products are found is read
- **THEN** it names no store the CLI keeps, no command that fills or clears one, and no state that a
  later command inherits from an earlier one

#### Scenario: History is described as a tie-break, not a memory

- **WHEN** the skill explains what the caller's own purchases do to a search
- **THEN** it says they choose between candidates that already match the query in full, and that they
  are read live with the search

## REMOVED Requirements

### Requirement: What the CLI does on its own is stated

**Reason**: Two of the seven things the requirement obliged the skill to state describe a personal
index — that it is kept and extended, that a term can resolve without a search, and that a run in
which few terms settle by themselves is an index that has seen little. Its scenarios "A term resolves
without a search" and "The index has seen nothing yet" require the skill to teach a distinction that
no longer exists.

**Migration**: Replaced by "What the CLI does on its own is stated, and nothing it keeps", which keeps
the other five obligations word for word and their scenarios with them, replaces the two index
bullets with the property that supersedes them — every product comes from a call made for the question
asked — and adds the item the branch can fill only in part.

### Requirement: The skill states how selectors compose and what a reason row means

**Reason**: The requirement obliged the skill to explain the reason row and to say plainly that the
ordering "prefers what the caller has bought and saved, and prefers what carries a promotion". The row
is removed and none of the three preferences survives, so the obligation would have the skill describe
a shaping that is gone.

**Migration**: Replaced by "The skill states how selectors compose", which keeps every clause about
composition, the options per kind and the subtree unchanged, and replaces the reason-row clause with
its opposite: the skill states what does order a ranked listing, and that nothing about the reader
enters it. The requirement not to carry the matcher's constants is kept, and is now easier to satisfy
because there are fewer of them.
