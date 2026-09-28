## MODIFIED Requirements

### Requirement: The index holds identity, never state

An index record SHALL carry fields of two kinds, and SHALL NOT carry a third.

**Identity** — the fields that say which product this is: its `productId`, its `companyId`, its name,
its slug, its `externalId`, its parsed pack size and unit, and its parsed specification. It SHALL
also carry the caller's own relationship to it — how many times it was bought, when last, and whether
the caller has saved it.

**Static description** — the parts of a product's card that do not change: the attribute dictionary
the server supplies for it, and the unit the product is counted in. These describe the product rather
than its situation at a store, they are the same at every branch and in every slot, and re-reading
them costs a call that answers with what was answered before.

That dictionary is open rather than a fixed set of fields: composition, allergens, country, trade
mark and the nutritional figures are keys within it, spelled as the server spells them, and not every
product carries every key. The record SHALL keep whatever keys came with it and SHALL require none of
them.

**State**, which the index SHALL NOT hold: price, stock, promotion membership, and availability.
Those are the state of a product at a branch at a moment, they go stale in hours, and the cart write
already reports both `reduced` and `unfillable`. The call is the authority on state; the index is the
authority on identity and on what does not change.

Whether the caller has saved a product SHALL be recorded as such, and SHALL NOT be inferred from the
product having been seen. A saved product and a product that appeared once in a listing are different
facts about the caller's relationship to it, and only one of them is a choice the caller made.

The flag SHALL be written by every act that settles the fact, and not by the listing of favourites
alone: a write that saves a product SHALL set it, a write that unsaves one SHALL clear it, and a
reading of the saved products SHALL bring the record into line with what was read. A flag that only
a listing could set would leave a product the caller just saved unmarked until they happened to list
their favourites, and the signal would be missing exactly when it was most deliberate.

A record SHALL NOT carry a brand. No product payload the catalogue returns names one; a brand is part
of the product's name and is not separable from it.

A record MAY carry a category slug, and that slug SHALL be optional. It is present only where the
product entered the index through a listing that was already scoped to a category, and absent
wherever the product was first seen through an unscoped search, an order, or a favourite. Nothing
SHALL require it: it is never a filter, and its absence SHALL never keep a record out of the index or
out of a candidate set.

#### Scenario: A record is written from a listing that carried a price

- **WHEN** a product listing carrying a price and a stock count is folded into the index
- **THEN** the identifying fields are stored
- **AND** the price and the stock count are discarded rather than stored

#### Scenario: A resolved product is quoted back with a price

- **WHEN** a command prints a product the index resolved
- **THEN** the price it prints is the one the current call returned, never one the index held

#### Scenario: A card is read once

- **WHEN** a product's card is opened and its attributes stored
- **AND** those attributes are wanted again
- **THEN** they are answered from the record, and the card is not read a second time for them

#### Scenario: A card's changing half is not stored

- **WHEN** a product's card is folded into the index
- **THEN** its attributes and the unit it is counted in are stored
- **AND** its price, stock and availability are discarded, exactly as a listing's are

#### Scenario: A saved product is distinguishable from a seen one

- **WHEN** one product is folded in from the caller's saved products and another from a search
- **THEN** the record of the first says it is saved and the record of the second does not

#### Scenario: A product is saved

- **WHEN** the caller saves a product
- **THEN** its record says so from that moment, without the caller having to list their favourites
  first

#### Scenario: A product is unsaved

- **WHEN** the caller removes a product from the saved ones
- **THEN** the record stops saying it is saved, and the record itself is not discarded

#### Scenario: A record is written from an unscoped search

- **WHEN** a product is folded into the index from a search that named no category
- **THEN** the record is written with no category slug
- **AND** it is a candidate for later resolutions on the same terms as a record that carries one

#### Scenario: A record is written from a scoped listing

- **WHEN** a product is folded into the index from a listing scoped to a category
- **THEN** the record carries that category's slug
