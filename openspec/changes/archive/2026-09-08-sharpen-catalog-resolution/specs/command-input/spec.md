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

**A uuid is the only form the CLI SHALL recognise by its shape to decide what a value means.** A uuid
is unambiguous by construction — nothing else is written that way — so matching one costs no guess.
Every other form is a convention of the server: a slug's spelling is what the catalogue happens to
publish today, and a value that looks like one may be a slug, a title written in Latin script, or
neither. Recognising a slug by its shape asserts a stability the server never promised, and the CLI
SHALL NOT assert it.

Where a lookup accepts both a handle and a text and the two cannot collide, it MAY separate them by
shape, and the store lookup does: a run of digits of at least a measured length is a store code and
never a place name. That is a different act from the one forbidden above — it chooses which of one
family's two accepted forms arrived, rather than deciding which family a value belongs to — and it
SHALL be permitted only where the length that separates them was measured against the table rather
than assumed. The catalogue has no such separation to make: its handles are matched by an exact lookup
that either finds a record or does not, and a value that is not found is matched as a text.

Three kinds of argument are named exceptions, and they are exceptions because the command exists to
resolve them rather than to pass them on.

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

A value naming no record of its kind SHALL fail because the resolution policy refused it, and SHALL
NOT be refused for the shape it was written in. The two are not the same refusal: one is a statement
about the catalogue, which the caller can act on, and the other is a statement about a regular
expression, which the caller cannot see and did not agree to.

Outside those three, no argument's shape is inspected.

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
- **THEN** the value travels to the one tool that answers for all three, and the caller is never
  told which form the command wanted

#### Scenario: A category named by its identifier

- **WHEN** a category is named by its identifier rather than by its slug
- **THEN** the CLI finds it in the table it already holds and sends that category's slug in its place,
  because the category call accepts no other form

#### Scenario: A handle-shaped value naming nothing

- **WHEN** a catalogue population option is given a handle-shaped value that names no record of its
  kind — a slug the branch's pruning dropped, say
- **THEN** the value is looked up and matched like any other, and fails because the table holds no such
  record and nothing matched it, rather than because of the shape it was written in

#### Scenario: A title written in Latin script

- **WHEN** a catalogue population option is given a hyphenated Latin value that approximates a real
  record's title
- **THEN** that record is reached, its shape having been no reason to refuse it

#### Scenario: A form the lookup does not recognise

- **WHEN** a handle is written in none of the forms the family it was given to accepts
- **THEN** the command fails naming the handle, and no other family's lookup is tried on it

#### Scenario: One uuid, several kinds of entity

- **WHEN** the same uuid could name a product, a branch or a company
- **THEN** the command it was given to decides what it names, and no command reads the form to
  decide which of the three was meant

#### Scenario: A store named by a text

- **WHEN** a store is named by a text rather than by its uuid
- **THEN** the CLI matches that text over the store listing itself, because the listing takes no
  filter the text could be sent to

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

A handle the server issued SHALL be used as given, and SHALL be recognised by an exact lookup taken
before anything is matched rather than by the matching itself. Measured, a handle matches none of the
words of its own title, so a handle that reached the matcher would reach nothing. An identifier SHALL
be resolved to that record's handle **within the CLI's own table** and SHALL NOT be forwarded:
measured, the category call accepts a slug alone, and both an identifier and the numeric tail of a slug
return not-found. A title SHALL be resolved by matching that kind's records against it, rather than by
requiring it to be reproduced exactly, so that a record named approximately — a shortened word, a
different ending — is reached.

The matching SHALL settle the value under the same policy that settles a product: where one record
stands clearly above the rest, it SHALL be used; where the best matches stand too close together to
separate, the CLI SHALL print every candidate with its handle and SHALL stop without listing
anything. It SHALL NOT take the first or the
highest-scoring match where the matching did not separate it. Where nothing matches at all, the command
SHALL fail naming the value.

Where the candidates are categories, the path SHALL be printed with each, because a title alone does
not distinguish them: measured, 18 category titles are carried by two categories each.

A value naming nothing SHALL be caught by **matching nothing**: it shares no word with any title of
its kind, and the command fails on the absence of a match. This is what replaces a policy asked to
refuse the least bad answer to every input. What it does not cover is a value that shares a word with
some record by coincidence — a sentence describing a need, say — which is a judgement about meaning
the CLI does not make and `agent-skill` addresses instead.

#### Scenario: One option per kind

- **WHEN** the caller names the part of the catalogue a listing is drawn from
- **THEN** the option they use names the kind, and the CLI does not infer it from the value

#### Scenario: A handle

- **WHEN** a scope option is given a handle the server issued, such as a category slug or a promotion
  code
- **THEN** that record is used by an exact lookup, and no matching happens on it

#### Scenario: An identifier

- **WHEN** a scope option is given a record's own identifier
- **THEN** the CLI finds it in the table it holds and forwards its handle, the identifier never leaving
  the CLI

#### Scenario: A name matching one scope

- **WHEN** a scope option is given a title that matches exactly one record of its kind
- **THEN** that record is used, and the listing is drawn from it

#### Scenario: A name written approximately

- **WHEN** a scope option is given a title close to a record's own without reproducing it exactly
- **THEN** that record is used, because the value was matched rather than compared

#### Scenario: A name matching two scopes

- **WHEN** a scope option is given a title that matches two records of its kind too close to separate
- **THEN** both are printed with their handles, and their paths where they are categories, nothing is
  listed, and the command fails

#### Scenario: A name matching nothing

- **WHEN** a scope option is given a value sharing no word with any record of its kind
- **THEN** the command fails naming the value, and no listing is printed
- **AND** no least bad match exists to be used, the matcher having returned none

#### Scenario: A sentence given to a scope option

- **WHEN** a scope option is given a sentence that shares one word with one record of its kind
- **THEN** that record is reached, the CLI having made no judgement about what kind of text it was
  given, and the skill is where the caller was told to write a name instead
