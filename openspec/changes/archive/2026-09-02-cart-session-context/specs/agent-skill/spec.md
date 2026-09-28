## MODIFIED Requirements

### Requirement: The skill names how to spend fewer steps

The skill SHALL state that independent commands may be issued in one shell invocation, and that a
write and the read that verifies it belong in the same invocation. It SHALL keep the rule that
several products reach the cart through a single add, and SHALL NOT describe the cart as something
to be fetched before working with it. It SHALL give all of this as rules about how the CLI is driven
rather than as a walkthrough of any one task.

#### Scenario: Several reads that do not depend on each other

- **WHEN** the reader needs the profile, the saved addresses and the cart
- **THEN** the skill has established that these travel in one invocation, because none of them needs
  the answer of another

#### Scenario: A write and its verification

- **WHEN** the reader adds products to the cart
- **THEN** the skill has established that the write already carries the cart it produced, so that a
  write which reported success and changed nothing is caught without a second command

#### Scenario: Several products at once

- **WHEN** the reader has several products to put in the cart
- **THEN** the skill has established that they go in one call, not one call each

#### Scenario: Several lookups at once

- **WHEN** the reader has several product names to look up
- **THEN** the skill has established that a batch lookup answers them together

#### Scenario: No cart preamble to perform

- **WHEN** the reader is about to work with the cart
- **THEN** nothing in the skill asks for a preparatory call to find it

## ADDED Requirements

### Requirement: The implicit context is stated before the index

The skill SHALL state, ahead of the index, that the branch, delivery type and timeslot the CLI works
within come from the active cart and are supplied by the CLI itself, so that no command takes them
and none has to be fetched first. It SHALL state that a lapsed slot is repaired without being asked.
It SHALL state that no cart is invented where the account has none, name the reason the commands
report, and carry the instructions the reader follows in that case — what to ask the person, and
which commands resolve each thing the cart needs to be opened with. It SHALL NOT give an order of
commands for retrieving the context, because there is none to give, and SHALL NOT state that a given
option is required by every command of a group; which options a command takes is carried by that
command's own entry.

#### Scenario: The agent needs a catalogue command first

- **WHEN** the reader reaches the index looking for a product search
- **THEN** the preamble has already established that the command needs no context of its own

#### Scenario: The reader looks for the cart-reading step

- **WHEN** the reader looks for the sequence that retrieves the branch, delivery type and timeslot
- **THEN** there is none in the skill, because the CLI does it

#### Scenario: The cart holds a stale timeslot

- **WHEN** the timeslot stored on the cart has passed or is no longer offered
- **THEN** the preamble has established that the CLI replaces it before the call, and that the reader
  neither checks nor repairs it

#### Scenario: The account has no cart

- **WHEN** a command reports that the account has no shopping cart
- **THEN** the skill has already told the reader what to ask the person and which commands resolve
  the address, the delivery type, the branch and the slot the cart is opened with

#### Scenario: A command in the group takes fewer options

- **WHEN** a catalogue command takes an option another one in its group does not
- **THEN** nothing ahead of the index has claimed otherwise, and its own entry is what the reader
  follows


### Requirement: What the CLI does on its own is stated

The skill SHALL state the things the CLI does without being asked — repairing a lapsed timeslot and
reducing a quantity the branch cannot fill — so that the reader recognises the output rather than
treating it as an error, and does not repeat the work. It SHALL NOT claim that a cart is among them.

#### Scenario: The output reports a reduced quantity

- **WHEN** an add reports that a quantity was reduced to what the branch holds
- **THEN** the skill has established that the CLI did this, and that the reduced quantity is what is
  in the cart

#### Scenario: The output names an unfillable product

- **WHEN** an add reports a product the branch cannot fill at all
- **THEN** the skill has established that the line is still in the cart, that the CLI will not remove
  it, and that replacing or dropping it is the reader's decision to put to the user

#### Scenario: The reader looks for the verification step

- **WHEN** the reader has changed the cart and looks for the command that confirms the result
- **THEN** the skill has established that the write already printed it, and that reading the cart
  again buys nothing

## REMOVED Requirements

### Requirement: The cart-derived context is stated before the index

**Reason**: The order of commands this requirement mandates no longer exists — the CLI reads the cart
itself, and no command takes a branch, a delivery type or a timeslot. Its read-versus-write rule for
revalidating a slot is likewise gone: the CLI repairs a lapsed slot before any call, so there is
nothing for the reader to validate. Replaced by "The implicit context is stated before the index",
which states the absence rather than the procedure.

**Migration**: None for the reader. A skill page that walked through fetching the cart first should
delete that passage.

