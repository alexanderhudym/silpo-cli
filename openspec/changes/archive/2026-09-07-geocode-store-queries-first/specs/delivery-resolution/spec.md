## MODIFIED Requirements

### Requirement: Ambiguity prints the candidates and stops

Where any step of the chain has more than one plausible candidate and no rule separates them, the
CLI SHALL print the candidates and stop without writing.

It SHALL NOT take the first candidate of a listing. A store listing is not ordered by anything the
caller cares about.

That reason bounds the rule. It holds wherever the candidates come from the store listing, and it
holds wherever a candidate is being chosen in order to write it — a cart's destination, its branch,
its delivery type, its Nova Poshta office — because a value written on a guess is one the caller has
to discover and undo. It does not hold for a geocoded response, which the server returns in its own
order of relevance, read only to order an answer the CLI is about to print and write nowhere. A
ranking is not an ambiguity, and refusing to read one returns the caller a list to resolve by hand.

Where such a response is read **to write a value** — a cart's destination above all — a candidate
SHALL be taken only where it is clear which one is meant: where the response holds one, or where
exactly one of several matches the text the caller gave under the exact-match rule below. Where
several remain and nothing separates them, the candidates are printed and nothing is written. The
first SHALL NOT be taken for standing first, because a value written on a guess is one the caller has
to discover and undo.

Where such a response is read **to select stores for a listing**, no candidate SHALL be privileged by
its position either, and for a different reason: nothing is being written, so there is nothing to
refuse. The gazetteer orders by its own knowledge, which does not include where the stores are, and
the store listing is what says which candidates were real, so every candidate is matched against it
and what they find is taken together. The stores-and-delivery capability sets the terms of that
selection.

This applies to a destination text matching several saved addresses, to several branches serving a
point equally, and to a Nova Poshta name matching several offices.

An exact match is a rule that separates candidates. Where exactly one candidate's own address
string equals the text the caller gave, that candidate SHALL be taken, and the command SHALL NOT
stop. The comparison SHALL be case-insensitive and SHALL normalise surrounding and repeated
whitespace. For a geocoded candidate, whose own address string the server is free to spell
differently from how the caller wrote it — a street-type word abbreviated on one side and spelled
out on the other, a building-number prefix present on one side and absent on the other — the
comparison SHALL also tolerate that difference, so that a rewrite the caller did not choose and
could not predict does not turn an answer that was really unambiguous into a stop. Where none
matches even so, or more than one does, the ambiguity stands as above. A candidate carries no other
handle a caller could name back, so its own printed address string is the only one this rule reads,
and what is printed SHALL be exactly that string, so that a caller facing an ambiguity this rule did
not resolve can answer it by copying a candidate's address back verbatim.

Two stores can stand at the same address closely enough that no exact match, and no rewording, ever
tells them apart — the text a caller could copy back is identical for both. Where every candidate an
ambiguity prints carries an identifier a later call accepts back — a branch uuid `cart setup
--branch` takes — the printed block SHALL say, in one line, which option accepts it, so the caller
who cannot separate the candidates by address still has an answer.

#### Scenario: The destination matches two saved addresses

- **WHEN** the destination text matches two of the caller's saved addresses
- **THEN** both are printed with what distinguishes them, and the cart is not written

#### Scenario: One candidate's address matches the text exactly

- **WHEN** the destination text matches more than one candidate but equals, case-insensitively and
  whitespace-normalised, the own address string of exactly one of them
- **THEN** that candidate is taken and the cart is written, without printing the others

#### Scenario: The server rewrote the address the caller typed

- **WHEN** the destination text matches more than one geocoded candidate, and the server's own
  address string for exactly one of them differs from the text only in how a street-type word is
  abbreviated or in whether a building-number prefix is present
- **THEN** that candidate is taken and the cart is written, without printing the others

#### Scenario: Two stores share one address

- **WHEN** the destination text matches two stores whose printed address is the same string
- **THEN** both are printed with their own branch uuid, and the block names `cart setup --branch`
  as the option that takes one of those uuids back

#### Scenario: One branch clearly serves the point

- **WHEN** exactly one branch serves the destination for the chosen delivery type
- **THEN** it is selected without asking

#### Scenario: A cart destination geocodes to several candidates

- **WHEN** the destination text for a cart geocodes to several candidates and no rule separates them
- **THEN** the candidates are printed and the cart is not written, the narrowing above not reaching a
  candidate that is about to be written

#### Scenario: A ranking read to order an answer that is only printed

- **WHEN** the store listing's query geocodes to several candidates and no rule separates them
- **THEN** every candidate is matched against the store listing, no candidate is privileged by its
  position, nothing is written, and the answer names every place the stores came from
