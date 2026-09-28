## Purpose

Defines what the Claude Code plugin ships so an agent can drive the CLI without reading its source
or its help output: one skill whose entries answer a need with a command, opening with the rules that
govern the cart-derived context most catalogue and product commands require, and naming the failure
modes the MCP reports as success.

## ADDED Requirements

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

#### Scenario: The reader knows the goal but not the command

- **WHEN** the reader needs to find a replacement for a product that is out of stock
- **THEN** an entry states that need and gives the command, and the reader is not required to know
  which of the CLI's groups files it

#### Scenario: A heading is read on its own

- **WHEN** a section heading is read out of context
- **THEN** it names what the section covers as a plain noun phrase, rather than completing a sentence
  begun by another heading

#### Scenario: One command serves several needs

- **WHEN** a single command covers several distinct situations, such as changing a timeslot,
  applying a promo code and spending bonuses
- **THEN** each situation gets its own entry, and each gives that command with only the options the
  situation calls for

### Requirement: Command entries are literal and complete

Every command entry SHALL give the command in full, with each option it accepts written inline as a
name and a placeholder. An entry SHALL NOT abbreviate any part of the command, and SHALL NOT rely on
a legend, key or expansion defined elsewhere in the file. Required and optional options SHALL be
distinguishable.

#### Scenario: A command that requires the cart-derived context

- **WHEN** an entry gives a command that requires the branch, delivery type and timeslot
- **THEN** all four options appear in the entry itself, written as names and placeholders, and the
  entry can be copied and filled in without consulting another part of the file

#### Scenario: No worked examples

- **WHEN** an entry gives a command that takes an address, a product or a quantity
- **THEN** the value is written as a placeholder such as `<address>` or `<query>`, and no concrete
  value, real or invented, appears in its place

#### Scenario: Optional options are marked

- **WHEN** an entry gives a command with both required and optional options
- **THEN** the optional ones are visibly marked as optional and the required ones are not

### Requirement: The cart-derived context is stated before the index

The skill SHALL state, ahead of the index, that the branch, delivery type and timeslot required by
much of the CLI come only from the active cart, SHALL give the order of commands that retrieves
them, and SHALL state that the timeslot held by the cart is revalidated against the branch's slots
before it is used. It SHALL NOT state that a given option is required by every command of a group;
which options a command takes is carried by that command's own entry.

#### Scenario: The agent needs a catalogue command first

- **WHEN** the reader reaches the index looking for a product search
- **THEN** the preamble has already established that the cart must be read first and how

#### Scenario: A command in the group takes fewer of the four

- **WHEN** a catalogue command requires the branch but not the delivery type
- **THEN** nothing ahead of the index has claimed otherwise, and its own entry is what the reader
  follows

#### Scenario: The cart holds a stale timeslot

- **WHEN** the timeslot stored on the cart has passed or is no longer offered
- **THEN** the preamble has established that the slot listing is consulted before the cart's
  timeslot is passed to another command

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

#### Scenario: A write reports success and changes nothing

- **WHEN** a product is added to the cart and the cart is unchanged afterwards
- **THEN** an entry names that symptom and attributes it to an identifier the catalogue does not
  hold, rather than leaving the reader to retry

#### Scenario: A flag cannot be unset

- **WHEN** an adult-content confirmation is set and cannot be cleared
- **THEN** an entry states that the flag is one-way and that the failure to clear it is not a
  defect of the CLI

### Requirement: Rules, not walkthroughs

The skill SHALL carry as rules only what an agent would otherwise get wrong, and SHALL NOT carry
end-to-end walkthroughs of tasks a capable agent composes on its own. A rule SHALL be stated
imperatively and SHALL carry the reason it exists.

#### Scenario: A step is one a capable agent takes unprompted

- **WHEN** a published workflow step describes something the agent would do without being told
- **THEN** it does not appear, and only the part that would otherwise be got wrong survives as a rule

#### Scenario: A rule guards against a silent failure

- **WHEN** the cart holds a timeslot that has passed and the server accepts it without complaint
- **THEN** a rule makes revalidating the slot part of reading the cart, rather than leaving it to be
  inferred

### Requirement: The frontmatter is machine-readable

The skill's frontmatter SHALL parse under a strict YAML reader, SHALL declare a name matching the
skill's directory and a non-empty description, and the description SHALL stay within the host's
character limit.

#### Scenario: A description contains a colon

- **WHEN** a description would read naturally with a colon followed by a space
- **THEN** it is quoted or rewritten, because a strict reader takes it for a nested mapping and
  rejects the file

### Requirement: Every command is reachable from the skill

Each command the CLI offers SHALL appear in at least one entry of the index.

#### Scenario: A command exists but no situation calls for it

- **WHEN** a command has no obvious situation, such as inspecting the background session or the
  recorded token savings
- **THEN** it still appears under an entry, so that no command is reachable only by reading the
  CLI's own help

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
