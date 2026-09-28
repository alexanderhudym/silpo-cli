## Purpose

Holds the branch's table of catalogue scopes — its categories, promotions and curated sets — on disk,
so that naming a scope costs no network call in the steady state, and states the rhythm at which each
kind of scope goes stale.

## ADDED Requirements

### Requirement: The scope table is held on disk

The CLI SHALL keep, for each branch it has read one for, the branch's categories, promotions and sets,
and SHALL answer a scope lookup from that copy rather than from the server wherever the copy is
current.

The copy SHALL hold every field the scope listing prints, not merely what resolving a name needs: a
promotion's product count and a set's description are printed today, and a copy holding only handles
and titles would drop them the moment the listing is answered from it.

A scope lookup SHALL cost no catalogue call in the steady state. Today it costs four on every
invocation — the categories, which arrive a thousand to a page and number over a thousand at a single
branch, plus one call for the promotions and one for the sets — and those four are paid even when the
caller passed a handle the server issued, which needs no resolution at all.

The copy SHALL be keyed by the context each kind is actually read within, and not by the branch
alone. The categories are read for a branch alone; their tool takes no delivery type. The promotions and the
sets are read for a branch **and a delivery type**, and the key SHALL carry both.

For the promotions the delivery type is required by the tool and the answer turns on it. For the sets
it is optional and has never been observed to change the answer — the recorded probe found the same
sets returned with it, without it, and even against an invalid branch. The key carries it there for
consistency rather than on evidence of a difference, and the cost of being wrong about that is one
extra reading, not a wrong answer.

The time slot the promotions are read within SHALL NOT be part of the key. A slot moves whenever the
session's does, so keying by it would leave the copy permanently cold and buy back nothing: the
campaigns a branch runs do not turn over between two slots of the same delivery type. Where that
proves wrong, the symptom is a campaign handle that lists nothing, which the requirement on
degradation already covers.

#### Scenario: A scope named twice

- **WHEN** two commands in turn name a scope at the same branch, within the copy's currency
- **THEN** the first fills the copy, and the second reads it without a catalogue call

#### Scenario: A handle needs no resolution but is charged for one

- **WHEN** a caller names a scope by the handle the server issued for it
- **THEN** the listing is drawn without reading the scope table from the server

#### Scenario: Another branch

- **WHEN** a scope is named at a branch the copy holds nothing for
- **THEN** that branch's table is read and kept beside the one already held, and neither replaces the
  other

#### Scenario: The delivery type changes

- **WHEN** the cart's delivery type changes and a scope is named at the same branch
- **THEN** the promotions and the sets are read for the new delivery type rather than answered from
  the copy read for the old one
- **AND** the categories, which are read for a branch alone, are answered from the copy

### Requirement: Each kind of scope refreshes on its own rhythm

The three kinds SHALL NOT share one lifetime. Categories SHALL be treated as the most durable, the
list of promotions as the least, and sets between them.

The rhythms SHALL be stated where they are set rather than inferred from the payload, because no
payload carries one: a promotion arrives with a code, a title and a product count, and with no start
or end date the CLI could read a lifetime from.

Refreshing SHALL be per kind: the kind whose lifetime has run SHALL be re-read, and the kinds whose
have not SHALL be left alone. Discarding the whole table because one campaign ended would pay for the
thousand categories that did not change.

#### Scenario: The campaign list has aged and the categories have not

- **WHEN** a scope is named after the promotion lifetime has run but within the category lifetime
- **THEN** the promotions are re-read and the categories are not

#### Scenario: A rebuild

- **WHEN** the caller rebuilds the index
- **THEN** the scope table is discarded with it and re-read on next use

### Requirement: The scope table is reference data, not the personal index

The scope table SHALL be a capability of its own, distinct from the personal product index, even
where the two share a file.

It is not the caller's history and it is not a product's identity: it is a copy of what the branch
publishes, the same for every account. Holding it under the index would blur two requirements worth
keeping sharp — that a product record carries identity rather than state, and that nothing is fetched
for the index's sake.

Reading the scope table SHALL therefore not be an enrichment of the index, and the index's own rules
about what a record may carry SHALL NOT constrain what the scope table holds.

#### Scenario: The index is rebuilt from the account

- **WHEN** the index is rebuilt from orders and favourites
- **THEN** the products it holds come from the account's own history, and no scope is written into a
  product record by that rebuild

### Requirement: A stale or missing scope table degrades, it does not fail

A scope table that cannot be read, cannot be written, or holds a scope the branch no longer carries
SHALL NOT be the reason a command fails.

Where the copy cannot be opened, the table SHALL be read from the server as it is today. Where a
cached handle names a scope that has ended, the listing SHALL be whatever the server answers for it —
an empty listing where the scope is gone — and the copy SHALL be corrected at its next refresh.

#### Scenario: The copy cannot be opened

- **WHEN** a scope is named and the copy cannot be read
- **THEN** the scope table is read from the server and the command completes

#### Scenario: A campaign ended since the copy was filled

- **WHEN** a caller names a promotion that has ended since the copy was written
- **THEN** the listing is the server's answer for it, and the command does not fail on the CLI's own
  account
