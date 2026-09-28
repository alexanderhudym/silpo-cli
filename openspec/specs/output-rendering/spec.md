# output-rendering Specification

## Purpose

Turns what the CLI has to report — an MCP payload or its own state — into compact plain text a terminal and an agent can both read. Every command composes its own output: it names the fields it shows, joins each to its value with a colon and a space, gives each fact a line, separates records with an empty line and indents what nests two spaces further, leaving out the identifiers no tool accepts and the addresses the CLI cannot follow. One form, written once here, so that every hand-written output stays one dialect, with no form reserved for any command.

## Requirements
### Requirement: Output a command composes itself

Every command that prints SHALL build the text it prints directly from what it has to report,
whether that is a payload returned by the MCP server or the CLI's own state. Such a command
SHALL state its output in full: which fields appear, in what order, under which key if any,
and what each value becomes. Nothing about the output SHALL follow from a field's name, from
the runtime shape of its value, or from any default the command did not ask for.

#### Scenario: The command decides what appears

- **WHEN** a command composes its own output
- **THEN** a field of the payload appears only because that command names it, and a field
  it does not name is absent

#### Scenario: A key is printed only where it informs

- **WHEN** a command composes its own output
- **THEN** it decides per field whether to print the field's key alongside the value, so
  that a value whose meaning is plain from the value itself costs no key

#### Scenario: Several fields become one piece of text

- **WHEN** a command composes its own output
- **THEN** it may join several fields of a record into a single piece of text

#### Scenario: Nothing is inferred from a field's name

- **WHEN** a command composes its own output
- **THEN** no conversion is chosen by matching a field's name, and no value is inspected
  to guess whether it is an id, an instant, or anything else

#### Scenario: Conversions are the shared ones

- **WHEN** a composed output shows an absolute instant, a coordinate, an alias, a group of
  boolean flags or a set of delivery cost tiers
- **THEN** it uses the shared conversion for that subject, so that a value reads the same
  whichever command printed it

#### Scenario: A composed output is not bound to a width

- **WHEN** a command composes output whose reader is a program rather than a window
- **THEN** it lets a line run as long as its value needs, and no width is measured or
  detected anywhere in the CLI

#### Scenario: A record shape shared by two tools

- **WHEN** two or more tools are shown to return a record with the same fields
- **THEN** that record MAY be composed by one shared piece of text-building that every such
  command calls, and a record returned by a single tool SHALL NOT be generalised in advance

#### Scenario: The CLI's own state is composed too

- **WHEN** a command reports the CLI's own state rather than a payload from the MCP server
- **THEN** it composes its text in the same form as every other command, and no form is
  reserved for it

### Requirement: The composed form

Every command SHALL follow one form, so that a reader moving between commands meets the same
shape of text. A key SHALL be joined to its value by a colon and a space. A fact SHALL take one
line of its own, and a line SHALL run as long as its value needs, because the reader is a
program behind a pipe rather than a window. Records SHALL be separated by exactly one empty
line, and SHALL carry no marker opening the record. A group of records SHALL be named on a line
of its own above them. Text SHALL be indented with spaces only, two per level of nesting, and
no line SHALL carry a tab or trailing whitespace.

#### Scenario: Key and value

- **WHEN** a command prints a field under its key
- **THEN** the key, a colon, a space and the value stand on one line, and the next field
  starts a new line

#### Scenario: No line is wrapped

- **WHEN** a value is long enough that the line would exceed any terminal width
- **THEN** the line runs to the value's end, neither wrapped nor truncated, and no width is
  measured or detected

#### Scenario: Records are separated

- **WHEN** a command prints more than one record of the same kind
- **THEN** exactly one empty line separates neighbouring records, and no record opens with a
  marker or an ordinal unless the command states one for every item of that list

#### Scenario: A group is named

- **WHEN** a command prints a group of records under a name
- **THEN** the name stands alone on the line above the group

#### Scenario: Nested records are indented

- **WHEN** a command prints a record inside another record
- **THEN** the inner block is indented two spaces further than the line naming it, one level
  per step of nesting, with spaces and never tabs

#### Scenario: A value that carries its own line breaks

- **WHEN** a value the server supplied holds newlines or runs of whitespace
- **THEN** it is collapsed to a single line before it is placed in a field, so a record the
  command states as one line stays one line

#### Scenario: No line carries trailing whitespace

- **WHEN** any command's output is written
- **THEN** every line ends at its last visible character, and no line holds a tab

#### Scenario: A command prints no heading of its own name

- **WHEN** a command's output would open with a title naming the command the user just typed
- **THEN** that title is left out, because it repeats the invocation and reports nothing

### Requirement: A bare value for a shell

A command whose whole answer is a single value SHALL print that value alone, with no key, no
surrounding block and nothing else on the line, so that it can be used in a shell substitution.

#### Scenario: One value is the whole answer

- **WHEN** a command is asked for a single value and finds it
- **THEN** the value is printed on a line of its own, with no key and no group name above it

#### Scenario: The value is absent

- **WHEN** a command asked for a single value cannot find it
- **THEN** it fails rather than printing an empty line

### Requirement: A field every record of a group shares

Where a command prints a group of records that all carry the same value of a field, it MAY
print that value once above the group instead of in every record, in a section named
`common` standing between the group's summary and its records and holding one keyed row per
such field. Whether a field is offered this way SHALL be stated by the command, one field at
a time; nothing SHALL be hoisted because its value happened to repeat. Where the records of
one payload do not all carry the same value, the command SHALL print the field in each record
as it otherwise would, and SHALL NOT print the section, so that the section is never a claim
the payload contradicts.

#### Scenario: A shared value is printed once

- **WHEN** every record of a group carries the same value of a field the command offers this
  way
- **THEN** that value appears once, under its key, in the `common` section above the records,
  and no record repeats it

#### Scenario: Records that disagree

- **WHEN** the records of a group do not all carry the same value of that field
- **THEN** the section is absent and every record carries the field itself

#### Scenario: Only what the command named

- **WHEN** a group's records happen to share a field the command did not offer this way
- **THEN** that field stays in the records, because hoisting follows from the command's
  statement rather than from the values

### Requirement: A dictionary whose keys are data

A command MAY print an object whose keys are supplied by the server rather than fixed by the
tool contract, in which case it SHALL print every entry of that object as a key and a value
in the composed form. Naming such fields in advance is not possible, and this SHALL be the
only place where a printed key comes from the payload rather than from the command.

#### Scenario: Server-supplied keys

- **WHEN** a command prints an object whose key set is not declared by the tool contract
- **THEN** each entry appears as its own key and value, with the key exactly as the server
  spelled it

#### Scenario: Everything else is named by the command

- **WHEN** a command prints any object whose fields the tool contract declares
- **THEN** each printed key comes from the command, not from the payload

### Requirement: A summary counts what the command printed

Where a command heads its output with a count, that count SHALL describe the result the command
printed. A count the server returned SHALL be shown only where it still describes that result;
where the CLI narrowed, filtered or assembled what it prints, the count SHALL be the CLI's own.
A count of what was asked for SHALL NOT be presented as a count of what was found, because a
caller reads the head of the output to decide whether to read the rest.

#### Scenario: The command filtered what the server returned

- **WHEN** a command matches three records out of a listing the server reports a thousand for
- **THEN** the summary states three, and the thousand is not shown beside it

#### Scenario: A page of a larger listing

- **WHEN** a command prints one page of a listing the server pages
- **THEN** the summary may state both what this page holds and the total available, because
  both describe the same set and the second tells the caller there is more

#### Scenario: Asked for many, found none

- **WHEN** a command is asked about several records and the server offers a result for none of
  them
- **THEN** the summary says that none were found, rather than counting the records that were
  asked about

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

### Requirement: A one-value answer prints bare

Where a command's whole answer is a single value, it SHALL print that value and nothing else: no
key, no label, no surrounding record. A caller reading such a command reads it to hand the value
straight to the next command, and a label makes the output something to parse rather than
something to use.

This SHALL NOT extend to a command that answers with a record which happens to hold one field
today. The test is whether the command could ever have a second thing to say, not how many lines
it prints for one payload.

#### Scenario: One configuration value

- **WHEN** a single configuration value is asked for by its key
- **THEN** the value is printed on its own, so that substituting the command into another yields
  the value and nothing to strip

#### Scenario: The same value labelled inside a record

- **WHEN** that value appears inside a record listing the whole configuration
- **THEN** it keeps its key, because there it stands beside other fields and the reader needs to
  know which is which

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

No listing of the CLI SHALL interleave records of more than one kind. The browse listing, which was
the only one that did, SHALL answer its three kinds as three groups in a fixed order, and the kind
SHALL be named once on the group rather than on every record it holds.

Grouping states what the per-record tag stated, at a cost that does not grow with the number of
records, and it settles the question the tag existed to answer before the reader reaches a record: a
category, a promotion and a set carry different fields and are used differently, and a reader who
knows which group they are in never has to infer a kind from the fields a record happens to carry.

It also removes what the tag made expressible. A sequence of tagged records can be ordered across
kinds, and an order across kinds is an order by a score computed over records that are not
alternatives to one another. Three groups cannot express such an order at all.

Because no listing interleaves kinds, no record SHALL carry a kind key, and the rule that hoisted a
shared kind into the `common` section SHALL have nothing left to hoist. A group's kind SHALL be
carried by the group's own heading, under the rule that already governs a field every record of a
group shares.

#### Scenario: Three kinds in one listing

- **WHEN** a command answers with categories, promotions and sets
- **THEN** each kind is printed as its own group, the group names the kind once, and no record carries
  a kind key

#### Scenario: Two records with the same title

- **WHEN** a category and a promotion carry the same title
- **THEN** the two are told apart by the group each stands in, without either record carrying a kind

#### Scenario: A listing narrowed to one kind

- **WHEN** a text matches records of only one kind
- **THEN** that kind's group is printed and the others are absent or empty, and no kind is hoisted
  into `common`, because the group already names it

#### Scenario: A listing of one kind by construction

- **WHEN** a listing is not the browse listing, so that the command that produced it already fixes
  what its records are
- **THEN** no record carries a kind key and none appears in `common`, because nothing was
  discriminated
