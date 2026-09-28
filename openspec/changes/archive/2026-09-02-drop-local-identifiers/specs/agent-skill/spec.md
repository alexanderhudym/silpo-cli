## ADDED Requirements

### Requirement: The skill states which identifier a tool takes

The skill SHALL state, for each entity the caller passes back, which form the commands accept, and
SHALL state it where a caller can act on it rather than in a section about identifiers in general.
It SHALL state that a product is named by its uuid for anything that writes to the cart or asks for
replacements, and by any of its uuid, slug or external product id for a product card and its
alternatives. It SHALL state that a category is named by its slug alone. It SHALL state that a
branch, a company, a settlement and an office are named by their uuids, and that the store code
printed beside a branch is for quoting to a person, not for passing back.

The skill SHALL NOT describe any numbering the CLI issues, because it issues none.

#### Scenario: A caller putting a product in the cart

- **WHEN** the reader has a product's uuid and slug from a listing and wants to add it to the cart
- **THEN** the skill has established that the uuid is what the write takes and that a slug is
  rejected

#### Scenario: A caller browsing a category

- **WHEN** the reader has a category from a listing or the tree
- **THEN** the skill has established that the slug is what every category command takes

#### Scenario: A caller naming a store to a person

- **WHEN** the reader reports which shop an order is on
- **THEN** the skill has established that the store is named by its address, and that its code and
  uuid are not for the user to read

### Requirement: The skill does not contradict the CLI or itself

Every statement the skill makes about what the CLI does SHALL be true of the CLI as it stands, and
SHALL NOT be contradicted by another statement of the skill. A fact SHALL be stated once, in the
place a reader needs it: a rule about one command belongs to that command's entry, and the rules
section holds only what has no single command to belong to.

Specifically, the skill SHALL state that the cart is read afresh on every command and SHALL NOT
suggest that a change made elsewhere needs the background process restarted; SHALL NOT describe the
cart snapshot as never changing the cart, the slot repair being a write; SHALL state that a cart
ordered away mid-session is reopened on the settings it carried; SHALL state that the address type is
chosen by the CLI, and only when a cart is opened; SHALL name every failure the identifier arguments
can produce, or none; and SHALL NOT claim that no command takes a delivery context while naming the
one that does.

#### Scenario: A cart changed in the Silpo app

- **WHEN** the reader is told the user has just changed the cart on another device
- **THEN** the skill has established that the next command sees it, and offers no ritual to force it

#### Scenario: Reading the cart

- **WHEN** the reader prints the cart
- **THEN** the skill has established that this can repair a lapsed slot, which is a write

#### Scenario: A fact with one home

- **WHEN** a reader looks up how a command behaves
- **THEN** the command's own entry carries the rule, and the rules section does not repeat it

## REMOVED Requirements

### Requirement: The numbers the CLI issues are not shown to the user

**Reason**: The CLI issues no numbers. What replaces it is narrower and still needed — a uuid and a
slug are no more meaningful to a person than a local number was — and it is stated in the new
requirement above, as part of naming a store by its address rather than by any handle.

**Migration**: None. The rule that a person hears a store's address, an order's date and a product's
name, never a machine handle, survives in the requirement above.

## MODIFIED Requirements

### Requirement: A product is looked up by what the caller already holds

The skill SHALL state which lookup fits which handle: a product the reader already has an
identifier for is read through the single-product command, and a product known only by name is
found through the search. It SHALL state that a full product title taken from an order or a
receipt is not a search term that matches.

#### Scenario: Identifiers in hand

- **WHEN** the reader is checking which lines of a past order are still available, and holds the
  uuid and the slug printed beside each
- **THEN** the skill has established that the single-product command is the lookup, not the search

#### Scenario: Only a name

- **WHEN** the reader has a shopping list written in words
- **THEN** the skill has established that the search takes them, several at a time

#### Scenario: A title used as a query

- **WHEN** a full title copied out of an order is put to the search
- **THEN** the skill has established that it will match nothing, and that the identifiers beside
  it are the handles to use
