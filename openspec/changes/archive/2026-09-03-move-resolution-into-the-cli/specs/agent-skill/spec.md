## MODIFIED Requirements

### Requirement: Every entry answers a need

Each entry SHALL state the need it serves before the command that serves it, so a reader who knows
the goal but not the command can find it. Section headings SHALL name their subject plainly.

Where one command serves several needs, they SHALL be named inside that command's single entry, each
against the options that need calls for, rather than the command being listed once per need. A
command SHALL appear in the index once.

Where the CLI resolves a whole need in one command, the entry SHALL give that command and stop.
The skill SHALL NOT carry an entry for a step the CLI takes on the way to it — turning a destination
into coordinates, asking which delivery types a place allows, listing a branch's slots so that a
cart write can be assembled, or searching for a product in order to put it in the cart. A need the
CLI now answers whole SHALL NOT be presented as a sequence of entries the reader composes.

#### Scenario: The reader knows the goal but not the command

- **WHEN** the reader needs to find a replacement for a product that is out of stock
- **THEN** an entry states that need and gives the command, and the reader is not required to know
  which of the CLI's groups files it

#### Scenario: A heading is read on its own

- **WHEN** a section heading is read out of context
- **THEN** it names what the section covers as a plain noun phrase, rather than completing a sentence
  begun by another heading

#### Scenario: One command serves several needs

- **WHEN** a single command covers several distinct situations, such as sending the order to an
  address, moving it to a different store, and changing when it arrives
- **THEN** its one entry names each situation against only the options that situation calls for, and
  the command is not listed a second time under another need

#### Scenario: A shopping list has to reach the cart

- **WHEN** the reader has a list of things to buy
- **THEN** one entry gives one command that takes the list and writes the cart, and no entry
  describes finding each product first and adding it afterwards

#### Scenario: The order has to go somewhere

- **WHEN** the reader has to send the order to an address, a store, or a Nova Poshta office
- **THEN** one entry gives the command that takes the destination as words, and the skill carries no
  entry for geocoding it, for listing the delivery types it allows, or for listing the slots that
  serve it

### Requirement: Command entries are literal and complete

Every command entry SHALL give the command in full, with each option it accepts written inline as a
name and a placeholder. An entry SHALL NOT abbreviate any part of the command, and SHALL NOT rely on
a legend, key or expansion defined elsewhere in the file. Required and optional options SHALL be
distinguishable.

A placeholder SHALL stand for one value a reader can type — a word, a handle, a time, an amount. No
entry SHALL give a JSON document as the value of an option or an argument, because no command takes
one. Where a command accepts several values of one kind, the entry SHALL write them as a repeated
positional placeholder rather than as a list format the reader has to construct.

#### Scenario: A command that requires the cart-derived context

- **WHEN** the reader looks for the entry of a command that takes the branch, the delivery type and
  the timeslot
- **THEN** there is none, because no command takes them, and no entry writes any of the three as an
  option to be filled in

#### Scenario: A command with more than one option

- **WHEN** an entry gives the command that sends the order to a destination at a stated time
- **THEN** both options appear in the entry itself, written as names and placeholders, and the entry
  can be copied and filled in without consulting another part of the file

#### Scenario: No worked examples

- **WHEN** an entry gives a command that takes an address, a product or a quantity
- **THEN** the value is written as a placeholder such as `<address>` or `<query>`, and no concrete
  value, real or invented, appears in its place

#### Scenario: Optional options are marked

- **WHEN** an entry gives a command with both required and optional options
- **THEN** the optional ones are visibly marked as optional and the required ones are not

#### Scenario: Several values of one kind

- **WHEN** an entry gives a command that takes several products at once
- **THEN** it writes them as a repeated positional placeholder, and no entry anywhere in the skill
  shows a bracketed list or an object as a value to be typed

### Requirement: Every command is reachable from the skill

The skill SHALL carry exactly one entry for every leaf command the agent drives, so that no such
command is reachable only by reading the CLI's own help and no command is carried twice.

A leaf command SHALL be counted as one invocation form that performs an action of its own: each
subcommand counts separately from its siblings and from its group, and a group that acts when it is
named with no subcommand counts as one leaf besides them. The same rule SHALL be used on both sides
of any comparison of one surface with another, because a count taken by one rule and compared against
a count taken by another says nothing.

Counted that way the surface holds forty leaves, thirty of which the agent drives and which therefore
require an entry apiece:

`login`, `logout`, `fill`, `cart`, `cart remove`, `cart clear`, `cart setup`, `cart promo`,
`cart bonus`, `cart certificate add`, `cart certificate remove`, `cart adult`, `cart set`, `search`,
`browse`, `product`, `favorite add`, `favorite remove`, `me`, `me addresses`, `me family`,
`me restrictions`, `me coupons`, `me promos`, `me certificates`, `me coupon`, `me orders`, `slots`,
`stores`, `np`.

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

#### Scenario: A command exists but no situation calls for it

- **WHEN** a command exists that no situation the agent meets calls for — changing the CLI's
  configuration, inspecting its background process, or printing a server payload verbatim
- **THEN** it does not appear in the skill at all, and the CLI's own help is where a person
  debugging the CLI finds it

#### Scenario: An automatic choice is questioned

- **WHEN** the reader is asked why a product was chosen without being asked about
- **THEN** the skill has already named, beside the description of that automatic choice, the command
  that prints the candidates, their scores and the rule that decided

### Requirement: The implicit context is stated before the index

The skill SHALL state, ahead of the index, that the branch, the delivery type and the timeslot the
CLI works within come from the active cart and are supplied by the CLI itself, so that no command
takes them and none has to be fetched first. It SHALL state that a lapsed slot is repaired without
being asked before any call whose answer depends on stock or on price, a read as much as a write;
that a read nevertheless never moves the order, the store, the delivery type and the address being
left exactly as they stand; and that the reader is never sent after a slot.

It SHALL state that no cart is invented where the account has none, name the reason the commands
report, and give the one command that opens a cart from a destination stated in words. It SHALL
state that the person is asked where the order goes rather than guessed at, and SHALL NOT carry a
table of the things a cart has to be opened with, nor the commands that would resolve each of them,
because the CLI resolves them from the destination.

It SHALL NOT give an order of commands for retrieving the context, because there is none to give,
and SHALL NOT state that a given option is required by every command of a group; which options a
command takes is carried by that command's own entry.

#### Scenario: The agent needs a catalogue command first

- **WHEN** the reader reaches the index looking for a product search
- **THEN** the preamble has already established that the command needs no context of its own

#### Scenario: The reader looks for the cart-reading step

- **WHEN** the reader looks for the sequence that retrieves the branch, delivery type and timeslot
- **THEN** there is none in the skill, because the CLI does it

#### Scenario: The cart holds a stale timeslot

- **WHEN** the timeslot stored on the cart has passed or is no longer offered
- **THEN** the preamble has established that the CLI replaces it before any call whose answer depends
  on stock or price, that a read repairs it without moving the order elsewhere, and that the reader
  neither checks nor repairs it

#### Scenario: The account has no cart

- **WHEN** a command reports that the account has no shopping cart
- **THEN** the skill has already told the reader to ask the person where the order goes, and named
  the single command that takes that answer as words and opens the cart from it

#### Scenario: A command in the group takes fewer options

- **WHEN** a catalogue command takes an option another one in its group does not
- **THEN** nothing ahead of the index has claimed otherwise, and its own entry is what the reader
  follows

### Requirement: What the CLI does on its own is stated

The skill SHALL state the things the CLI does without being asked, so that the reader recognises the
output rather than treating it as an error, and does not repeat work that is already done. It SHALL
state each of these:

- that a personal index of the products the account has bought, saved and already seen is kept and
  extended by the CLI, so that a term can resolve without a search, and that the index holds identity
  only — every price, stock and availability the reader reports comes from the call that printed it;
- that the index holds nothing for a term the account has never bought, saved or seen, so that on a
  first run, immediately after a rebuild, and for any such product, the term is resolved by a live
  search instead; that filling a list in that state costs what searching and writing by hand would
  cost, and no less; that what is saved even then is that the candidates are ranked and settled
  without the reader reading them; and that a run in which few terms settle by themselves is
  therefore an index that has seen little, not a CLI that is failing;
- that a shopping list stated as free text is normalised, matched and resolved by the CLI, which
  writes the cart itself;
- that a destination stated as free text is resolved into the address, the delivery type, the branch
  and the slot, and written to the cart;
- that a lapsed timeslot is replaced before any call whose answer depends on stock or price, because
  a cart standing on a slot that has passed reports every line out of stock, and that this replaces
  the slot alone and never the store, the delivery type or the address;
- that a quantity the branch cannot fill is reduced, and a product it cannot fill at all is named
  and left in the cart;
- that where more than one candidate is plausible the CLI prints them and stops rather than choosing,
  so a printed candidate list is a decision owed to the reader and not a failure to retry.

It SHALL NOT claim that a cart is among the things the CLI opens on its own.

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

#### Scenario: A term resolves without a search

- **WHEN** a product the account has bought before is named and no search runs
- **THEN** the skill has established that the CLI resolved it from what it already holds, and that
  the price beside it came from the call that printed it rather than from anything stored

#### Scenario: The index has seen nothing yet

- **WHEN** a list is filled on a first run, or on the run after a rebuild, and few of its terms settle
  by themselves
- **THEN** the skill has established that the index had nothing to resolve them from, that each term
  went to a live search, that this is the expected cost rather than a fault to report or a command to
  repeat, and that the proportion settling by itself rises as the account's own products accumulate

#### Scenario: The command prints candidates and stops

- **WHEN** a destination or a term matches more than one plausible candidate and nothing was written
- **THEN** the skill has established that this is the CLI declining to choose, that repeating the
  same command will produce the same list, and that the way forward is to answer it

### Requirement: The skill names how to spend fewer steps

The skill SHALL state that independent commands may be issued in one shell invocation, and that a
write and the read that verifies it belong in the same invocation. It SHALL keep the rule that a
whole shopping list reaches the cart through a single command, and SHALL state that the product card
answers one handle at a time, so that several cards are read by putting the several commands in one
invocation rather than by looking for a command that takes a list of handles. It SHALL NOT describe
the cart as something to be fetched before working with it.

It SHALL state that a step the CLI takes for itself is not to be taken by hand: no search before a
list is filled, no address lookup before a destination is set, no slot listing before a time is
chosen. It SHALL state that every piece of the person's own text is quoted when it is passed, because
an apostrophe or a space ends a bare shell word and costs a whole step.

It SHALL give all of this as rules about how the CLI is driven rather than as a walkthrough of any
one task.

#### Scenario: Several reads that do not depend on each other

- **WHEN** the reader needs the profile, the saved addresses and the cart
- **THEN** the skill has established that these travel in one invocation, because none of them needs
  the answer of another

#### Scenario: A write and its verification

- **WHEN** the reader adds products to the cart
- **THEN** the skill has established that the write already carries the cart it produced, so that a
  write which reported success and changed nothing is caught without a second command

#### Scenario: Several products at once

- **WHEN** the reader has several things to put in the cart
- **THEN** the skill has established that they go in one call, not one call each, and not a lookup
  followed by a write

#### Scenario: Several lookups at once

- **WHEN** the reader holds several handles and wants the card for each
- **THEN** the skill has established that the card command takes one handle, and that the several
  calls travel in one shell invocation, so the reader neither looks for a command that takes a list
  nor spends a turn on each

#### Scenario: No cart preamble to perform

- **WHEN** the reader is about to work with the cart
- **THEN** nothing in the skill asks for a preparatory call to find it

#### Scenario: The person's own words are passed to a command

- **WHEN** a shopping list, a query or a destination is passed and it carries an apostrophe
- **THEN** the skill has established that the value is quoted, so that the shell does not end the
  word and cost a step to discover it

### Requirement: Rules, not walkthroughs

The skill SHALL carry as rules only what an agent would otherwise get wrong, and SHALL NOT carry
end-to-end walkthroughs of tasks a capable agent composes on its own. A rule SHALL be stated
imperatively and SHALL carry the reason it exists.

#### Scenario: A step is one a capable agent takes unprompted

- **WHEN** a published workflow step describes something the agent would do without being told
- **THEN** it does not appear, and only the part that would otherwise be got wrong survives as a rule

#### Scenario: A rule guards against a silent failure

- **WHEN** a delivery type is to be passed back and a familiar value would read as an equivalent of
  the one the server printed
- **THEN** a rule states that only a value the server printed is passed back, and gives the reason —
  that a substituted type silently changes how the order travels and nothing reports it

### Requirement: Failure modes that report success are named

The skill SHALL carry a section that names each way the MCP accepts bad input and answers with
success and no effect, or with a degraded result. Each entry SHALL give the observable symptom and
what it actually means.

The section SHALL name only failure modes the agent can still cause through a command the CLI
offers. Where the CLI has taken a field over and the agent no longer writes it, the failure mode
belonging to that field SHALL NOT be carried.

#### Scenario: A write reports success and changes nothing

- **WHEN** a product is removed from the cart and the cart is unchanged afterwards
- **THEN** an entry names that symptom and attributes it to an identifier the catalogue does not
  hold, rather than leaving the reader to retry

#### Scenario: A value is stored without being validated

- **WHEN** a promo code is accepted and no discount appears
- **THEN** an entry states that codes are stored without validation and that only the totals report
  the outcome

#### Scenario: A flag cannot be unset

- **WHEN** the confirmation that the buyer is old enough has been given, and the reader looks for the
  way to withdraw it
- **THEN** an entry states that the command that gives it is the only one there is, that the
  confirmation cannot be taken back, and that the absence of a command to clear it is not a defect of
  the CLI — so the confirmation is put to the person before it is given, not after

#### Scenario: A field that contradicts the order is accepted

- **WHEN** the address a cart carries could name a kind of address that the cart's delivery type
  rules out
- **THEN** the skill carries no entry for it, because the CLI builds the address itself and no
  command accepts one from the reader

#### Scenario: A failure mode belongs to a field the CLI now owns

- **WHEN** a failure mode can only be reached by writing a field that no command accepts any more
- **THEN** it does not appear in the skill, because the reader can neither cause it nor act on it

### Requirement: The skill does not contradict the CLI or itself

Every statement the skill makes about what the CLI does SHALL be true of the CLI as it stands, and
SHALL NOT be contradicted by another statement of the skill. A fact SHALL be stated once, in the
place a reader needs it: a rule about one command belongs to that command's entry, and the rules
section holds only what has no single command to belong to.

Specifically, the skill SHALL state that the cart is read afresh on every command and SHALL NOT
suggest that a change made elsewhere needs the background process restarted; SHALL state that a read
of the cart may repair a lapsed slot and that it changes nothing else about how the order travels;
SHALL state that a cart ordered away mid-session is reopened on the settings it
carried; SHALL NOT describe the shape of the address a cart carries nor which of its fields the CLI
fills, because no command takes an address; SHALL state that an identifier is passed back exactly as
it was printed and SHALL NOT carry any account of which identifier form a given command requires;
and SHALL state that no command takes a delivery context, because none does.

#### Scenario: A cart changed in the Silpo app

- **WHEN** the reader is told the user has just changed the cart on another device
- **THEN** the skill has established that the next command sees it, and offers no ritual to force it

#### Scenario: Reading the cart

- **WHEN** the reader prints the cart
- **THEN** the skill has established that a lapsed slot may be repaired in the course of it, and that
  the store, the delivery type and the address are left as they were

#### Scenario: A fact with one home

- **WHEN** a reader looks up how a command behaves
- **THEN** the command's own entry carries the rule, and the rules section does not repeat it

## ADDED Requirements

### Requirement: A line earns its place by changing what the agent does

A line SHALL appear in the skill only if removing it would change a command the agent issues, a value
it passes, or something it reports to the person. A line that fails that test SHALL NOT be in the
skill; where it is worth keeping at all, it belongs in the change's design document.

Design rationale, the history of the surface, justification of a decision already taken, and
reassurance that a behaviour is intended all fail the test on their own. They pass only where they
change the report the agent makes — an empty answer that must be reported as "nothing to worry
about" rather than as an error is a behaviour, not a reassurance.

This test SHALL be applied to the tail of a paragraph as strictly as to a whole section, because
rationale accumulates as tails of paragraphs rather than as removable blocks.

#### Scenario: A sentence explains why the surface is as it is

- **WHEN** a line explains the reasoning behind a command's design, or what it was before
- **THEN** it is not in the skill, and the rule it was justifying stands on its own as an imperative

#### Scenario: Rationale trails an operative sentence

- **WHEN** a paragraph opens with what to do and closes with why the CLI works that way
- **THEN** the opening survives and the closing does not, rather than the paragraph surviving whole
  because part of it earns its place

#### Scenario: A reassurance changes the report

- **WHEN** a command's ordinary result is an empty answer that a reader would otherwise report as a
  failure
- **THEN** the line saying so stays, because removing it would change what the agent tells the person

### Requirement: The skill states what is decided silently and what is asked

The skill SHALL state, for the command that fills the cart from a list, which decisions the CLI takes
on its own and which it puts back to the caller, and how one that is put back is answered.

It SHALL name each of the outcomes the command prints and what each means for the reader: the ones
resolved automatically are already in the cart and need no verification; the ones the CLI would not
choose between are not in the cart and are owed an answer; the ones carrying a warning are in the
cart and are the reader's to raise with the person; the ones that matched nothing are neither in the
cart nor recoverable by repeating the command.

It SHALL state that every outstanding question is answered in one further call, naming a chosen
candidate per term, and that the candidate is named by the identifier printed beside it, passed back
unchanged. It SHALL state that the further call carries the whole of the original list alongside the
choices, that an item the first call already wrote is not written a second time by it, and that a
quantity the reader stated on a term is carried by that term as it was first given rather than by the
choice that answers it. It SHALL state that the answer comes from the printed candidates — decided
by the agent where the person's request settles it, and put to the person where it does not — and
SHALL NOT direct the reader to search again for a term that was asked about.

It SHALL state that the automatically resolved items print names and prices and no identifiers,
because they are what the reader reports to the person.

#### Scenario: A list comes back with items in more than one state

- **WHEN** a list resolves into some items chosen automatically and some the CLI would not choose
  between
- **THEN** the skill has established which of them are in the cart and which are not, without the
  reader inspecting the cart to find out

#### Scenario: The outstanding questions are answered

- **WHEN** three terms came back with candidates and no choice made
- **THEN** the skill has established that all three are answered in one call, by naming a candidate
  per term with the identifier as printed, that the call repeats the whole original list beside those
  choices, and that the items already in the cart are not doubled by it

#### Scenario: A warning rides on an item that was added

- **WHEN** an item is resolved and carries a warning about a stored dietary restriction
- **THEN** the skill has established that the item is in the cart and that the warning is to be put
  to the person, not silently acted on

#### Scenario: A term matched nothing

- **WHEN** an item comes back as matching nothing
- **THEN** the skill has established that repeating the command changes nothing, and what the reader
  does instead

### Requirement: The skill is short enough to be read whole

The skill SHALL be short enough that an agent loading it reads all of it, and its length SHALL be a
consequence of the surface and of the rule that a line earns its place, not of a budget applied
afterwards.

It SHALL carry no section whose subject the CLI now decides for itself — which identifier form a
command takes, how a time is written out, or how a cart is opened step by step — and one entry per
leaf command the agent drives and no more.

The length SHALL be read off that count rather than asserted ahead of it: thirty entries, each a need
and the command that serves it, and the preamble, the rules, the outcomes of the command that fills
the cart and the failure modes carrying the rest. Where the count of entries changes, the length
follows it.

Each decision moved from the agent into the CLI SHALL make the skill shorter rather than longer: a
capability the CLI absorbs SHALL remove the prose that taught the agent to do it by hand, and SHALL
NOT add a section explaining that it now happens.

#### Scenario: The rewritten skill is measured

- **WHEN** the skill is measured against the one it replaces
- **THEN** it is on the order of 150 lines — about sixty of index, thirty entries at roughly two
  lines each, and the rest preamble, rules, outcomes and failure modes — under a third of the 497 it
  replaces, with the reduction accounted for by the three dead sections, by a command index that
  falls from forty-three entries to thirty under one counting rule, and by rationale removed

#### Scenario: A command is added to the CLI

- **WHEN** a new command the agent drives is added
- **THEN** the skill grows by one entry, and by nothing else

#### Scenario: The CLI absorbs another decision

- **WHEN** a decision the agent used to make moves into the CLI
- **THEN** the prose that taught the agent to make it is removed, and what replaces it is at most one
  line under what the CLI does on its own

## REMOVED Requirements

### Requirement: The skill states which identifier a tool takes

**Reason**: The CLI no longer passes identifiers through untouched. Every form a product carries is
held together in the index, the command that prints a product card takes a uuid, a slug or an
external product id alike, and the commands that write take the identifier the CLI itself printed.
There is no longer a mapping for the reader to carry, so a section stating which form each command
wants describes a burden that no longer exists and would be a table to keep in step with the surface
for no behavioural gain.

**Migration**: What survives moves into the requirement that the skill does not contradict the CLI or
itself, as two statements: an identifier is passed back exactly as it was printed, and no account is
given of which form a command requires. The rule that a machine handle is never read out to the user
is unaffected and stays as a rule.

### Requirement: A product is looked up by what the caller already holds

**Reason**: Choosing between a lookup and a search according to what the reader is holding is exactly
the decision this change moves into the CLI. A list of names is given to the command that fills the
cart, which resolves it against the index and the live catalogue; a handle in any form is given to
the command that prints a product card, which takes a uuid, a slug and an external product id alike.
The warning that a full product title matches nothing as a search term also lapses, because a title
from an order is now matched through normalisation rather than passed to a search verbatim.

**Migration**: The command that prints a product card and the one that searches each keep an entry of
their own in the index, stating the need each serves. The behaviour the requirement was protecting is
now the CLI's, and is covered by the list-resolution and product-index capabilities rather than by
skill prose.
