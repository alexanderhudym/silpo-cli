## ADDED Requirements

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

What the two rank SHALL be the same. For the same words, both SHALL draw the same population — the
catalogue's answer together with what the personal index holds — and rank it with the one ranker under
the one policy. The difference between them SHALL be what they do with the result and nothing else:
one prints the ranking, the other acts on it, taking the matches the policy settled automatically into
the cart and asking about the rest. A product one of them can name confidently SHALL NOT be a product
the other fails to find.

#### Scenario: The list is filled from the cart family

- **WHEN** a caller turns a shopping list into cart lines
- **THEN** the command is one of the cart's own, beside the commands that change and empty it

#### Scenario: One ranker, one corpus

- **WHEN** the same words are given to the fill and to the listing against the same branch and the
  same index
- **THEN** both drew the same population and ranked it with the one ranker under the one policy
- **AND** the product the listing raises first is the product the fill acts on, the two differing only
  in that one printed it and the other wrote it to the cart
