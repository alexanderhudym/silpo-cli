## MODIFIED Requirements

### Requirement: An entity argument is the entity's own identifier

Wherever an argument names an entity by an identifier — a scalar option such as the branch of a slot
listing, or a positional such as a product of a cart removal or of a favourites write — the CLI SHALL
send the value it was given to the tool unchanged. It SHALL NOT inspect the value's shape, look it up,
or substitute another form for it.

No command SHALL decide what kind of entity an identifier names by looking at how it is written. There
is no lookup that takes a handle of any kind and dispatches on its form, because form cannot tell the
families apart: a bare uuid names a product, a branch, a company, a settlement or a Nova Poshta office
alike, and a bare integer names a coupon's id as readily as a product's external id. Each family
therefore carries its own lookup — a product card, a store, a category, a promotion, a curated set, one
of the caller's coupons — and each accepts only the forms that are unambiguous within it. A product
card takes a uuid, a slug or an external product id and hands whichever it was given to the one tool
that answers for all three, so nothing is told apart even there. A handle in none of the forms its own
family takes SHALL fail naming the handle, and no other family SHALL be tried.

Four kinds of argument are named exceptions. Three are exceptions because the command exists to
resolve them rather than to pass them on; the fourth is a transitional guard, named below with the
measurement that justifies it and the condition under which it goes.

A **store** SHALL be named by a text as well as by its uuid, and that text SHALL be matched by the CLI
over the listing it already pages, because the store listing takes a page, a pickup flag and a Nova
Poshta flag and no filter a name could be sent to.

A **catalogue population** — a category, a promotion or a curated set, each named by its own option —
SHALL accept a human name beside the handle, under the rule that governs those options.

A **category** SHALL further accept its own identifier, and this is the one place the CLI **does**
substitute one form for another: the identifier is matched inside the table the CLI already holds and
the category's slug is sent in its place. It is a substitution rather than a pass-through because the
category call accepts a slug alone — measured, an identifier returns not-found, as does the numeric
tail of a slug — so forwarding the identifier unchanged would fail every time. The CLI holds the whole
category table on every invocation, so the substitution costs no call, and the identifier is a form a
caller may hold from outside the CLI even though no command of the CLI prints one.

A **catalogue population naming no record of its kind** SHALL be refused without being ranked where
its shape is that of a handle — lowercase ASCII in two or more segments joined by a hyphen or an
underscore. This is an inspection of shape, and it is named here rather than left unstated because the
rule above forbids exactly that.

It exists because the ranker answers every input with its least bad match. Measured over the branch's
761-category table, of the 249 category slugs the pruning drops, 136 — 54.6% — otherwise settle as
confident matches onto an unrelated category, `shpynat-4843` reaching «Пет-Нат (Pet-Nat)» and
`ruchky-olivtsi-markery-4654` reaching «Власна броварня Beermaster Brewery». No score threshold
separates them: the worst such value scores 160.01 while the weakest genuine approximation a caller
might write — `zewa-turbota` for the set «Zewa - відчуття турботи» — scores 157.93, an inversion of
2.08 points, and the two are not commensurable because the scores are raw BM25 whose IDF term follows
corpus size, and a 17-record set table cannot produce numbers on the scale of a 761-record category
table.

Its cost SHALL be stated with it: measured, 5 records of 789 carry a title a handle-shaped value could
approximate, and 2 of those 5 are already exact keys the guard never reaches. It buys the refusal of
136 silently wrong answers at the price of 3 records not reachable by an approximation.

This exception is **transitional**. The defect it compensates for is in the shared ranker's relevance
floor, not in the shape of the value, and a caller cannot be expected to know that a slug is refused
for looking like one. It SHALL be removed once that floor distinguishes a name that belongs to nothing
from one written approximately, and the CLI SHALL then infer nothing from an argument's shape but a
uuid — the one form that is unambiguous, a slug's own form being a convention of the server that may
change without notice.

Outside those four, no argument's shape is inspected.

A value the tool does not accept SHALL therefore fail at the tool, and the CLI SHALL report the tool's
own error rather than one of its own. This includes the MCP layer's uuid validation, which rejects a
malformed identifier before the request reaches Silpo.

#### Scenario: A scalar entity argument

- **WHEN** the user passes a branch option any value at all
- **THEN** that value reaches the tool exactly as typed

#### Scenario: Positional entity arguments

- **WHEN** the user names several products to take out of the cart, or to add to favourites, as bare
  arguments
- **THEN** each value reaches the call as it was given, in the order it was written, and none is read
  under an entity the CLI inferred

#### Scenario: An identifier inside a JSON argument

- **WHEN** a caller writes a JSON structure carrying a product, a company and a branch, as a cart
  write once took
- **THEN** the command fails, because no argument of the CLI takes JSON; those identifiers are now
  written as bare arguments and as flags, and each still reaches the call exactly as it was given

#### Scenario: A lookup takes any form

- **WHEN** a product card is asked for by a slug, by a uuid, or by an external product id
- **THEN** the value travels to the one tool that answers for all three, and the caller is never told
  which form the command wanted

#### Scenario: A category named by its identifier

- **WHEN** a category is named by its identifier rather than by its slug
- **THEN** the CLI finds it in the table it already holds and sends that category's slug in its place,
  because the category call accepts no other form

#### Scenario: A handle-shaped value naming nothing

- **WHEN** a catalogue population option is given a handle-shaped value that names no record of its
  kind — a slug the branch's pruning dropped, say
- **THEN** the command fails naming the value, without the value being ranked, rather than settling on
  the least bad title the ranker returns for it

#### Scenario: A form the lookup does not recognise

- **WHEN** a handle is written in none of the forms the family it was given to accepts
- **THEN** the command fails naming the handle, and no other family's lookup is tried on it

#### Scenario: One uuid, several kinds of entity

- **WHEN** the same uuid could name a product, a branch or a company
- **THEN** the command it was given to decides what it names, and no command reads the form to decide
  which of the three was meant

#### Scenario: A store named by a text

- **WHEN** a store is named by a text rather than by its uuid
- **THEN** the CLI matches that text over the store listing itself, because the listing takes no filter
  the text could be sent to

#### Scenario: A value the tool rejects

- **WHEN** the user passes a product slug where a cart write wants a uuid
- **THEN** the command fails carrying the tool's own message, and the CLI adds no message of its own

### Requirement: A scope selector takes a name as readily as a handle

Where an option names the part of the catalogue a listing is drawn from, there SHALL be one such
option per kind — a category, a promotion, a curated set — rather than one option accepting a handle of
any kind. The kind is not recoverable from the handle: measured over one branch's 1042 handles, one
value is both a promotion code and a category slug and another is both a promotion code and a set
slug, so an option that took either would have to guess which was meant.

Naming the kind in the option settles more than the collision. It fixes which table a title is resolved
against, so a title can never be ambiguous between kinds that are not alternatives to one another, and
it lets each option's help say what it takes.

Each such option SHALL accept every form the caller may hold for a record of its kind — the handle the
server issued, the record's own identifier where its kind has one, and its title written the way a
person writes it. These SHALL be one option, not several: a caller that knows the title should not have
to find the handle first, and a caller that holds a handle should not have to spell the title.

A handle the server issued SHALL be used as given. An identifier SHALL be resolved to that record's
handle **within the CLI's own table** and SHALL NOT be forwarded: measured, the category call accepts a
slug alone, and both an identifier and the numeric tail of a slug return not-found. A title SHALL be
resolved by ranking that kind's records against it, rather than by requiring it to be reproduced
exactly, so that a record named approximately — a shortened word, a different ending — is reached.

The ranking SHALL settle the value under the same policy that settles a product: where one record
stands clearly above the rest, it SHALL be used; where the best matches stand too close together to
separate, or where the best is too weak to trust, the CLI SHALL print every candidate with its handle
and SHALL stop without listing anything. It SHALL NOT take the first or the highest-scoring match where
the ranking did not separate it. Where nothing matches at all, the command SHALL fail naming the value.

Where the candidates are categories, the path SHALL be printed with each, because a title alone does
not distinguish them: measured, 18 category titles are carried by two categories each.

This last part is what a ranked resolution must be held to and an exact one never needed: a ranker
returns its least bad answer for any input whatever, so a value naming nothing must be caught by the
policy rather than by the absence of a match.

#### Scenario: One option per kind

- **WHEN** the caller names the part of the catalogue a listing is drawn from
- **THEN** the option they use names the kind, and the CLI does not infer it from the value

#### Scenario: A handle

- **WHEN** a scope option is given a handle the server issued, such as a category slug or a promotion
  code
- **THEN** that record is used, and no search for a title happens

#### Scenario: An identifier

- **WHEN** a scope option is given a record's own identifier
- **THEN** the CLI finds it in the table it holds and forwards its handle, the identifier never leaving
  the CLI

#### Scenario: A name matching one scope

- **WHEN** a scope option is given a title that matches exactly one record of its kind
- **THEN** that record is used, and the listing is drawn from it

#### Scenario: A name written approximately

- **WHEN** a scope option is given a title close to a record's own without reproducing it exactly
- **THEN** that record is used, because the value was ranked rather than compared

#### Scenario: A name matching two scopes

- **WHEN** a scope option is given a title that ranks two records of its kind too close to separate
- **THEN** both are printed with their handles, and their paths where they are categories, nothing is
  listed, and the command fails

#### Scenario: A name matching nothing

- **WHEN** a scope option is given a value no record of its kind ranks strongly enough for
- **THEN** the command fails naming the value, and no listing is printed
- **AND** the least bad match is not used
