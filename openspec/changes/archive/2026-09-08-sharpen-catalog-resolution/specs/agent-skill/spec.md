## MODIFIED Requirements

### Requirement: The skill states what a catalogue query should be

The catalogue entry SHALL state that the command's text is a name, not a description of a need — the
name of a category, a promotion or a set as the shop calls it, or an approximation of one.

It SHALL state the language a catalogue text is written in. The tables matched are the shop's own
Ukrainian titles and no equivalents are substituted for what the caller wrote, so a text written in
another language reaches whatever its own words happen to reach and usually reaches nothing. This is
the one thing the reader can act on that the CLI cannot do for them: a table of equivalents cannot be
completed, and a reader who is told the rule can follow it, where a reader relying on a partial table
cannot tell which of their words it covers.

It SHALL state that a text whose words the catalogue does not carry returns nothing rather than the
least bad match. Matching is over the words of a title, so a text sharing no word with any title
returns an empty answer, and a reader who expects a fallback will read that empty answer as a failure
of the command.

**It SHALL state what the search matches: the words the catalogue itself uses, and nothing else.** The
matching is lexical — it finds a record whose title carries the caller's word, or a word beginning with
it — and it makes no judgement about what the caller meant. This is the entry's single most useful
line, because it is the one thing the reader can act on that the CLI cannot do for them.

It SHALL therefore state that a query is built from words the catalogue would use, and that a sentence
describing a need is not one. A sentence usually shares a word with some record by coincidence, so it
returns that record rather than nothing, and the CLI cannot tell the coincidence from a real name — a
reader who writes «хочу купити подарунок» is answered on the word «подарунок» alone. A reader who is
told this writes «подарунки» and gets the group they wanted; a reader who is not takes a coincidence
for an answer.

The entry SHALL NOT promise that a wrong query is refused. Nothing in the CLI reasons about meaning,
and saying otherwise would be a guarantee the reader would rely on.

It SHALL state that a handle the CLI printed — a slug or a code — is answered by an exact lookup taken
before anything is matched.

It SHALL state what a **part** of a handle reaches, per kind, because the kinds differ. A category's
own handle is a transliteration of its title and its words are indexed as one of that record's
spellings, so part of a category's handle usually does reach it. A promotion's code and a set's slug
are not transliterations of their titles and are not indexed, so part of one reaches nothing. The
entry SHALL NOT state the rule for handles in general, there being no such rule: stated generally it
is wrong for one kind whichever way it is written.

It SHALL state that the text is matched within each kind separately, so that a text matching a
category and a promotion returns both without one being ranked above the other.

It SHALL state that the deepest matching category wins, and that where a matched category has children
its whole subtree is printed beneath it — not because naming the parent would return less, since a
category's product listing already holds its whole subtree, but so that the reader can see where the
catalogue ends rather than infer it from where the printing stopped.

The entry SHALL NOT tell the agent to classify what it is naming before naming it. The kind is fixed by
the option in a product listing and by the grouping in the catalogue listing, so nothing asks the agent
to decide whether a word names a category or a promotion.

#### Scenario: The text is declared a name

- **WHEN** the reader has a need to express rather than a name
- **THEN** the entry has told them the text is a name

#### Scenario: The language is declared

- **WHEN** the reader is about to write a catalogue text in a language other than the catalogue's
- **THEN** the entry has told them which language the titles are written in and that nothing is
  translated for them

#### Scenario: An empty answer is declared

- **WHEN** the reader's text shares no word with any title and the command returns nothing
- **THEN** the entry has already told them that is what such a text returns, so the empty answer is
  read as an answer

#### Scenario: What the search matches is declared

- **WHEN** the reader is about to compose a catalogue text
- **THEN** the entry has told them the search matches the words the catalogue itself uses, so they
  write such a word rather than a description of what they want

#### Scenario: A coincidence is not declared safe

- **WHEN** the reader writes a sentence and is given a record sharing one of its words
- **THEN** the entry has told them the CLI makes no judgement about meaning, so a returned record is
  not evidence that the query was understood

#### Scenario: Ranking within a kind is declared

- **WHEN** the reader sees a category and a promotion in one answer
- **THEN** the entry has told them each kind was matched in its own right, so neither position means
  anything against the other

#### Scenario: The subtree rule is stated once

- **WHEN** the reader wants everything under a category
- **THEN** the entry has told them that naming the category is enough

#### Scenario: The printed depth is declared

- **WHEN** the reader sees a matched category with children and wonders whether the catalogue goes
  deeper
- **THEN** the entry has told them the whole subtree is printed, so the deepest printed row is the
  deepest row there is

#### Scenario: No classification is asked for

- **WHEN** the reader holds a name and does not know what kind of thing it names
- **THEN** nothing in the entry requires them to decide before asking

### Requirement: The skill states what the catalogue listing answers and what it costs

The catalogue entry SHALL state that the listing without a text is the branch's promotions, then its
whole hierarchy, then its sets, and that the page size does not apply to it. A reader who takes it for
a bounded page will ask for it when a text would have served.

It SHALL state the order in which the groups are printed, because the hierarchy is long enough that a
reader who expects it first will take the promotions for part of it. The order SHALL be stated as what
it is — fixed — rather than as an observation about a particular branch's listing.

It SHALL state that a text matches each kind's whole table and that the page size only trims the bottom
of each result — that there is no offset, and that a record the matching did not keep cannot be reached
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
- **THEN** the entry says it is the promotions, then the whole hierarchy, then the sets, and that the
  page size does not apply

#### Scenario: The order is declared

- **WHEN** the reader looks for where in the answer a promotion or a set will be
- **THEN** the entry names the order of the three groups, and states it as fixed

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
