## ADDED Requirements

### Requirement: A prefix match is bounded by the listing, not by a length

**No minimum term length SHALL decide whether a street term may match by prefix.** A length written
into the CLI is fitted to the listing as it stood when it was written, and the listing is not fixed:
it gains streets, loses them and respells them, so a bound that holds today is a bound nobody
re-measures tomorrow. Nothing is needed in its place, because what a prefix match survives on already
judges the right thing — see the selectivity condition below, which tests the word the prefix reached
rather than the fragment the query offered.

**A minimum term length SHALL continue to gate an edit allowance.** The two are not the same case. A
prefix match can be judged after the fact, by the selectivity of the word it landed on; an edit cannot
be judged at all, because a word reached by changing a letter is indistinguishable downstream from a
word the query contained. At the ratio the matcher uses, a term of three or four characters is allowed
one edit, and one edit in a word that short yields a different word rather than a misspelling of the
same one. The gate SHALL therefore stand, and its value SHALL be stated where it is set.

What a match survives on SHALL be relative to the listing being searched, so that it moves with the
data:

- A store SHALL be kept only where its score stands within a fixed share of the best score in the
  same answer.
- A store SHALL be kept only where it matched at least one term the listing does not nearly all
  carry. The term judged SHALL be the term as the listing holds it, not the fragment the query
  offered: where a query term reached a store by prefix, it is the store's own word that must be
  selective. A near-universal word — the equivalent of `вулиця` — therefore never answers on its own,
  whether it was written in full or reached by prefix.

Both conditions SHALL be evaluated against the listing that is being searched on that invocation.

#### Scenario: A short term is not refused a prefix match

- **WHEN** a street name the address lookup returned is short enough that a length rule would once
  have refused it prefix matching
- **THEN** it is matched by prefix like any other, and whether its matches survive is decided by the
  two relative conditions alone

#### Scenario: A short term is still refused an edit

- **WHEN** a street term of three or four characters is matched against the listing
- **THEN** it matches only words it is a prefix of or equal to, and not words reached by changing one
  of its letters, because at that length one changed letter is a different word

#### Scenario: A prefix is judged by the word it reached

- **WHEN** a query term matches a store's street by prefix rather than in full
- **THEN** the selectivity of the store's own word decides whether the store is kept, not the
  selectivity of the fragment the query carried

#### Scenario: A near-universal word still answers nothing

- **WHEN** a query's only match against the listing is a street-type word or another word almost every
  address carries
- **THEN** no store is returned by that match, the query falling through to the paths the capability
  already specifies

### Requirement: A history read stops at a fixed number of pages

Where the CLI reads the caller's own history to rank something — the till receipts behind the store
ranking among them — it SHALL stop after a fixed number of pages rather than reading to the end of
what the server offers. The bound SHALL be the same wherever a history is read, so that one rule
governs how deep the CLI goes and no caller has to learn two.

The bound SHALL be five pages. For till receipts it does not bind, the server returning at most
twenty orders for a date window however the window is widened; it is stated for the sake of one rule
rather than because that read is long.

A read stopped by the bound SHALL NOT be reported. What the bound protects is the time and the calls
a ranking costs, and a ranking signal that ran out of pages is weaker rather than wrong: the stores
the caller shops at most are the ones the earliest pages name.

#### Scenario: A receipt history within the bound

- **WHEN** the till receipts are read for the store ranking and the server's answer fits within five
  pages
- **THEN** the whole of it is read, as it was before the bound existed, and the ranking is unchanged

#### Scenario: A history longer than the bound

- **WHEN** a history read would run past five pages
- **THEN** it stops there, the ranking is computed from what was read, and the output says nothing
  about the pages that were not
