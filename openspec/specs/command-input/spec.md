# command-input Specification

## Purpose

Defines how the CLI reads the values a user types — numbers, booleans, coordinates, times, JSON structures, repeated flags, and short ids — so that a malformed argument fails immediately with a readable message instead of reaching the MCP server.

## Requirements

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

### Requirement: What the help of an option says

The description the CLI prints for an option or a positional argument SHALL name the value
the user is being asked for and nothing beyond it: not how the value travels once the CLI
holds it, not how the server treats it afterwards, and not an example of a shape the
placeholder or the flag name already carries. An example SHALL NOT be given where it would
narrow what the option in fact accepts. Where an option takes one of a closed set of values,
the description SHALL name every value of that set or none of them. Two commands that ask
for the same kind of value SHALL describe it in the same words.

#### Scenario: A value the CLI only passes on

- **WHEN** an option hands its value to the server untouched
- **THEN** its description names the value, and says nothing about the handing on

#### Scenario: An example that would mislead

- **WHEN** an option accepts a family of forms, such as a time written locally or with a zone
- **THEN** its description names the family, and does not show one member of it as though it
  were the shape required

#### Scenario: A closed set of values

- **WHEN** an option accepts only the values of a fixed set, such as a sort field or a sort
  direction
- **THEN** its description names all of them, never a few of them followed by an ellipsis

#### Scenario: The same value in two commands

- **WHEN** two commands take the same kind of value, such as a branch that may be named by
  its alias or a page of results
- **THEN** both describe it with the same words

### Requirement: A failed argument is reported in one place

A conversion or a resolution that cannot read its input SHALL report the failure by raising,
and SHALL NOT write to the user or choose an exit status. The CLI SHALL turn any such failure
into one line on standard error and a failing exit status, in the single place that already
surrounds the whole parse.

#### Scenario: One wording, one exit

- **WHEN** any argument fails to convert or resolve
- **THEN** the CLI writes the failure as one line on standard error and exits with a failing
  status, whichever command and whichever argument it came from

#### Scenario: No usage hint for an entity that was not found

- **WHEN** an argument names an entity the CLI cannot resolve
- **THEN** the failure names the entity and the value and nothing else, because the caller made
  no syntax mistake to be shown the usage for

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
