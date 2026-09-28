## ADDED Requirements

### Requirement: The skill states how selectors compose and what a reason row means

The skill SHALL state the rule by which the product listing's selectors compose — that repeating one
kind unions, that different kinds intersect, and that a query is not a selector but the filter and
the ordering over what the selectors chose. The rule SHALL be stated once, where the listing is
described, and SHALL NOT be left to be inferred from the options standing beside one another.

The skill SHALL also state what the reason row on a raised record means, and SHALL say plainly that
the ordering is partial: it prefers what the caller has bought and saved, and it prefers what carries
a promotion. A reader that does not know the order is shaped cannot correct for it, and the row is
the only place the shaping is visible.

The skill SHALL NOT state the weights, the thresholds or the fraction the promotion boost applies
within. Those are constants of the ranker; a reader cannot act on them, and a skill that carries them
goes stale the first time they are tuned.

#### Scenario: The composition rule is stated once

- **WHEN** the reader looks for what happens when two selectors are given together
- **THEN** the rule is stated at the listing's entry, and no other entry restates it

#### Scenario: The ordering is declared partial

- **WHEN** the reader reads what the listing returns
- **THEN** the skill says the order prefers bought, saved and discounted products, and names the row
  that says which of those raised a given record

#### Scenario: Constants are not carried

- **WHEN** the weights or thresholds of the ranker change
- **THEN** no line of the skill has to change with them

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

Counted that way the surface holds forty leaves, thirty of which the agent drives and which therefore
require an entry apiece. The cart's own snapshot is named here as `cart details`, which is the leaf
that exists: the group `cart` performs no action when it is named alone, so under the rule above it
is not a leaf and the previous list named it in error.

`login`, `logout`, `cart details`, `cart fill`, `cart remove`, `cart clear`, `cart setup`, `cart promo`,
`cart bonus`, `cart certificate add`, `cart certificate remove`, `cart adult`, `cart set`,
`products find`, `products card`, `products favorite`, `products unfavorite`, `catalog`, `me`,
`me addresses`, `me family`, `me restrictions`, `me coupons`, `me promos`, `me certificates`,
`me coupon`, `me orders`, `slots`, `stores`, `np`.

The remaining ten SHALL NOT have entries: the three that report, rebuild and explain the index, the
three that read and write the CLI's settings, the three that report, test and stop its background
process, and the one that passes a call through to the server unformatted. The agent does not drive
those, and an entry for them costs the reader attention without changing anything the reader does.

Where a command exists to explain a decision the CLI made on its own, the skill SHALL name it at the
point where that decision is described, rather than as an entry of the index.

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
- **THEN** the skill has already named, beside the description of that automatic choice, the command
  that prints the candidates, their scores and the rule that decided
