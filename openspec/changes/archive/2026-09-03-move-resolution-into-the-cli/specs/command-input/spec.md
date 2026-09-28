## ADDED Requirements

### Requirement: A scope selector takes a name as readily as a handle

Where an option names the scope a listing is drawn from — a category, a promotion, or a curated set
— it SHALL accept the handle the server issued for that scope, and SHALL also accept the scope's own
title written the way a person writes it. The two SHALL be one option, not two: a caller that knows
the title should not have to find the handle first, and a caller that holds the handle should not
have to spell the title.

Where the value matches exactly one scope of any kind, that scope SHALL be used. Where it matches
more than one — the same word naming a category and a promotion — the CLI SHALL print every match
with its kind and its handle and SHALL stop without listing anything. It SHALL NOT prefer one kind
over another, and SHALL NOT take the first match. Where it matches nothing, the command SHALL fail
naming the value.

#### Scenario: A handle

- **WHEN** the scope option is given a handle the server issued, such as a category slug or a
  promotion code
- **THEN** that scope is used, and no search for a title happens

#### Scenario: A name matching one scope

- **WHEN** the scope option is given a title that matches exactly one category, promotion or set
- **THEN** that scope is used, and the listing is drawn from it

#### Scenario: A name matching two scopes

- **WHEN** the scope option is given a title that matches both a category and a promotion
- **THEN** both are printed with their kind and their handle, nothing is listed, and the command
  fails
- **AND** neither is chosen, whichever kind was matched first

#### Scenario: A name matching nothing

- **WHEN** the scope option is given a value matching no category, promotion or set
- **THEN** the command fails naming the value, and no listing is printed

### Requirement: Selectors that exclude one another are refused before the call

Where a command offers several options that each name a different source for the same listing — a
scope, the caller's own favourites, the products similar to a named one — passing more than one SHALL
fail, naming every selector that was passed, before any tool is
called. The CLI SHALL NOT silently prefer one of them, and SHALL NOT leave the rule to be carried in
prose the caller has to have read.

An option that narrows a listing rather than choosing its source — a stock filter, a price bound, a
sort, a page — SHALL NOT conflict with any selector, and SHALL be accepted alongside one.

#### Scenario: Two sources for one listing

- **WHEN** a command is given two options that each name a different source for its listing
- **THEN** it fails naming both of them, and no tool is called

#### Scenario: A source and a filter

- **WHEN** a command is given one source selector together with a stock filter, a price bound, a sort
  and a page
- **THEN** all of them are accepted, because only one source was named

### Requirement: The times the CLI accepts

The CLI SHALL accept a time in three forms and no others: a relative day named as a word, `today` or
`tomorrow`; a date; or a date and a wall clock time. Every form SHALL be read in the machine's own
time zone, and the CLI SHALL send an absolute UTC instant to the server. A form naming a day rather
than a moment SHALL stand for that whole day, and the command SHALL state which moment within it the
call was made for rather than picking one silently.

Those three forms, and no more, SHALL be named wherever the CLI tells the caller what it expects —
in the help of an option that takes a time and in the failure it raises for a time it cannot read.
Three is what a caller can be taught; the table of five this replaces was skill weight that changed
no behaviour.

Beyond them the CLI SHALL also accept any spelling that carries its own time zone, whether as an
explicit offset or as `Z`, and SHALL read it as the instant it names. Such a form is undocumented
but unambiguous, and an agent writing an instant reaches for it: rejecting it costs a turn and buys
nothing. **What the help narrows is what the caller is taught, never what the parser accepts.** A
form that is ambiguous about its zone SHALL be read as wall clock; a form that is not a time at all
SHALL fail naming the three.

The CLI SHALL also accept a relative day carrying a wall clock time of its own — `today 15:30` or
`tomorrow 09:00` — reading it exactly as it reads a date and a wall clock time, in the machine's own
time zone: it is the plain composition of the first of the three documented forms with the third,
and a caller who has just been taught both forms writes their combination next. This, too, is
undocumented but unambiguous, and the help still names only the three forms.

#### Scenario: A spelling that carries its own zone

- **WHEN** the caller passes a time ending in `Z` or carrying an explicit offset
- **THEN** the CLI reads it as the instant it names, without consulting the machine's time zone
- **AND** the help still names only the three forms

#### Scenario: A relative day

- **WHEN** the user passes `today` or `tomorrow`
- **THEN** the CLI reads it as that day in the machine's time zone

#### Scenario: A relative day carrying its own wall clock time

- **WHEN** the user passes `today` or `tomorrow` followed by a wall clock time, such as `today 15:30`
- **THEN** the CLI reads it as that time on that day in the machine's time zone, and the help still
  names only the three forms

#### Scenario: A date and a wall clock

- **WHEN** the user passes a time such as `2026-08-17 09:00`
- **THEN** the CLI interprets it in the machine's time zone and sends the corresponding UTC instant

#### Scenario: A date alone

- **WHEN** the user passes a date with no time of day
- **THEN** it stands for the whole of that day, and the command states which moment within it the
  call was made for

#### Scenario: A time in none of the three forms

- **WHEN** the value is neither a relative day, nor a date, nor a date and a wall clock
- **THEN** the command fails naming all three forms, and shows one written form of the last

## MODIFIED Requirements

### Requirement: Arguments reach the command as typed

An argument SHALL reach the command holding the text the user typed. Turning that text
into what a tool call needs SHALL be done by the command, where the call is built, and
SHALL NOT replace the argument on the way in. Gathering a repeatable option into a list is
not a conversion and MAY still happen as the argument is read.

#### Scenario: The typed text survives the parse

- **WHEN** a command receives an argument that needs converting or resolving, such as a local
  time, a destination named as free text, or a term to be matched against the catalogue
- **THEN** the value it receives is the text as typed, and the converted or resolved form exists
  only where the command builds its tool call

#### Scenario: A repeatable option still gathers

- **WHEN** an option that stands for a list is passed several times
- **THEN** the values are gathered into one list in the order they were given, each still
  as typed

#### Scenario: A conversion that fails still fails the command

- **WHEN** an argument cannot be converted
- **THEN** the command fails naming what it expected, as it did when the conversion
  happened during parsing, and no tool is called

### Requirement: Scalar arguments

The CLI SHALL reject scalar arguments that do not match the type an option expects, naming
what it expected. One written form SHALL govern both the whole-number options and the
decimal ones: an optional minus sign, digits, and at most one fractional part. Text outside
that form SHALL fail rather than being read as far as it happens to parse, so that
exponent, hexadecimal, separator and trailing-character spellings are refused instead of
silently yielding a number the user did not write. A whole-number option SHALL accept a
value of that form whose fractional part is zero, and SHALL refuse one that cannot be held
exactly.

A delivery type is a scalar too, and its accepted set is closed and already known to the CLI: the
sixteen spellings the server itself accepts. A value outside that set SHALL fail naming every
spelling the option accepts, wherever a delivery type is taken as an option, rather than reaching
the tool and surfacing its validation error — a schema dump of the whole accepted set inside a
tool-error wrapper is not the same as the CLI naming what it expected.

#### Scenario: Integer option

- **WHEN** a value for an integer option is not a whole number of the accepted form
- **THEN** the command fails saying an integer was expected

#### Scenario: A whole number written with a fractional zero

- **WHEN** a value for an integer option is written as `12.0`
- **THEN** it is read as the whole number `12`

#### Scenario: A whole number too large to hold exactly

- **WHEN** a value for an integer option names a whole number beyond what can be held
  exactly
- **THEN** the command fails rather than sending a rounded number

#### Scenario: Number option

- **WHEN** a value for a numeric option is not of the accepted form
- **THEN** the command fails saying a number was expected

#### Scenario: A spelling that parses only in part

- **WHEN** a value for either kind of numeric option is written as an exponent, in
  hexadecimal, with digit separators, or with characters trailing the digits
- **THEN** the command fails, and no number is read from the part that would have parsed

#### Scenario: An empty value

- **WHEN** a value for either kind of numeric option is empty or blank
- **THEN** the command fails, and it is not read as zero

#### Scenario: Page size and page offset are whole numbers

- **WHEN** a page size or a page offset is given to any command that pages its results
- **THEN** it is read as a whole number, and a fractional one fails, alike for every such
  command

#### Scenario: Boolean option

- **WHEN** a value for a boolean option is one of `true`, `1`, `yes`, `y` or `false`, `0`,
  `no`, `n`, in any letter case
- **THEN** the CLI reads it as the matching boolean, and fails otherwise saying `true` or
  `false` was expected

#### Scenario: Delivery type option

- **WHEN** a value for a delivery type option — `cart setup --delivery-type` or `slots --type` — is
  not one of the sixteen spellings the server accepts
- **THEN** the command fails before any tool is called, naming every accepted spelling, and no
  tool's own schema error reaches the caller

#### Scenario: Nullable option

- **WHEN** the literal word `none` is given where a value that can be cleared is expected, such as
  the cart's promo code or its requested bonus
- **THEN** the CLI sends an explicit null so the server drops the current value, and the word is
  spelled the same way wherever a value can be cleared

### Requirement: Repeatable options

The CLI SHALL let options that stand for a list be passed several times, collecting the values
in the order they were given. Where the list is the subject of the command rather than a filter
on it, the values SHALL be accepted as bare arguments **instead of** through an option, not as
well: one list written two ways is a choice the caller should not have to make. A command that
accepts its subject positionally SHALL NOT also carry sibling subcommands whose names a bare
argument could be read as.

#### Scenario: Several product queries

- **WHEN** the user writes several words of a product query
- **THEN** every value reaches the server as one list in that order, gathered from bare arguments

#### Scenario: The subject written bare

- **WHEN** the user writes the values the command exists to act on, such as the items of a shopping
  list, the products to take out of the cart, or the products to save as favourites
- **THEN** they are collected in order as bare arguments, the command offering no option that
  would take the same list

#### Scenario: A repeatable option that is not the subject

- **WHEN** a command takes a list that qualifies what it acts on rather than naming it, such as the
  answers to the ambiguities a previous run reported
- **THEN** that list is given through a repeatable option, because the command's subject is
  something else

#### Scenario: A filter is not written bare

- **WHEN** an option narrows a listing rather than naming what the command acts on, such as the
  scope a listing is drawn from or the product a similarity is measured against
- **THEN** it is given through its option alone, so that no bare argument has to be told apart
  from another

#### Scenario: A subject and a subcommand cannot be confused

- **WHEN** a command takes its subject as bare arguments
- **THEN** it carries no sibling subcommand whose name one of those arguments could be read as

### Requirement: An entity argument is the entity's own identifier

Wherever an argument names an entity by an identifier — a scalar option such as the branch of a slot
listing, or a positional such as a product of a cart removal or of a favourites write — the CLI SHALL
send the value it was given to the tool unchanged. It SHALL NOT inspect the value's shape, look it
up, or substitute another form for it. There is no form the CLI rewrites.

No command SHALL decide what kind of entity an identifier names by looking at how it is written.
There is no lookup that takes a handle of any kind and dispatches on its form, because form cannot
tell the families apart: a bare uuid names a product, a branch, a company, a settlement or a Nova
Poshta office alike, and a bare integer names a coupon's id as readily as a product's external id.
Each family therefore carries its own lookup — a product card, a store, a category with its subtree,
one of the caller's coupons — and each accepts only the forms that are unambiguous within it. A
product card takes a uuid, a slug or an external product id and hands whichever it was given to the
one tool that answers for all three, so nothing is told apart even there. A handle in none of the
forms its own family takes SHALL fail naming the handle, and no other family SHALL be tried.

Two arguments are named exceptions, and they are exceptions because the command exists to resolve
them rather than to pass them on. A scope selector SHALL accept a human name beside the handle,
under the rule that governs scope selectors. A store SHALL likewise be named by a text as well as by
its uuid, and that text SHALL be matched by the CLI over the listing it already pages, because the
store listing takes a page, a pickup flag and a Nova Poshta flag and no filter a name could be sent
to. Outside those two, no argument's shape is inspected.

A value the tool does not accept SHALL therefore fail at the tool, and the CLI SHALL report the
tool's own error rather than one of its own. This includes the MCP layer's uuid validation, which
rejects a malformed identifier before the request reaches Silpo.

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

## REMOVED Requirements

### Requirement: Coordinates

**Reason**: No command takes a latitude and a longitude any more. A destination and a neighbourhood
are now named as free text and the CLI geocodes them itself, so a coordinate pair is never something
the caller holds, types, or has to obtain from a previous command.

**Migration**: Pass the place as text: the neighbourhood a store listing is drawn around through the
store listing's proximity option, and the destination of a delivery through the cart's destination
option. The proximity option reaches no server: the store listing takes a page and its two service
flags and nothing else, so the CLI geocodes the text and orders the listing it pages itself. Where a
Nova Poshta office is the destination, the CLI supplies the office's own coordinates.

### Requirement: Time arguments

**Reason**: Replaced by **The times the CLI accepts**. Two of this requirement's scenarios governed a
JSON timeslot object, and JSON is removed from every input; a third governed an instant carrying its
own zone, a spelling no caller writes by hand. What is left is the three forms a person actually
writes, and those are stated afresh rather than as an amendment, so that the help and the failure can
name the whole accepted set.

**Migration**: Write a time as `today`, as `tomorrow`, as a date, or as a date and a wall clock time,
in the machine's own time zone. A slot window that was once a JSON object with `start` and `end` is
now two time options taking those same two forms.

### Requirement: JSON arguments

**Reason**: JSON is removed from every input. Five sites carried it, each needed prose in the skill
to teach, and the measured runs failed on shell quoting more often than on anything else. Identifiers
are now positional and settings are flat flags.

**Migration**: Products to remove from the cart and products to favourite are written as bare
arguments; the shopping list is written as bare arguments and its ambiguities answered through a
repeatable term-to-identifier option; the promo code, the requested bonus and a certificate become
named commands of their own instead of JSON on the cart setup; a slot window is given as two time
options; and an offline order listing fills the delivery context it needs from the cart instead of
being handed one.

### Requirement: A field read out of a JSON entry

**Reason**: There is no JSON entry left to read a field out of. Every value this rule governed —
a product identifier, a company, a branch, a quantity — is now either a bare argument or a flag with
one scalar value, read by the rule for scalar arguments and for entity arguments.

**Migration**: Pass each value through the argument that names it. A quantity is written beside its
item in the shopping list; a product is a bare argument; a branch and a company are flags where a
command still needs them.
