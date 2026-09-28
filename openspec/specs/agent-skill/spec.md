# agent-skill Specification

## Purpose

Defines what the Claude Code plugin ships so an agent can drive the CLI without reading its source
or its help output: one skill whose entries answer a need with a command, opening with the rules that
govern the cart-derived context most catalogue and product commands require, and naming the failure
modes the MCP reports as success.

## Requirements

### Requirement: One skill

The plugin SHALL ship exactly one skill covering the whole CLI. It SHALL NOT ship a skill whose
purpose is to route to other skills, and SHALL NOT split the surface across per-category skills.

#### Scenario: The plugin is installed

- **WHEN** the plugin is installed and its skills are listed
- **THEN** exactly one skill is offered, and loading it puts the whole CLI surface in context

#### Scenario: A request spans several areas of the CLI

- **WHEN** a request needs the cart, product search and delivery slots at once
- **THEN** the one loaded skill answers all three, and no further skill is loaded

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

### Requirement: Authorization has a section of its own

The skill SHALL carry a section covering signing in, signing out, and finding out who is signed in.
No page the plugin ships SHALL present a command that reports the CLI's background process as an
authorization check.

#### Scenario: The reader asks whether the CLI is authorized

- **WHEN** the reader wants to know whether a token is stored and whose account it holds
- **THEN** the section names a command whose output distinguishes the two, and no page directs the
  reader to the background-process command, which reports the same state either way

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

### Requirement: Rules, not walkthroughs

The skill SHALL carry as rules only what an agent would otherwise get wrong, and SHALL NOT carry
end-to-end walkthroughs of tasks a capable agent composes on its own.

A rule SHALL take one of three forms: what to do in order to reach a stated end, what is never done,
and what always holds. It SHALL be stated imperatively and SHALL NOT carry the reason it exists.

A rule SHALL NOT guard against a mistake the agent has no reason to make. Where nothing in the
surface would lead the agent to a thing, the skill SHALL NOT forbid it.

#### Scenario: A step is one a capable agent takes unprompted

- **WHEN** a published workflow step describes something the agent would do without being told
- **THEN** it does not appear, and only the part that would otherwise be got wrong survives as a rule

#### Scenario: A rule guards against a silent failure

- **WHEN** a delivery type is to be passed back and a familiar value would read as an equivalent of
  the one the server printed
- **THEN** a rule states that only a value the server printed is passed back, and stops there

#### Scenario: A prohibition has nothing to prohibit

- **WHEN** a rule would forbid a thing the agent has no way and no reason to attempt
- **THEN** it is not in the skill, because the prohibition costs the reader attention and changes
  nothing the agent does

### Requirement: The frontmatter is machine-readable

The skill's frontmatter SHALL parse under a strict YAML reader, SHALL declare a name matching the
skill's directory and a non-empty description, and the description SHALL stay within the host's
character limit.

#### Scenario: A description contains a colon

- **WHEN** a description would read naturally with a colon followed by a space
- **THEN** it is quoted or rewritten, because a strict reader takes it for a nested mapping and
  rejects the file

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

### Requirement: No page the plugin ships names a command that does not exist

Every page the plugin ships — the skill and any command page beside it — SHALL name only commands
the CLI runs, with only the options and arguments those commands accept. This SHALL hold for
commands written in fenced code blocks as well as inline.

#### Scenario: A command page falls behind a rename

- **WHEN** a command page instructs the reader to run a command the CLI no longer has
- **THEN** it is reported against the page that carries it, rather than surfacing when the reader
  runs it

#### Scenario: A command is written inside a fenced block

- **WHEN** a page gives its command as a fenced block rather than an inline span
- **THEN** that command is checked exactly as an inline one is, so the fence is not a way around
  the check

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

### Requirement: The skill does not rank commands by cost

The skill SHALL NOT advise against a command on the grounds that it is expensive, and SHALL NOT
describe one command as costlier than another. Where a command is the one that answers a question,
the skill SHALL name it for that question without qualification.

#### Scenario: The command that answers the question

- **WHEN** the reader needs to locate a category and holds only its name
- **THEN** the skill names the lookup that answers that, and no warning about its cost stands
  beside it to be weighed against an alternative that does not answer it

#### Scenario: A cost the reader cannot act on

- **WHEN** an entry would describe a command as the costliest of its group
- **THEN** it does not, because the reader has no measure to weigh that against and avoids the
  command instead

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

### Requirement: The skill does not contradict the CLI or itself

Every statement the skill makes about what the CLI does SHALL be true of the CLI as it stands, and
SHALL NOT be contradicted by another statement of the skill. A fact SHALL be stated once, in the
place a reader needs it: a rule about one command belongs to that command's entry, and the rules
section holds only what has no single command to belong to.

Specifically, the skill SHALL state that the cart is read afresh on every command and SHALL NOT
suggest that a change made elsewhere needs the background process restarted; SHALL state that a read
of the cart may repair a lapsed slot and that it changes nothing else about how the order travels;
SHALL state that a cart ordered away mid-session is reopened on the settings it carried; SHALL NOT
describe the shape of the address a cart carries nor which of its fields the CLI fills; SHALL state
that an identifier is passed back exactly as it was printed; and SHALL state that no command takes a
delivery context.

Where a command refuses a name and takes only the identifier its own snapshot printed, the skill
SHALL say so in that command's entry. Elsewhere it SHALL NOT carry an account of which identifier
form a command requires.

The skill SHALL state that every write closes on the cart it produced, the command that fills the
cart from a list among them, and SHALL NOT carve that command out of the rule.

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

#### Scenario: A command refuses a name

- **WHEN** the reader changes the quantity of a cart line or takes a line out of the cart
- **THEN** that command's entry says the argument is the identifier the cart's own snapshot printed,
  because the command fails on a name

#### Scenario: The totals after a list is filled

- **WHEN** the reader fills the cart from a list and looks for the totals
- **THEN** they are in that command's own output, and no entry sends the reader to a second command
  for them

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

It SHALL state that an outcome that matched nothing is reported as a term not found at this branch,
and SHALL NOT let it be reported as a product that does not exist.

It SHALL state that every outstanding question is answered in one further call, naming a chosen
candidate per term, and that the candidate is named by the identifier printed beside it, passed back
unchanged. It SHALL state that the further call carries the whole of the original list alongside the
choices, that an item the first call already wrote is not written a second time by it, and that a
quantity the reader stated on a term is carried by that term as it was first given rather than by the
choice that answers it. It SHALL state that the answer comes from the printed candidates — decided
by the agent where the person's request settles it, and put to the person where it does not — and
SHALL NOT direct the reader to search again for a term that was asked about.

It SHALL state that the automatically resolved items print names and prices and no identifiers.

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
- **THEN** the skill has established that repeating the command changes nothing, that the term is
  reported as not found at this branch rather than as a product that does not exist, and what the
  reader does instead

### Requirement: The skill is short enough to be read whole

The skill SHALL be short enough that an agent loading it reads all of it, and its length SHALL be a
consequence of the surface and of the rule that a line earns its place, not of a budget applied
afterwards.

It SHALL carry no section whose subject the CLI now decides for itself, and one entry per leaf
command the agent drives and no more. A command entry SHALL be the need, the command, and the
instructions that entry owes the agent — never an account of the behaviour behind them.

A convention the agent has to hold in order to name an argument correctly is an instruction the
entry owes it, not an account of behaviour. The unit a quantity counts is such a convention: an
agent that does not hold it cannot write the number it means, and no wording of the command line
carries it. Stating it is therefore within the rule rather than an exception to it, and it SHALL
be stated where the argument is named rather than in a section of its own.

The length SHALL be read off that count rather than asserted ahead of it: thirty entries, the
context, the standing rules, the outcomes of the command that fills the cart, what is offered, what
is reported, and the writes that report success without effect. Where the count of entries changes,
the length follows it.

Each decision moved from the agent into the CLI SHALL make the skill shorter rather than longer: a
capability the CLI absorbs SHALL remove the prose that taught the agent to do it by hand, and SHALL
NOT add a section explaining that it now happens.

#### Scenario: The rewritten skill is measured

- **WHEN** the skill is measured against the one it replaces
- **THEN** it is shorter, and the reduction is accounted for by the removal of rationale rather than
  by the removal of an instruction the agent needs

#### Scenario: An entry is measured against its old self

- **WHEN** the entry for the product listing, the catalogue listing or the store listing is compared
  with the one it replaces
- **THEN** each instruction it carried survives in imperative form and nothing that explained the
  CLI's behaviour does

#### Scenario: A command is added to the CLI

- **WHEN** a new command the agent drives is added
- **THEN** the skill grows by one entry, and by nothing else

#### Scenario: The CLI absorbs another decision

- **WHEN** a decision the agent used to make moves into the CLI
- **THEN** the prose that taught the agent to make it is removed, and what replaces it is at most one
  line under what the CLI does on its own

#### Scenario: A convention is needed to name an argument

- **WHEN** an argument cannot be written correctly without a convention the command line does not
  carry
- **THEN** the convention is stated beside that argument, and it is not counted as an account of
  the behaviour behind the command

### Requirement: The skill states what a catalogue query should be

The catalogue entry SHALL make the agent write a name the shop uses rather than a description of a
need, and SHALL make it read an empty answer as an answer.

To that end it SHALL state that the text is a name — a category, a promotion or a set as the shop
calls it, or an approximation of one; that the titles matched are the shop's own Ukrainian and that
nothing is translated for the caller; that a text sharing no word with any title returns nothing
rather than the least bad match; and that a record returned for a text is not evidence that the text
was understood.

It SHALL state that naming a category prints its whole subtree, and that each kind is matched on its
own so that one kind's position in the answer says nothing against another's.

It SHALL NOT state why any of that is so. It SHALL NOT carry the matcher's own rules for handles,
spellings or transliterations. It SHALL NOT ask the agent to decide what kind of thing a name names
before naming it, and SHALL NOT promise that a wrong query is refused.

#### Scenario: The text is declared a name

- **WHEN** the reader has a need to express rather than a name
- **THEN** the entry has told them the text is a name

#### Scenario: The language is declared

- **WHEN** the reader is about to write a catalogue text in a language other than the catalogue's
- **THEN** the entry has told them the titles are the shop's own Ukrainian and that nothing is
  translated for them

#### Scenario: What the search matches is declared

- **WHEN** the reader is about to compose a catalogue text
- **THEN** the entry has told them the search matches the words the catalogue itself uses, so they
  write such a word rather than a description of what they want

#### Scenario: An empty answer is declared

- **WHEN** the reader's text shares no word with any title and the command returns nothing
- **THEN** the entry has already told them that is what such a text returns, so the empty answer is
  read as an answer

#### Scenario: A coincidence is not declared safe

- **WHEN** the reader writes a sentence and is given a record sharing one of its words
- **THEN** the entry has told them a returned record is not evidence the query was understood

#### Scenario: Ranking within a kind is declared

- **WHEN** the reader sees a category and a promotion in one answer
- **THEN** the entry has told them each kind was matched in its own right, so neither position means
  anything against the other

#### Scenario: The subtree rule is stated once

- **WHEN** the reader wants everything under a category
- **THEN** the entry has told them that naming the category is enough

#### Scenario: The printed depth is declared

- **WHEN** the reader sees a matched category with children
- **THEN** the entry has told them the whole subtree is printed, so the deepest printed row is the
  deepest row there is

#### Scenario: No classification is asked for

- **WHEN** the reader holds a name and does not know what kind of thing it names
- **THEN** nothing in the entry requires them to decide before asking

#### Scenario: The entry is read for an explanation

- **WHEN** the reader looks in the entry for why the matching behaves as it does
- **THEN** nothing answers, because every line of the entry is an instruction

### Requirement: The skill states what the catalogue listing answers and what it costs

The catalogue entry SHALL state what the listing returns with no text — the branch's promotions, its
whole hierarchy, then its sets, in that fixed order — and that the page size does not apply to it.

It SHALL state that with a text the page size trims each kind's own result, that there is no offset,
and that a record the matching did not keep is reached by narrowing the text or raising the page
size.

It SHALL state that every category carries the number of products it holds, and that this number is
the branch's own for the session's delivery type and time slot.

It SHALL state that a category holding nothing at this branch is neither printed nor nameable, and
that such a name is reported as not stocked here rather than as absent from the catalogue.

It SHALL NOT carry the size of the listing, the number of categories a branch holds, or any other
count measured at one branch on one day, and SHALL NOT explain why the listing is shaped as it is.

#### Scenario: The unbounded listing is declared

- **WHEN** the reader looks for what the catalogue command returns with no text
- **THEN** the entry says it is the promotions, then the whole hierarchy, then the sets, in that
  fixed order, and that the page size does not apply

#### Scenario: The order is declared

- **WHEN** the reader looks for where in the answer a promotion or a set will be
- **THEN** the entry names the order of the three groups, and states it as fixed

#### Scenario: The page size is declared a trim

- **WHEN** the reader wants a record the printed page did not reach
- **THEN** the entry has told them to narrow the text or raise the page size, and that no offset
  exists

#### Scenario: The pruning is declared

- **WHEN** the reader cannot find a category they expected
- **THEN** the entry has told them that a category holding nothing at this branch is neither printed
  nor nameable, and how that is reported to the person

#### Scenario: Counts are not carried

- **WHEN** the branch's catalogue grows or shrinks
- **THEN** no line of the skill has to change with it

### Requirement: The skill states what a store query should be

The store entry SHALL make the agent send a place rather than a sentence about a place. It SHALL
name what to leave out — politeness, proximity and question words — and SHALL name the forms the
query accepts, among them a settlement, an address, a coordinate pair, a district, a metro station, a
landmark, a branch identifier and a store code, without asking the agent to decide which of them it
holds.

It SHALL state that a settlement is written in the spelling the country uses now, and that another
language's name, a transliteration or a former name goes through the map and may resolve elsewhere.
It SHALL point the reader at the line the answer prints naming the places the stores came from, as
where that shows itself.

It SHALL state that the retailer's own name is sent with the rest of the query rather than stripped
from it, which is what the CLI does with it.

It SHALL state that the first result is the answer, and that a query mixing alphabets fails naming
the value, which is put to the person rather than guessed at.

These SHALL be stated in the store entry itself and SHALL NOT be gathered into a section of rules
elsewhere in the file. The entry SHALL NOT say why the CLI answers a query the way it does, and
SHALL NOT promise that a sentence is refused.

#### Scenario: The reader is told to send a place

- **WHEN** the reader looks up how to search for a store
- **THEN** the entry asks for the place itself rather than a sentence around it, and names
  politeness, proximity and question words as what to leave out

#### Scenario: The retailer's name is in the query

- **WHEN** the person names the shop as part of the place
- **THEN** the entry has told the reader to send it with the rest, and no rule elsewhere in the file
  contradicts that

#### Scenario: The reader is told which spelling of a settlement to send

- **WHEN** the reader holds a settlement's name in another language, a transliteration or a former
  name
- **THEN** the entry says to send the current Ukrainian name, and says that the other forms go
  through the map and may resolve elsewhere

#### Scenario: Where a mis-resolved place shows itself

- **WHEN** a settlement was sent in some other spelling
- **THEN** the entry has pointed the reader at the line naming the places the stores came from, as
  where the reader sees it resolved somewhere else

#### Scenario: The accepted forms are named

- **WHEN** the reader holds a district, a metro station or a landmark
- **THEN** the entry says the command takes it as it stands

#### Scenario: The reader is not asked what kind of place it is

- **WHEN** the reader holds a district, a metro station or a landmark rather than a street address
- **THEN** the entry asks for it in the same way as a street address, and nothing in the entry turns
  on which of them the reader holds

#### Scenario: A sentence is still answered

- **WHEN** the entry describes what to leave out of the query
- **THEN** it does not say the command rejects a sentence, because it does not

#### Scenario: A query resolves to nothing

- **WHEN** a query mixes alphabets and the command fails naming the value
- **THEN** the entry has told the reader to ask the person for the spelling rather than guess at one

#### Scenario: The contract is at the point of use

- **WHEN** the reader reads the store entry and nothing else
- **THEN** what to send is there, and no other section of the file has to be found for the entry to
  be acted on

### Requirement: What the CLI does on its own is stated, and nothing it keeps

The skill SHALL state the things the CLI does without being asked, so that the reader recognises the
output rather than treating it as an error, and does not repeat work that is already done. It SHALL
state each of these, and SHALL state each without the reason it happens:

- that every product named comes from a call made for the question that was asked;
- that a shopping list stated as free text is normalised, matched and resolved by the CLI, which
  writes the cart itself;
- that a destination stated as free text is resolved into the address, the delivery type, the branch
  and the slot, and written to the cart;
- that a lapsed timeslot is replaced before any call whose answer depends on stock or price, and
  that this replaces the slot alone and never the store, the delivery type or the address;
- that a quantity the branch cannot fill is reduced, and a product it cannot fill at all is named
  and left in the cart;
- that an item the branch can fill only in part is put to the reader rather than written short, and
  what the three answers to it are;
- that where more than one candidate is plausible the CLI prints them and stops rather than choosing,
  so a printed candidate list is answered rather than retried;
- that where a listing's single decisive match is out of stock at the branch, its alternatives are
  fetched and printed beneath it unasked, so they are answered from rather than searched for again.

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
- **THEN** the skill has established that the write already printed it

#### Scenario: Every term is searched

- **WHEN** a product the account buys every week is named in a list
- **THEN** the skill has established that it was searched like any other, and that the price beside
  it came from the call that printed it

#### Scenario: An item the branch can only partly fill

- **WHEN** a list asks for more of a product than the branch holds
- **THEN** the skill has established that the CLI asks rather than writing the line short, and names
  the three answers available

#### Scenario: The command prints candidates and stops

- **WHEN** a destination or a term matches more than one plausible candidate and nothing was written
- **THEN** the skill has established that the way forward is to answer it rather than to repeat the
  command

#### Scenario: The one match a listing found is out of stock

- **WHEN** a product listing prints alternatives beneath a match the branch has none of
- **THEN** the skill has established that they were fetched for the reader, so the reader chooses
  among them rather than running a further search

### Requirement: The skill states how selectors compose

The skill SHALL state the rule by which the product listing's selectors compose — that repeating one
kind unions, that different kinds intersect, and that a query is not a selector but the filter and
the ordering over what the selectors chose. The rule SHALL be stated once, where the listing is
described.

The skill SHALL name the option of each kind, and SHALL say which composition one repeated option
produces and which two options together produce.

The skill SHALL state that naming a category names its whole subtree, so that a reader does not name
a parent and its children together.

The skill SHALL state what orders a listing the CLI ranked: how many of the query's own probes
returned a product, then the shop's own position, then the smaller package where both records carry
a size of the same kind. It SHALL say that nothing about the reader enters the order — not what they
have bought, not what they have saved, not what is discounted.

The skill SHALL state that the sort options are honoured only over a single population of one kind
with no query. The CLI refuses them anywhere else and the call fails, so an agent that does not know
the limit spends a call discovering it.

The skill SHALL NOT carry any constant of the matcher, and SHALL NOT say why the kind is named by an
option rather than inferred from the handle.

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

#### Scenario: A sort is asked for over a query

- **WHEN** the reader wants a listing ordered by price and has also written a query
- **THEN** the entry has told them the sort is honoured only over a single population with no query,
  so the failing call is not made

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

### Requirement: The skill states what the agent offers the person

The skill SHALL state what the agent offers a person unasked, and SHALL state each offer over a line
the CLI already prints rather than over a field of the server's payload.

It SHALL state that where the cart a write printed carries a bonus balance available to it and
carries no line saying bonuses were already requested, the agent offers to spend them, and writes
them only once the person agrees. The offer SHALL ride with the report of the finished cart rather
than stand in place of it, so that the person is never left waiting on an answer for a cart that is
already done.

It SHALL state that a link that cart printed is handed back whole, and that where it printed two
links both are handed back.

It SHALL state that a budget the person named is held: the cart is filled as close to that budget as
the catalogue allows without passing it, the cart's own total is what the person pays, and a cart
whose total stands above the budget is never reported as ready. This SHALL hold whether the cart is
written or a list is only costed.

#### Scenario: A cart is finished with bonuses unspent

- **WHEN** the printed cart carries a bonus balance available to it and no line saying bonuses were
  requested
- **THEN** the skill has established that the agent offers them in the same report that hands the
  finished cart back, and spends them only on the person's word

#### Scenario: A list was written and the order is being finished

- **WHEN** a list has been turned into cart lines
- **THEN** the total, the bonus balance and the links are already in that command's own output, and
  the skill asks for no further read to reach them

#### Scenario: A budget was named and the cart exceeds it

- **WHEN** the person stated a budget and the printed total stands above it
- **THEN** the skill has established that the cart is reduced and re-read, and that it is not
  reported as ready while the total stands above the budget

#### Scenario: A budget was named and nothing is written

- **WHEN** the person asked for a costed list rather than a cart
- **THEN** the same budget rule holds, and the total is computed from the printed prices rather
  than estimated

#### Scenario: A command prints two links

- **WHEN** a command prints both links that finish an order
- **THEN** the skill has established that both reach the person, each whole

### Requirement: The skill names what never reaches the cart

The skill SHALL state that a plastic bag is never written to the cart, under whichever of the shop's
names it carries, and that an item naming one is dropped from a list without the person being asked
about it.

#### Scenario: A list names a bag

- **WHEN** a shopping list carries a plastic bag among its items
- **THEN** the skill has established that the item is dropped and the rest of the list is written,
  and that no question is put to the person about it

#### Scenario: A past order carries a bag

- **WHEN** the products of a previous order are put back into the cart
- **THEN** the skill has established that the bag among them does not travel with them

### Requirement: The skill states how a cart's own report is read

The skill SHALL state what a validations row is — a level, a type and a stable identifier, with the
values that produced it printed beneath it where the server sent any — and SHALL state that the
identifier is never read to a person. What the row means SHALL be said in the person's own words,
built from those values where they are there and from the identifier's own subject where they are
not.

It SHALL state that only a row at error level blocks checkout, and that a row at any other level
still reaches the person.

It SHALL state that no machine handle is read to a person — not an identifier, a slug, an external
id or a barcode. A product is named by its name, a store by its address, an order by its date.

It SHALL state how a product with no stock is described in a product listing: one printed as
unavailable at a price of zero is not sold at this branch and is never described as temporarily out
of stock, where a stock of zero beside a real price is out of stock now.

It SHALL state separately what the command that fills the cart means by the same word, that word
naming there a product the branch cannot supply at all, so that the two are not read as one.

#### Scenario: A row names the shop's minimum order

- **WHEN** the cart prints an error row carrying the shop's minimum order value
- **THEN** the skill has established that the person is told the minimum and the shortfall in words,
  and that the identifier itself is not read out

#### Scenario: A row below error level

- **WHEN** the cart prints a row that does not block checkout
- **THEN** the skill has established that it still reaches the person, and nothing in the skill says
  that only errors are worth reporting

#### Scenario: A row carries no values

- **WHEN** the cart prints a validations row with nothing beneath it
- **THEN** the skill has established what the agent says from the row alone, and the identifier is
  still not read out

#### Scenario: A saved product the branch does not carry

- **WHEN** a listing prints a product as unavailable at a price of zero
- **THEN** the skill has established that it is described as not sold at this branch, and not as
  temporarily out of stock

#### Scenario: The same word means something else while a list is filled

- **WHEN** the command that fills the cart names a product unavailable
- **THEN** the skill has established that it means the branch cannot supply that product at all, and
  the reader does not carry the listing's reading across to it

#### Scenario: A handle stands beside the thing it names

- **WHEN** an outcome prints an identifier beside a product's name
- **THEN** the skill has established that the identifier goes back to the CLI and the name goes to
  the person

### Requirement: The skill is grouped by what the agent is doing

The skill's sections SHALL be named for the work they cover — the context every command runs within,
the standing rules, the command index, filling a list, what is offered, what is reported, and the
writes that report success without effect. A section SHALL NOT exist because a requirement of this
specification produced it, and the requirements of this specification SHALL NOT be recoverable from
the skill's shape.

#### Scenario: The skill's sections are read as a list

- **WHEN** the section headings are read on their own
- **THEN** each names a piece of the work the agent does, and none names a requirement of this
  specification

#### Scenario: One requirement touches several sections

- **WHEN** a requirement of this specification governs both a command entry and a standing rule
- **THEN** it is stated in each place the agent needs it, and no section is created to hold it
  whole

### Requirement: The skill says where a food's composition is written down

The skill SHALL state that composition, allergens, nutrition and country of origin are carried only
by the product card, and that a plain search prints names and prices and none of them. It SHALL
state that a question turning on any of these is answered by one search asking for the cards of
every product at once, rather than by the card command one product at a time.

It SHALL say that such a question is never answered from the reader's own knowledge of what a food
usually contains. A reader that knows what goes into a biscuit will answer from that knowledge
unless told not to, and the answer will be fluent, plausible and unsourced — which is the failure
this rule exists to prevent, because the attributes differ between two products sitting beside each
other on the same shelf.

It SHALL further state that a card carrying no such attribute is not a card denying it: where the
line is absent the reader says so, rather than reporting the product free of what was asked about.

#### Scenario: A question about what is in a food

- **WHEN** the reader is asked which products contain an allergen, or for their nutrition or origin
- **THEN** the skill has established that the cards are read for every candidate in one call, and
  that the answer comes from what those cards printed

#### Scenario: A card that says nothing on the point

- **WHEN** a card carries no line for the attribute that was asked about
- **THEN** the skill has established that this is reported as unknown, not as an absence of the
  thing

#### Scenario: A food the reader already knows about

- **WHEN** the reader could answer from general knowledge of the food rather than from the card
- **THEN** the skill has established that it does not, because two products on the same shelf differ

### Requirement: The skill says a failed call tells the reader nothing about what was sent

The skill SHALL state that a call failing on the network — a timeout, a gateway error, a server that
stopped answering — says nothing about the shape of what was sent, and that the same call is repeated
once before anything about it is changed.

It SHALL state that a list is shortened only after a short one has failed too, and SHALL say
outright that one timeout is not evidence that a command cannot take a long list. A reader that
draws that conclusion splits one call into a dozen and spends the run doing it; two benchmark runs
lost roughly seventy steps between them to exactly this inference, each disproved inside its own
transcript by a short call timing out identically.

Where the call that failed was a write, the skill SHALL state that the cart is read before the call
is repeated, because a write that timed out may have reached the server and landed, and repeating it
blindly puts the same products in twice.

#### Scenario: A call that times out

- **WHEN** a command fails on the network
- **THEN** the skill has established that the same call is sent again unchanged before its shape is
  questioned

#### Scenario: A long list that timed out

- **WHEN** a call carrying many products times out
- **THEN** the skill has established that the length was not the cause, and that the list is split
  only after a short call has failed as well

#### Scenario: A write that timed out

- **WHEN** the call that failed was a write to the cart
- **THEN** the skill has established that the cart is read before the write is repeated

### Requirement: The skill says a rate limit is already waited out

The skill SHALL state that the CLI waits out a rate limit itself, so that one reaching the reader has
already been waited out and retried, and that sleeping in the shell and running the command again
will not clear it.

Without this the reader treats the message as an instruction to wait: one benchmark run slept 20,
60, 180, 120, 420 and 600 seconds in turn against a limit whose window was under two seconds, and the
run had to be abandoned. The waiting never helped, because the calls that spent the allowance were
inside the command it kept re-running.

#### Scenario: A rate limit that reaches the reader

- **WHEN** a command fails reporting a rate limit
- **THEN** the skill has established that waiting and repeating will not clear it, and that the
  reader says what is happening rather than sleeping

### Requirement: The skill states what a quantity on a list item counts

The skill SHALL state that a number on a list item counts the product's own step, and that a
weighted product's step is a mass rather than a piece. Without it the agent reads a count as a
count of things, which is the one reading the CLI cannot honour: no field of the catalogue says
what one carrot weighs, so a count against a weighted product is answered by the only unit the
branch sells it in.

The rule SHALL be stated as a convention the agent can invert, not as an estimate. An agent that
knows the step and the rule can work out before it calls what the call will buy, and name a
different number where that is not what it wants. An estimate of what a piece weighs could not be
inverted and would be wrong in a way the agent could not correct.

Its examples SHALL name what each one buys, and at least one SHALL be a count against a product
sold by weight. The examples the skill carried named only the writing of a quantity and not its
effect, so an agent reading them had no way to learn that a count against a weighted product is
not a count of things.

It SHALL state that a mass the step does not divide is raised to the next whole step, and that the
settled line says so.

#### Scenario: The skill names the step convention

- **WHEN** the skill describes how much of an item to buy
- **THEN** it states that a number counts the product's step, and that for a weighted product the
  step is a mass

#### Scenario: The skill shows a count against a weighted product

- **WHEN** the skill gives examples of naming a quantity
- **THEN** at least one names a count against a product sold by weight and says what it buys

#### Scenario: The skill states that a mass is raised to the step

- **WHEN** the skill describes naming a weight on a list item
- **THEN** it states that a weight the step does not divide is raised to the next whole step and
  that the line says so
