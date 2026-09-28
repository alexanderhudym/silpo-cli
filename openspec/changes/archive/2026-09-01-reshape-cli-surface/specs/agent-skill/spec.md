## MODIFIED Requirements

### Requirement: The cart-derived context is stated before the index

The skill SHALL state, ahead of the index, that the branch, delivery type and timeslot required by
much of the CLI come only from the active cart, and SHALL give the order of commands that retrieves
them. It SHALL distinguish what a read needs from what a write needs: revalidating the cart's
timeslot against the branch's slots SHALL be required before the timeslot is written to the cart or
an order is placed on it, and SHALL NOT be required to pass the timeslot to a command that only
reads. It SHALL NOT state that a given option is required by every command of a group;
which options a command takes is carried by that command's own entry.

#### Scenario: The agent needs a catalogue command first

- **WHEN** the reader reaches the index looking for a product search
- **THEN** the preamble has already established that the cart must be read first and how

#### Scenario: A command in the group takes fewer of the four

- **WHEN** a catalogue command requires the branch but not the delivery type
- **THEN** nothing ahead of the index has claimed otherwise, and its own entry is what the reader
  follows

#### Scenario: The cart holds a stale timeslot

- **WHEN** the timeslot stored on the cart has passed or is no longer offered, and the reader is
  about to write it back to the cart
- **THEN** the preamble has established that the slot listing is consulted first

#### Scenario: A read that only carries the slot along

- **WHEN** the reader is looking up products, categories or a past order, where the timeslot is
  a parameter of the query and nothing is written
- **THEN** the preamble has established that the cart's timeslot is used as it stands, because
  validating a slot that will not be booked buys nothing and costs a call

### Requirement: Failure modes that report success are named

The skill SHALL carry a section that names each way the MCP accepts bad input and answers with
success and no effect, or with a degraded result. Each entry SHALL give the observable symptom and
what it actually means. Where a field is stored without validation, the entry SHALL say that a value
contradicting the rest of the record is kept as given.

#### Scenario: A write reports success and changes nothing

- **WHEN** a product is added to the cart and the cart is unchanged afterwards
- **THEN** an entry names that symptom and attributes it to an identifier the catalogue does not
  hold, rather than leaving the reader to retry

#### Scenario: A flag cannot be unset

- **WHEN** an adult-content confirmation is set and cannot be cleared
- **THEN** an entry states that the flag is one-way and that the failure to clear it is not a
  defect of the CLI

#### Scenario: A field that contradicts the order is accepted

- **WHEN** the address written to a cart names a kind of address that the cart's delivery type
  rules out
- **THEN** an entry states that the value is stored as given and no warning is raised, so that a
  reader carrying fields across a rewrite knows which of them to correct

## ADDED Requirements

### Requirement: The skill names how to spend fewer steps

The skill SHALL state that independent commands may be issued in one shell invocation, and that a
write and the read that verifies it belong in the same invocation. It SHALL give this as a rule
about how the CLI is driven rather than as a walkthrough of any one task.

#### Scenario: Several reads that do not depend on each other

- **WHEN** the reader needs the profile, the saved addresses and the active cart
- **THEN** the skill has established that these travel in one invocation, because none of them
  needs the answer of another

#### Scenario: A write and its verification

- **WHEN** the reader adds products to the cart
- **THEN** the skill has established that re-reading the cart belongs in the same invocation, so
  that a write which reported success and changed nothing is caught in the step that made it

### Requirement: A product is looked up by what the caller already holds

The skill SHALL state which lookup fits which handle: a product the reader already has an
identifier for is read through the single-product command, and a product known only by name is
found through the search. It SHALL state that a full product title taken from an order or a
receipt is not a search term that matches.

#### Scenario: Identifiers in hand

- **WHEN** the reader is checking which lines of a past order are still available, and holds a
  local number for each
- **THEN** the skill has established that the single-product command is the lookup, not the search

#### Scenario: Only a name

- **WHEN** the reader has a shopping list written in words
- **THEN** the skill has established that the search takes them, several at a time

#### Scenario: A title used as a query

- **WHEN** a full title copied out of an order is put to the search
- **THEN** the skill has established that it will match nothing, and that the identifier beside
  it is the handle to use

### Requirement: The numbers the CLI issues are not shown to the user

The skill SHALL state that the local numbers the CLI issues are handles for its own commands and
carry no meaning outside this machine, and that an answer written for a person names a store, an
order or a product by what that person can recognise.

#### Scenario: Naming a store in an answer

- **WHEN** the reader tells the user which store the order will be collected from
- **THEN** the skill has established that the store is named by its address, not by the local
  number a listing issued

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
