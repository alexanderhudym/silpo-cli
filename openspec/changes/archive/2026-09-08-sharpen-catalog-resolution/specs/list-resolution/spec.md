## MODIFIED Requirements

### Requirement: Candidates are ranked lexically over the product name

Ranking SHALL be lexical and SHALL score one field only: the product's name. The score SHALL be a
BM25 score over character trigrams of that name, computed for the term as written and for every
Ukrainian equivalent the dictionary expanded it into.

There SHALL be one matcher per corpus, and every command that reaches that corpus SHALL use it. The
shopping list and the product listing SHALL be answered by the one product matcher, over the same
corpus, the same lexical scoring and the same signals, so that a change to how products are matched
changes both at once and neither can drift into being the smarter path. What differs between them is
what they do with the ranking — one lists, the other decides — and nothing else.

Where a domain holds several corpora that are not alternatives to one another, each SHALL carry its
own matcher rather than one matcher serving them all. The catalogue is such a domain: a category, a
promotion and a curated set are read from different calls, carry different fields and are published
under different handles, so one index over all three would fix a single field set and a single
configuration for three corpora. That is the same defect as one ranker serving the products and the
catalogue alike, at a smaller scale, and it is refused for the same reason.

A matcher SHALL NOT be shared across domains whose text is not of the same kind. Trigrams over a
product name are a match on fragments, which is right for a corpus where a brand, a weight and a
package all sit inside one string; the same scoring over a corpus of short catalogue titles was
measured to answer a value naming nothing with the least bad fragment overlap — 136 of 249 pruned
category slugs resolved to auto onto an unrelated category, and no threshold separated them, because
the overlap is real and of the same kind as a genuine one. Sharing a matcher is therefore a property
of the corpus, not a virtue in itself, and each of the catalogue's kinds SHALL carry its own.

There SHALL be no weighting across fields, because there are no other fields: the catalogue names no
brand and no category on a product. The brand is nevertheless matched, because it sits inside the
name — `Молоко ультрапастеризоване Яготинське 2,5% тетра 950г` carries `Яготинське` in the only field
there is — and trigrams over the name reach it. What is lost is not the brand as a matchable string
but the brand as a field of its own, which cannot be weighted because it does not exist.

Further signals SHALL adjust the lexical score:

- the caller's own history SHALL raise a candidate in proportion to how often and how recently it was
  bought;
- a product the caller has saved SHALL be raised, and SHALL be raised by more than a product the
  caller has merely been shown, saving being a choice and seeing not;
- a promotion SHALL raise a candidate under the rule stated separately for it;
- presence at the cart's current branch SHALL raise it slightly.

Where a record happens to carry a category slug and that slug matches the scope the caller named, the
candidate MAY be raised by a weak boost. That boost SHALL NOT be part of the core formula: a record
without a category slug SHALL be ranked and SHALL be eligible for every outcome, and the boost SHALL
never be large enough to lift a weaker name match over a stronger one.

The product matcher SHALL be indifferent to what its records describe beyond an identifier and a
name. What a record holds beyond those SHALL be the caller's concern rather than the matcher's, the
live state of a product included: where the caller holds a price or an availability, it travels with
the record it belongs to and is never read from or written to the index.

How many candidates a matcher returns SHALL be the caller's to say, and SHALL NOT be fixed inside it.
How many a question offers is a different number from how many a listing prints, and one figure
serving both would either make a question unreadable or make a listing shorter than the page that was
asked for. A matcher SHALL return what cleared its relevance floor, in order, and each caller SHALL
take what it needs.

Whatever matcher produced a ranking, the outcome SHALL follow the one policy stated below — the same
four outcomes, the same asymmetry, the same refusal to use a least bad match. That is a requirement on
the policy and not on the code that carries it: a domain settles its own outcome in its own module,
as the store path already does, and shared wording is what keeps them one policy rather than a shared
function each domain has to be bent to fit.

**A matcher SHALL return a ranking and nothing more.** What a caller does with that ranking — deciding
between auto, ask and miss, or listing it, or printing it — belongs to the caller and SHALL NOT be
carried by the module that matched. A resolver that decides an outcome cannot be used by a command
that only wants the list, and one that renders text cannot be used by a command that prints a
different shape; both make the matching reusable in one place and dead everywhere else.

**What MAY be shared between corpora is the mechanism of searching, filtering and ranking, and nothing
else.** A generic index that takes the fields it is given, a generic rule for keeping what matched and
dropping what did not, a generic ordering by relevance — these carry no knowledge of any corpus and
may be written once. The fields, the outcome policy and the output SHALL NOT travel with them: the
fields belong to the kind, and the other two belong to the command.

#### Scenario: History separates two equal lexical matches

- **WHEN** two candidates score alike on the text
- **AND** one has been bought before
- **THEN** the bought one ranks first

#### Scenario: A saved product outranks a seen one

- **WHEN** two candidates score alike on the text and neither has been bought
- **AND** one of them is saved by the caller
- **THEN** the saved one ranks first

#### Scenario: A brand written in the term matches inside the name

- **WHEN** the item is `молоко яготинське`
- **THEN** candidates whose name contains `Яготинське` outrank candidates whose name does not
- **AND** no field other than the name was consulted to reach that order

#### Scenario: The listing and the resolution agree

- **WHEN** the same term is ranked for a product listing and for a shopping list, against the same
  branch and the same index
- **THEN** both were given the same records, the catalogue's answer together with what the index
  holds
- **AND** the order is the same, both having been produced by the one product matcher

#### Scenario: A listing and a question take different amounts

- **WHEN** a listing asks for thirty ranked records and a question is built from the same ranking
- **THEN** the listing is given thirty where thirty cleared the floor, and the question offers the
  smaller number of options a question offers

#### Scenario: A corpus that is not products

- **WHEN** a record of the catalogue is named, as the text of the listing or as the population of a
  product search
- **THEN** the catalogue's own matcher scores it, and the same policy settles the outcome

#### Scenario: One domain, every command

- **WHEN** the same catalogue value is given to the listing and to a product search's population
  option
- **THEN** both reach it by the same matcher, no command of the domain carrying a matching rule of
  its own

#### Scenario: A record with no category is not disadvantaged

- **WHEN** two candidates match the name equally well and only one carries a category slug
- **THEN** both are ranked and both remain candidates
- **AND** the category boost alone does not decide between them where the caller named no scope

### Requirement: A resolution is auto, ask, warn or miss

Every item SHALL resolve into exactly one of four outcomes:

- **auto** — the CLI chose, and adds it to the cart without asking;
- **ask** — candidates exist and none is safe to choose; they are printed for the caller to pick;
- **warn** — a choice was made, and something about it needs saying;
- **miss** — nothing matched, and the caller is told so.

An item SHALL resolve to **auto** only when all of these hold: the top candidate is strong enough to
trust; it leads the second candidate by a relative margin; and every specification the item named is
matched by it.

"Strong enough to trust" SHALL NOT be an absolute score compared against a constant that is shared
between corpora. The score is a BM25 score, and its inverse-document-frequency term follows the size
of the corpus it was computed over, so the same constant means different things to corpora of
different sizes. Measured across the catalogue's own three corpora, the worst value that names
nothing scored 160.01 against a 761-record corpus while the weakest value that genuinely names a
record scored 157.93 against a 17-record one — an inversion of 2.08 points between a wrong answer and
a right one. Within each corpus the two were cleanly separated. A single constant was being asked to
compare quantities that are not comparable, and the codebase's answer had been a second constant,
seventy-five times lower, for the smaller corpora.

Every judgement of strength SHALL therefore be scale-free: it SHALL NOT consult how many records the
corpus holds, and it SHALL hold the same for a corpus of seventeen records and one of a thousand. A
ratio between two scores of one search is scale-free; an absolute score is not, and neither is a count
divided by the size of the corpus. Where one matcher serves one domain and one corpus, an absolute
threshold measured over that corpus and stated beside itself SHALL be permitted, because it is then
not being asked to compare anything.

A matcher that has no absolute score to test SHALL simply not apply one. It SHALL NOT be routed
through a gate built for a corpus that does have one, and no option SHALL be widened to carry the
absence as a value: a domain whose judgement is scale-free has nothing to hand such a gate.

A **miss** SHALL be reachable for a value that names nothing. A matcher that answers every input with
its least bad match cannot be trusted to produce one, so the matcher SHALL be built such that a value
naming nothing matches nothing wherever it can be, and the policy SHALL catch what reaches it anyway.
A candidate that stands alone only because nothing better exists SHALL NOT resolve to auto.

A lone candidate SHALL be permitted to resolve to auto. The margin has nothing to compare, so what
carries the decision is that the matcher returned this record and no other for the value.

The policy SHALL NOT be asked to tell a name from a description of a need. A matcher that matches
words returns a record for a sentence sharing one word with it, and no threshold separates that from a
short name genuinely matched: the difference is in what the text means, not in how it scored. That
judgement belongs to whoever writes the query, and `agent-skill` states the rule they need — the
search matches the words the catalogue itself uses. Building the judgement into the policy would take
either a semantic model, which this project has deferred on its own measurement, or a hand-made rule
about which words count.

#### Scenario: A confident, previously bought match

- **WHEN** the top candidate clears both thresholds, matches the specification, and is in the
  caller's history
- **THEN** the item resolves to auto and is written to the cart

#### Scenario: Two close candidates

- **WHEN** the top two candidates are within the relative margin of each other
- **THEN** the item resolves to ask, and both are printed

#### Scenario: A value naming nothing

- **WHEN** a value names no record of the corpus it was matched against
- **THEN** the matcher returns no candidate for it, or the outcome is miss or ask, and never auto

#### Scenario: Two corpora of different sizes

- **WHEN** the same judgement of strength is applied to a corpus of seventeen records and to a corpus
  of a thousand
- **THEN** a value naming nothing fails in both, and a value naming a record resolves in both, neither
  outcome following from how many records the corpus holds

#### Scenario: A corpus grows

- **WHEN** records that the value does not name are added to a corpus and the same value is matched
  against it again
- **THEN** the strength judgement reaches the same verdict, no operand of it having been a count of the
  corpus

#### Scenario: A corpus of one

- **WHEN** a value is matched against a corpus holding a single record it names
- **THEN** that record is returned and may resolve, no judgement having been expressed as a share of a
  corpus that small

#### Scenario: The only record a value could name

- **WHEN** a value matches exactly one record
- **THEN** the outcome may be auto, the margin having nothing to compare and the strength judgement
  having carried the decision alone

#### Scenario: A matcher with no absolute score

- **WHEN** a matcher's own conditions have already decided what a candidate is worth
- **THEN** it reaches its outcome without an absolute score test, and no threshold belonging to another
  corpus is applied in place of the one it does not have

### Requirement: The thresholds are asymmetric

A wrong silent choice costs more than a question, because the caller discovers it at the till. The
thresholds SHALL be set to favour asking, and the rate of wrong auto resolutions SHALL be the
measure the thresholds are tuned against.

That rate SHALL be measured rather than assumed, over a corpus whose right answers are known
independently of the matcher, and the measurement SHALL be recorded in the repository, naming the
module whose constants it justifies and the branch, delivery type and slot it was taken at. It SHALL
NOT be required to sit in the source: the source carries no explanatory prose, so a requirement to
state it there is a requirement to break another rule, and a separate record — as the store
path's constants already have — is what makes a threshold checkable.
A threshold defended by argument alone is a threshold nobody can tell is wrong: measured over the
catalogue's own categories, the corpus where the right answer is known because the record was
deliberately excluded, 54.6% of such values resolved to auto — a majority of silent wrong choices,
under thresholds whose stated purpose was to favour asking.

The measurement SHALL cover every corpus the matcher being changed serves, and SHALL cover every
corpus a matcher being removed from serves too. A matcher tuned on one corpus and unmeasured on the
others has been tuned for one caller at the expense of callers nobody looked at; a matcher a corpus
departs from SHALL be shown to answer its remaining callers exactly as it did before.

#### Scenario: A borderline score

- **WHEN** the top candidate's score sits at the threshold
- **THEN** the item resolves to ask rather than auto

#### Scenario: The rate is known

- **WHEN** the thresholds are set or changed
- **THEN** the rate of wrong auto resolutions is measured over a corpus whose right answers are known,
  and recorded in the repository against the module the thresholds belong to

#### Scenario: Every corpus is measured

- **WHEN** a matcher's rules are changed for one corpus's sake
- **THEN** the rate is measured for the other corpora it serves too, and a cost to one of them is
  visible before the change is taken

#### Scenario: A corpus leaves a matcher

- **WHEN** a corpus stops being answered by a matcher other corpora still use
- **THEN** the rate is measured for those corpora before and after, and shown unchanged
