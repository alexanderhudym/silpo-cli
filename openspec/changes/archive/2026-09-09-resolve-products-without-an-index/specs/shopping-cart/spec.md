## MODIFIED Requirements

### Requirement: A shopping list is filled from the cart family

Turning a shopping list into cart lines SHALL be a command of the cart family, named for what it does
to the cart. It writes to the cart, it reports the cart it produced, and its outcome is a cart — so it
belongs beside the commands that change a line, empty the cart and set its delivery, rather than
standing at the top level as a family of one.

What it does with a list SHALL be unchanged by where it is named: the resolution, the outcomes it
sorts items into, and the way an unresolved item is answered are the list-resolution capability's, and
this requirement SHALL NOT restate them.

The command SHALL resolve products by the same ranker and the same policy as the product listing, so
that neither can drift into being the smarter path.

What the two rank SHALL be the same. For the same words against the same branch, both SHALL draw the
same population — the catalogue's answer to the same probes — and rank it with the one ranker under
the one policy. Neither SHALL be able to name a product the other fails to find.

Where they SHALL differ is in settling, which only one of them does. Ranking puts the candidates in
an order; settling picks one, and picking one requires separating candidates the order left level. The
fill therefore consults what the listing does not — the caller's own purchases and saved products,
under the list-resolution capability's rule — and only ever to choose among candidates the ranking has
already tied. That is why a term whose candidates are tied MAY be written to the cart as a product
other than the one the listing printed first, and it is the only way the two may diverge. Neither
SHALL consult anything the other cannot while ranking.

#### Scenario: The list is filled from the cart family

- **WHEN** a caller turns a shopping list into cart lines
- **THEN** the command is one of the cart's own, beside the commands that change and empty it

#### Scenario: One ranker, one corpus

- **WHEN** the same words are given to the fill and to the listing against the same branch
- **THEN** both drew the same population from the same probes and ranked it with the one ranker under
  the one policy
- **AND** where the ranking leaves one product clearly first, that product is the one the fill acts
  on, the two differing only in that one printed it and the other wrote it to the cart

#### Scenario: A tie the fill settles and the listing does not

- **WHEN** a term's best candidates are level, and one of them is a product the caller has bought
- **THEN** the listing prints them in the ranked order, unshaped by that purchase
- **AND** the fill writes the bought one, having had to choose where the listing did not

#### Scenario: Neither path remembers what the other saw

- **WHEN** a listing is run and then a fill is run for the same words
- **THEN** the fill draws its own answer from the catalogue and is neither faster nor better informed
  for the listing having run first
