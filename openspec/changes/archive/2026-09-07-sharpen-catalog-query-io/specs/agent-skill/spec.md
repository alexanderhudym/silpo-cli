## ADDED Requirements

### Requirement: The skill states what a catalogue query should be

The catalogue entry SHALL state that the command's text is a name, not a description of a need — the
name of a category, a promotion or a set as the shop calls it, or an approximation of one. The ranker
answers every input, so a sentence about what the caller wants to cook returns the least bad match for
its words rather than nothing, and the entry is the only place that expectation can be set.

It SHALL state that the text is ranked within each kind separately, so that a text matching a category
and a promotion returns both without one being ranked above the other.

It SHALL state that the deepest matching category wins, and that where a matched category has children
they are printed as where to go next — not because naming the parent would return less, since a
category's product listing already holds its whole subtree.

The entry SHALL NOT tell the agent to classify what it is naming before naming it. The kind is fixed by
the option in a product listing and by the grouping in the catalogue listing, so nothing asks the agent
to decide whether a word names a category or a promotion.

#### Scenario: The text is declared a name

- **WHEN** the reader has a need to express rather than a name
- **THEN** the entry has told them the text is a name, and that a sentence returns the least bad match
  for its words

#### Scenario: Ranking within a kind is declared

- **WHEN** the reader sees a category and a promotion in one answer
- **THEN** the entry has told them each kind was ranked in its own right, so neither position means
  anything against the other

#### Scenario: The subtree rule is stated once

- **WHEN** the reader wants everything under a category
- **THEN** the entry has told them that naming the category is enough

#### Scenario: No classification is asked for

- **WHEN** the reader holds a name and does not know what kind of thing it names
- **THEN** nothing in the entry requires them to decide before asking

### Requirement: The skill states what the catalogue listing answers and what it costs

The catalogue entry SHALL state that the listing without a text is the branch's whole hierarchy
followed by its promotions and its sets, and that the page size does not apply to it. A reader who takes
it for a bounded page will ask for it when a text would have served.

It SHALL state that a text ranks each kind's whole table and that the page size only trims the bottom
of each ranking — that there is no offset, and that a record the ranking did not keep cannot be reached
by asking for more.

It SHALL state that every category carries the number of products it holds, that this number is the
branch's own for the session's delivery type and time slot, and that a category holding nothing is not
printed and cannot be named at all. A reader that does not know the catalogue is pruned may look for a
category that was dropped and conclude the catalogue lacks it, rather than that this branch does.

The entry SHALL NOT carry the size of the listing, the number of categories a branch holds, or any
other count measured at one branch on one day. Those are measurements that justified the design, and
they go stale without any line of the skill changing.

#### Scenario: The unbounded listing is declared

- **WHEN** the reader looks for what the catalogue command returns with no text
- **THEN** the entry says it is the whole hierarchy with the promotions and sets after it, and that the
  page size does not apply

#### Scenario: The page size is declared a trim

- **WHEN** the reader wants a record the printed page did not reach
- **THEN** the entry has told them to narrow the text or raise the page size, and that no offset exists

#### Scenario: The pruning is declared

- **WHEN** the reader cannot find a category they expected
- **THEN** the entry has told them that a category holding nothing at this branch is neither printed
  nor nameable

#### Scenario: Counts are not carried

- **WHEN** the branch's catalogue grows or shrinks
- **THEN** no line of the skill has to change with it

## MODIFIED Requirements

### Requirement: The skill states how selectors compose and what a reason row means

The skill SHALL state the rule by which the product listing's selectors compose — that repeating one
kind unions, that different kinds intersect, and that a query is not a selector but the filter and the
ordering over what the selectors chose. The rule SHALL be stated once, where the listing is described,
and SHALL NOT be left to be inferred from the options standing beside one another.

Because the catalogue population is named by one option per kind rather than by one option taking a
handle of any kind, the skill SHALL name each of those options and SHALL say that one of them repeated
unions while two of them together intersect. It SHALL say why the kind is named rather than inferred: a
handle can belong to two kinds at once, so the option is what settles which was meant.

The skill SHALL also state that naming a category names its whole subtree, so that a reader does not
name a parent and its children together believing the parent alone would return less.

The skill SHALL also state what the reason row on a raised record means, and SHALL say plainly that the
ordering is partial: it prefers what the caller has bought and saved, and it prefers what carries a
promotion. A reader that does not know the order is shaped cannot correct for it, and the row is the
only place the shaping is visible.

The skill SHALL NOT state the weights, the thresholds or the fraction the promotion boost applies
within. Those are constants of the ranker; a reader cannot act on them, and a skill that carries them
goes stale the first time they are tuned.

#### Scenario: The composition rule is stated once

- **WHEN** the reader looks for what happens when two selectors are given together
- **THEN** the rule is stated at the listing's entry, and no other entry restates it

#### Scenario: The options of each kind are named

- **WHEN** the reader looks for how to narrow a listing to a part of the catalogue
- **THEN** the entry names the option of each kind and says which composition each produces

#### Scenario: The ordering is declared partial

- **WHEN** the reader reads what the listing returns
- **THEN** the skill says the order prefers bought, saved and discounted products, and names the row
  that says which of those raised a given record

#### Scenario: Constants are not carried

- **WHEN** the weights or thresholds of the ranker change
- **THEN** no line of the skill has to change with them
