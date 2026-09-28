## ADDED Requirements

### Requirement: A per-item outcome is printed as rows

Where a command settles an outcome for each item of a list the caller gave it, it SHALL print, in
this order: a count of the items it settled by itself; those items as names and prices, run together
compactly rather than one record each; and then one row per item that still needs the caller, each
row opening with the word for its outcome and standing on a line of its own.

This row form SHALL be the stated departure from the keyed record form, and the departure SHALL be
allowed only here. A caller reading twenty outcomes at once reads them to find the few that need
answering, and a keyed record per item costs more to read than the decisions it reports.

The outcome words SHALL be a closed set named by the command: an item put to the caller because the
CLI could not choose, an item chosen with something that needs saying about it, and an item nothing
matched. The word SHALL come first on the row, then the caller's own term, then what the CLI has to
say about it.

Here and in every other output the CLI composes, a product SHALL be named by the name the payload
carried. No product record the server issues holds a brand or a category, so neither SHALL be printed
beside a product, hoisted into `common` over a group of products, or used to head a row, and neither
SHALL be derived from the name in order to be printed as a field of its own — a value the payload
never carried reads as one the server issued. Where two products differ only in something their names
spell out — a fat percentage, a pack size — the names as printed are what tells them apart, and a
name SHALL NOT be shortened to the point where they no longer do.

#### Scenario: Seventeen settle and three do not

- **WHEN** twenty items are resolved and seventeen of them settle
- **THEN** the count of seventeen heads the output, their names and prices follow, and three rows
  follow those, one per unsettled item

#### Scenario: A row that puts a choice to the caller

- **WHEN** an item could not be settled and candidates exist
- **THEN** its row names the caller's term and then each candidate, and each candidate carries the
  identifier the server issued for it alongside its name and its price, with no brand and no category
  beside either, because no product record holds one

#### Scenario: Two candidates of the same brand

- **WHEN** two candidates that a reader would call the same brand are put to the caller
- **THEN** they are told apart by their names in full and their prices, and nothing is printed as a
  brand, because the brand is part of the name rather than a field of the record

#### Scenario: A row that reports nothing matched

- **WHEN** an item matched nothing
- **THEN** its row names the caller's term and nothing else, because there is nothing to say about it

#### Scenario: Nothing settled

- **WHEN** no item settles
- **THEN** the count states none, no names follow it, and the rows stand alone, because a count of
  what was asked for is not a count of what was found

### Requirement: An outcome is printed, never handed over as a file

A command SHALL print everything it has to report on standard output. It SHALL NOT write its answer
to a file and print a path to it, and it SHALL NOT require a second command to read what the first
already held.

A caller that has just filled a basket has to report the basket to a person. A path is one more call
and a person cannot read it, whereas the lines themselves cost less than the call that would fetch
them.

#### Scenario: A long outcome

- **WHEN** an outcome runs to many lines
- **THEN** every line is printed, and no file is written and no path is named

#### Scenario: Nothing is deferred to a second command

- **WHEN** a command has settled what it was asked to settle
- **THEN** the names of what it settled are in its own output, and no further command is needed to
  learn them

### Requirement: A listing holding several kinds names the kind on every record

Exactly one listing of the CLI holds records of more than one kind: the browse listing, which holds
categories, promotions and curated sets together. Every record of it SHALL carry its kind under a key
of its own, in the same position on every record, drawn from the closed set that command names. The
kind SHALL NOT be left to be inferred from which fields a record happens to carry, because two kinds
may carry the same fields and a caller that guesses wrong makes the wrong next call.

Where that listing was narrowed to a single kind — by a filter that admits one, by the option that
prints the popular categories, or by the option that prints one category with its subtree — the kind
SHALL be hoisted under the rule that already governs a field every record of a group shares. No other
listing SHALL carry a kind key, because in every other listing the command already fixes what the
records are.

#### Scenario: Three kinds in one listing

- **WHEN** a listing returns categories, promotions and sets together
- **THEN** every record carries its kind, and the kind of any record can be read without comparing it
  to another

#### Scenario: Two records with the same title

- **WHEN** a category and a promotion carry the same title
- **THEN** the two are told apart by their kind, printed on each

#### Scenario: A listing narrowed to one kind

- **WHEN** every record of the browse listing is of the same kind, as it is when one category is
  printed with its subtree
- **THEN** the kind appears once in the `common` section and on no record

#### Scenario: A listing of one kind by construction

- **WHEN** a listing is not the browse listing, so that the command that produced it already fixes
  what its records are
- **THEN** no record carries a kind key and none appears in `common`, because nothing was
  discriminated

## MODIFIED Requirements

### Requirement: An identifier is printed in the form its tools take

A composed output SHALL print an identifier only where the caller owes a decision on the record or a
further call against it, and only when some command of the CLI accepts a value of that kind as an
input. Where the CLI has already acted on the caller's behalf — an item it resolved and wrote itself
— the record SHALL print the product's name and its price and no identifier, because the caller's
next act is to report it to a person and a person cannot read a uuid.

An identifier that is printed SHALL be printed in the form the payload carried it in; the CLI mints
no identifier of its own and holds no numbering the server would not recognise. Where a payload
carries an entity under more than one form — a product under its uuid, its slug and its external
product id — every form the payload holds SHALL be printed, because no two of them are accepted by
the same set of commands. A form that every command taking that entity rejects SHALL NOT be printed,
because it offers the caller a handle that fails.

Identifiers no command consumes SHALL be left out, because a uuid costs more tokens than a line of
readable text and buys nothing a caller can act on. An identifier that some command consumes SHALL
nevertheless be left out where the value only echoes an argument the caller passed to the same
command, because it tells the caller what the caller just said. A key naming an identifier SHALL end
in `Id` where the identifier belongs to an entity other than the record holding it, so that a reader
can tell an identifier from a name; the key of a record's own identifier SHALL remain `id`. A link
the CLI cannot act on SHALL be treated the same way, unless the link is the whole substance of the
response.

An identifier that no command consumes MAY nevertheless be printed where the row would otherwise be
unnameable in conversation, or where a person could quote it to a shop.

An identifier every record of a group shares SHALL be hoisted into that group's `common` section
under the rule that already governs shared fields. This carries more weight than it did: a uuid
repeated on thirty rows is thirty times the cost of one.

#### Scenario: A consumed identifier

- **WHEN** a record names an entity the caller has a further call to make against, and some command
  accepts an identifier of that kind
- **THEN** it is printed exactly as the payload carried it, so the caller can pass it back

#### Scenario: An item the CLI already acted on

- **WHEN** a command resolved an item itself and wrote it
- **THEN** the item is printed by its name and its price, and no identifier appears beside it,
  because there is no decision left for the caller to make about it

#### Scenario: A record that has to be answered

- **WHEN** a command puts a choice between candidates to the caller
- **THEN** each candidate carries the identifier the server issued for it, because one of them has to
  be named back

#### Scenario: An entity carrying several forms

- **WHEN** a payload names a product by a uuid, a slug and an external product id, and the caller has
  a further call to make against it
- **THEN** all three are printed, because a cart write takes only the first and a batch match takes
  only the third

#### Scenario: A form every tool rejects

- **WHEN** a payload names an entity under a form that every command taking that entity rejects, as a
  category uuid is rejected by every category tool
- **THEN** that form is not printed, because one of those rejections is an empty list rather than an
  error and the caller would have no way to tell

#### Scenario: An identifier nothing accepts

- **WHEN** a payload carries an id that no command accepts as an argument and that names no row a
  caller would refer back to
- **THEN** it is not printed at all

#### Scenario: An identifier the caller supplied

- **WHEN** every record of a payload carries an identifier equal to an argument of the
  command that fetched it
- **THEN** it is not printed, even though a command consumes identifiers of that kind

#### Scenario: A key that names another entity

- **WHEN** a record prints the identifier of an entity other than itself
- **THEN** the key ends in `Id`, and a record printing its own identifier keys it `id`

#### Scenario: A shared identifier is hoisted

- **WHEN** every record of a listing names the same company
- **THEN** that company is printed once in `common` and not on any record

#### Scenario: Image and page links

- **WHEN** a payload carries an image address or a web page address
- **THEN** it is left out, unless the response carries nothing else of substance
