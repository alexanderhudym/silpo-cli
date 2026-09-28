## MODIFIED Requirements

### Requirement: A listing holding several kinds names the kind on every record

No listing of the CLI SHALL interleave records of more than one kind. The browse listing, which was
the only one that did, SHALL answer its three kinds as three groups in a fixed order, and the kind
SHALL be named once on the group rather than on every record it holds.

Grouping states what the per-record tag stated, at a cost that does not grow with the number of
records, and it settles the question the tag existed to answer before the reader reaches a record: a
category, a promotion and a set carry different fields and are used differently, and a reader who
knows which group they are in never has to infer a kind from the fields a record happens to carry.

It also removes what the tag made expressible. A sequence of tagged records can be ordered across
kinds, and an order across kinds is an order by a score computed over records that are not
alternatives to one another. Three groups cannot express such an order at all.

Because no listing interleaves kinds, no record SHALL carry a kind key, and the rule that hoisted a
shared kind into the `common` section SHALL have nothing left to hoist. A group's kind SHALL be
carried by the group's own heading, under the rule that already governs a field every record of a
group shares.

#### Scenario: Three kinds in one listing

- **WHEN** a command answers with categories, promotions and sets
- **THEN** each kind is printed as its own group, the group names the kind once, and no record carries
  a kind key

#### Scenario: Two records with the same title

- **WHEN** a category and a promotion carry the same title
- **THEN** the two are told apart by the group each stands in, without either record carrying a kind

#### Scenario: A listing narrowed to one kind

- **WHEN** a text matches records of only one kind
- **THEN** that kind's group is printed and the others are absent or empty, and no kind is hoisted
  into `common`, because the group already names it

#### Scenario: A listing of one kind by construction

- **WHEN** a listing is not the browse listing, so that the command that produced it already fixes
  what its records are
- **THEN** no record carries a kind key and none appears in `common`, because nothing was
  discriminated
