## MODIFIED Requirements

### Requirement: Promotions and sets

The CLI SHALL list the promotions currently running in the session's branch within its delivery
context, and the curated product sets that branch offers, within the same command as the categories
rather than as commands of their own. Each SHALL be usable as the population of a product listing by
the handle its kind is taken by: a promotion by its code, a set by its slug.

The three SHALL NOT be merged into one sequence. A category, a promotion and a set are read from
different calls, carry different fields and answer different questions, and interleaving them by a
score computed across all three orders things that are not alternatives to one another. They SHALL be
printed as three groups in a fixed order — **the promotions, then the hierarchy, then the sets** —
each group naming its kind once.

The promotions SHALL lead. A promotion is the only one of the three that ends: it runs for a period
and stops, so it is the group a caller most needs to see before it is gone. The hierarchy is the
longest group by an order of magnitude — measured, a listing with no text runs to some 860 lines, of
which the promotions and the sets together are the last hundred — and a group placed after it is not
read. The sets follow the hierarchy because they are the least time-bound of the three and the
smallest claim on the caller's attention.

The order SHALL be fixed rather than following the size of any group on the day. A listing whose
sections move as the branch's catalogue changes cannot be read by habit, and the reason the
promotions lead is what they are, not how many of them there are this week.

A promotion carries a product count, and a promotion covering nothing SHALL be dropped on the same
rule as a category. A set carries no count, so nothing can be tested for it and every set SHALL be
printed.

#### Scenario: Promotions

- **WHEN** the user lists what the store offers to browse
- **THEN** the promotions active for the session's context appear as their own group, first, before
  the hierarchy

#### Scenario: Product sets

- **WHEN** the user lists what the store offers to browse
- **THEN** the curated sets for the session's branch appear as their own group, after the hierarchy

#### Scenario: The tree holds categories alone

- **WHEN** the hierarchy is printed
- **THEN** only categories stand in it, because a promotion and a set have no place in a tree

#### Scenario: Three groups, not one order

- **WHEN** a text matches categories, promotions and sets alike
- **THEN** each kind is matched within itself and printed as its own group, and no score orders a
  category against a promotion

#### Scenario: The order does not follow the day's counts

- **WHEN** the branch runs more promotions than it offers sets, or fewer
- **THEN** the groups stand in the same order either way, the order being a property of the kinds
  rather than of their sizes

### Requirement: Categories found by name

The listing SHALL take an optional text and match each kind against it **within that kind**, over the
whole of that kind's table rather than one page of it, so that a record is found wherever it sits.

**Each kind SHALL carry its own matching**: its own index, its own indexed fields and its own
configuration. A category's title, a promotion's name and a curated set's name are not the same kind
of text, and what identifies a record of one kind may not identify a record of another — a category is
published under a handle that transliterates its title, and a promotion is published under a code that
does not. One matching forced across the three would fix one field set and one configuration for three
corpora, which is the same mistake as one ranker serving both the products and the catalogue, only
smaller.

**Each kind's matching SHALL answer with the records of that kind most relevant to the value, most
relevant first, and SHALL do nothing else with them.** It SHALL be callable against a table of that
kind alone. It SHALL NOT decide whether the caller may use the top record without asking, and it SHALL
NOT render anything: a listing prints a page of the ranking, a product search decides between one
record and a question, and a matching that had already chosen or already printed could serve only one
of them. What the three kinds MAY share is the mechanism of searching, filtering and ranking — an index
over the fields it is handed, and an ordering by relevance — and not the fields, the outcome or the
output.

The rules below are stated for a kind's matching. Where a kind's records carry a form its callers hold
— a handle the shop publishes, a title in another script — that kind indexes it; where they do not,
that kind carries no such field, and no kind gains a field because another kind has one.

Matching SHALL be over the **words** of a record's title, not over its character fragments and not by
containment. A word carries a boundary and a fragment does not: measured over the branch's own
tables, character-trigram scoring answered `granat-4794` with «Пет-Нат (Pet-Nat)» on the fragment
`nat`, and answered 136 of 249 values naming nothing with a confident wrong category. Under word
matching those same values match nothing at all, `granat` being a prefix of nothing the title holds.

A word SHALL match a title's word that **begins** with it, as well as one equal to it, so that a text a
caller stopped short still reaches what it names — measured, `Перш` reaches «Перші страви» and `Чайн`
reaches «Чайні набори та асорті». It SHALL NOT match a word's middle: measured, matching a substring
anywhere costs five of the 761 kept titles their own record and lets two more values naming nothing
resolve, and it skews the scoring so that an ordinary query reaches a worse first candidate. The cost
of the narrower rule is that a text beginning inside a word — the stem of a prefixed word, say —
reaches nothing, and the skill is where the caller is told to write the word the catalogue uses.

No minimum length SHALL be required of a word before it matches by prefix. A minimum is a number
fitted to the tables of one branch on one day, and those tables change without notice; a caller who
wrote two characters of a word has still written the beginning of that word, and a rule that refuses
them is a rule tuned to a snapshot. Words SHALL be combined permissively, so that a text naming a
record by part of its title reaches it.

What dropping the minimum widens is how many records a short word reaches, and that SHALL be bounded
where it matters rather than at the match. A record is used without asking only where every word of
the value is accounted for by it, and the page size trims the printed page, so a word many records
carry produces a question rather than a silent choice. Widening the match therefore costs questions,
not wrong answers, which is the direction the resolution policy asks for.

Matching SHALL NOT be approximate within a word. Measured, allowing an edit distance costs two of the
761 kept titles their own record and lets five more values that name nothing resolve, so it is worse
in both directions at once.

What the matching returns SHALL be bounded by nothing but the matching itself and the page size.
Measured, a relative floor taken as a fraction of the best score changes no outcome and no candidate
count at any value between a tenth and a half, because a permissive word match returns only records
that carried a word and their scores sit close together. A constant that never changes an answer SHALL
NOT be carried.

The matching is lexical and SHALL NOT be asked to tell a name from a description of a need. A sentence
sharing a word with a record reaches that record like any other text, and where it is the only such
record nothing stands against it — measured, `хочу купити подарунок` reaches «Солодкі подарунки для
дітей» on one word of three. Separating that from a genuine name is a judgement about meaning, which
this matching does not make and SHALL NOT pretend to: the alternatives are a semantic model, which the
project has deferred on its own measurement, and a hand-made rule about which words count, which is a
guess of the same kind as inspecting a value's shape. The caller is told instead, by the skill, that
the search matches the words the catalogue itself uses.

No condition of the matching SHALL be expressed as a share of the table's size. Such a rule is
meaningless where the table is small — on a table of one record every term is carried by all of it —
and it makes an outcome depend on how many records were present, which the policy forbids. Measured
over the branch's live tables, the store path's discriminating-term condition changed no result on the
catalogue and removed every candidate at the sizes the tests are built from; it is therefore not
carried over. What bounds a word many records carry is the page size and the margin.

Every number the matching carries SHALL be measured against the catalogue's own tables and recorded in
the repository. None is inherited from another domain's measurement: the store path arrived at its own
values over addresses, and an address is not a category title. A matching that carries no number of
its own has nothing to record, and no number SHALL be introduced so that there is something to state.

**Where a kind's handle is a transliteration of its title, a record of that kind SHALL be matched under
three spellings of its own name**: its title as the shop wrote it, its own handle split on its hyphens,
and its title transliterated. This is the category's case. A caller writing Latin reaches nothing under
a Ukrainian title alone — measured, `ryba`, `moloko` and `kuriachi iaitsia` return no candidate — and
half a handle is a dead end even though the whole handle is what the CLI printed. A kind whose handle
carries no such spelling SHALL NOT index one for the sake of resembling this kind.

The second and third SHALL both be carried, because they are different conventions and neither
contains the other: the shop writes `г` as `g`, a word-initial `я` as `ia` and an apostrophe as a
hyphen, while a transliteration standard writes `h`, `ya` and no apostrophe at all. Measured, the
handle spelling reaches `kuriachi iaitsia` and `gigiiena` where the transliterated one does not, and
the transliterated one reaches `kuriachi yaitsia` and `hihiiena` where the handle spelling does not.
**Both spellings of each SHALL be indexed**, so that a caller need not know which convention they are
reproducing.

**A record SHALL be used without asking only where every word of the value is accounted for by it.**
The extra spellings widen what matches, and a handle the branch's pruning dropped is itself a Latin
phrase that meets those spellings on their own ground: measured, without this rule 60 of 249 pruned
handles reach a kept record silently, and with it 15. This is a test of a spelling being fully
accounted for and SHALL NOT be read as a judgement about meaning — a value of two words that matched
one of them has not been answered.

Those 15 SHALL be accepted rather than chased. They are pruned records reaching a kept relative, and
telling that from a wrong answer is a judgement about meaning the matching does not make. A pruned
record itself SHALL remain unreachable; what may be reached in its place is a record the branch does
stock.

The exact handle SHALL be probed before anything is matched. Measured, a real slug matches nothing of
its own title under word matching — `ryba-4430` and `kava-chai-4700` both return no candidate — so a
caller naming a record by the handle the CLI itself printed is answered by an exact lookup or not at
all.

The text SHALL NOT be expanded by the product path's Russian-to-Ukrainian dictionary, which it has
never been. The catalogue's tables carry the shop's own Ukrainian titles; a hand-written table of
equivalents cannot be completed, and a caller cannot tell which of their words it covers. What a
Russian text reaches is therefore whatever its own words reach, and the language to write a text in is
stated by the skill rather than guessed at by the CLI.

A matching SHALL NOT be taken across kinds. A category and a promotion are not alternatives to one
another, and a score computed over both orders them by nothing the caller can act on.

Where the text matches a category and one of its descendants together, the deepest SHALL be
preferred. A caller who writes the name of a thing is asking for that thing, and the parent that
contains it is a broader answer to a narrower question.

**Depth SHALL NOT outrank a fuller match.** Where the ancestor accounts for every word of the value
and the descendant does not, the ancestor SHALL be preferred, depth deciding only between records the
value has reached equally well. A descendant that carried one word of a two-word value has not
answered the value at all, and preferring it because it sits lower would hand the caller a record its
own text does not name — measured, that is how an exact title came to be silently replaced by an
unrelated category. Where neither accounts for every word, or both do, the deeper one SHALL be
preferred as above.

Where a category the matching kept carries children, **its whole subtree SHALL be printed within that
category's record**, to whatever depth the subtree runs, each level standing under the one it belongs
to. One level is not enough: a reader shown a category's children and nothing else cannot tell whether
those children are the bottom of the catalogue or a floor above it, and will conclude the catalogue
ends where the printing stopped. Printing the subtree answers that question by showing it rather than
by asserting it.

This remains navigation and not a repair of coverage: a listing drawn from a parent already holds its
whole subtree, so the printed depth changes what the reader knows and not what the parent returns.

The page size SHALL bound the number of matched records per kind and SHALL NOT bound the subtrees
printed beneath them. A subtree cut at a page size would reintroduce the ambiguity the printing exists
to remove.

Where no text was given, nothing SHALL be matched and no page size SHALL apply. The answer SHALL be
the promotions, then the hierarchy in full, then the sets.

#### Scenario: A category found wherever it sits

- **WHEN** the user gives a text matching a category deep in the hierarchy
- **THEN** that category is found, because the matching covers the whole table rather than one page of
  it

#### Scenario: Case is not part of the match

- **WHEN** the text and a record's title differ only in letter case
- **THEN** the record matches

#### Scenario: A text stopped short of the word

- **WHEN** the text is the beginning of a word a title carries
- **THEN** that record matches, the word having been matched by prefix

#### Scenario: A text naming nothing

- **WHEN** the text shares no word and no word-beginning with any title of the kind
- **THEN** no candidate is returned at all, and the command reports that nothing matched

#### Scenario: A sentence describing a need

- **WHEN** the text is a sentence describing a need rather than a name
- **THEN** it is matched on its own words like any other text, the CLI having made no judgement about
  what kind of text it is

#### Scenario: A word many records carry

- **WHEN** a text matches a word many records of the table carry
- **THEN** every record carrying it is kept and the page size trims the printed page, none of them
  having been dropped for how common the word is, and none of them chosen without asking

#### Scenario: The same rule on two table sizes

- **WHEN** the same text is matched against a table of one record, a table of seventeen and one of
  several hundred
- **THEN** it returns the record it names in each, nothing in the matching having consulted how many
  records the table holds

#### Scenario: A text of one or two characters

- **WHEN** the text is the beginning of a title's word, however short
- **THEN** it matches every record whose title carries a word beginning with it, no length having been
  required of it
- **AND** where that is many records, they are offered rather than one of them chosen

#### Scenario: A text beginning inside a word

- **WHEN** the text is the middle or the end of a word a title carries, rather than its beginning
- **THEN** it does not match that title, matching being by prefix and not by substring

#### Scenario: A handle the CLI printed

- **WHEN** a record is named by the exact slug or code the CLI itself printed for it
- **THEN** the exact lookup answers it before any matching is attempted

#### Scenario: Part of a handle

- **WHEN** a record is named by some of the words of its handle rather than the whole of it
- **THEN** that record is matched, its handle's words being one of the spellings it is indexed under

#### Scenario: A Latin spelling in the other convention

- **WHEN** a record is named in a transliteration that differs from its handle's — `г` written `h`
  where the handle writes `g`, or an apostrophe dropped where the handle keeps a hyphen
- **THEN** that record is still matched, both conventions being indexed

#### Scenario: A value of several words matching on one

- **WHEN** a value of several words is matched by a record that accounts for only one of them
- **THEN** that record is offered rather than chosen, the value not having been accounted for

#### Scenario: A pruned record's handle reaching a stocked relative

- **WHEN** a handle the branch's pruning dropped shares its words with a record the branch does stock
- **THEN** the stocked record may answer, and the pruned record itself is never reached

#### Scenario: A Russian text

- **WHEN** the text is written in Russian
- **THEN** it reaches whatever its own words reach, no dictionary having been consulted

#### Scenario: The deepest match wins

- **WHEN** a text matches a category and a category standing beneath it, both reaching it equally well
- **THEN** the deeper one is ranked first

#### Scenario: A fuller match outranks a deeper one

- **WHEN** a text matches a category on every word it carries, and matches a category standing beneath
  it on only some of them
- **THEN** the ancestor is ranked first, depth not having been asked to decide between records the text
  reached unequally

#### Scenario: A name written approximately

- **WHEN** the text names a record without reproducing its title exactly, sharing a word or the
  beginning of one with it
- **THEN** that record is printed, ranked above the records of its kind that match the text less well

#### Scenario: A matched parent shows where to go next

- **WHEN** the matching keeps a category that has children holding products
- **THEN** those children are printed within its record, named by slug, title and count, and their own
  children beneath them, to the depth the subtree runs

#### Scenario: A subtree deeper than one level

- **WHEN** a matched category's child itself has children
- **THEN** those grandchildren are printed too, so that no reader can take the printed bottom for the
  catalogue's bottom

#### Scenario: The page size does not cut a subtree

- **WHEN** a matched category's subtree holds more records than the page size
- **THEN** the whole subtree is printed, the page size having bounded how many records matched rather
  than how deep each one is shown

#### Scenario: The filter reaches all three kinds

- **WHEN** a text matches a category, a promotion and a set
- **THEN** all three are printed, each within its own group, and none is ordered against another

#### Scenario: Nothing matches

- **WHEN** no record of any kind matches the text
- **THEN** the command succeeds and reports that nothing matched, because a search that found nothing
  is an answer

#### Scenario: A search with no text

- **WHEN** the user runs the listing without giving a text
- **THEN** the promotions are printed, then the whole hierarchy, then the sets, and no page size cuts
  any of them

### Requirement: A scope is reachable by its name

Wherever a record of the catalogue is named — as the text of the listing, or as the population of a
product search — the kind SHALL be known before the name is resolved, and resolution SHALL be over
that kind's table alone. In a product search the option the caller used names the kind; in the listing
each kind is matched in its own right. No resolution SHALL be taken across kinds, so a name can never
be ambiguous between a category and a promotion.

Each kind SHALL accept every form a caller may hold for it: a category by its title, its slug or its
identifier; a promotion by its title or its code; a set by its title or its slug.

An identifier SHALL be matched **within the CLI's own table** and SHALL NOT be forwarded. Measured, the
category call accepts a slug alone: an identifier returns not-found, as does the numeric tail of a
slug. The slug is therefore the only form that leaves the CLI, whatever form arrived.

A slug and a code SHALL be answered by an exact lookup taken before any matching. This is not an
optimisation: measured, a slug does not match the words of its own title, so a handle the CLI printed
is reachable by exact lookup or not at all.

A title SHALL be resolved by the catalogue's own matcher rather than by exact comparison, and settled
by the same policy that settles a product. Where one record stands clearly above the rest it SHALL be
used without asking. Where the best candidates stand too close to separate, **or where the best is too
weak to trust**, the CLI SHALL print all of them with their handles and, for a category, their paths,
and stop. Only where nothing matches at all SHALL the command fail naming the value. The least bad
candidate SHALL NOT be used silently.

The resolution of a catalogue name SHALL be the same in every command that takes one. The listing's
text and a product search's population option SHALL reach a record by the same matcher, the same
exact-handle probe and the same settling policy, so that a value that resolves in one resolves in the
other and neither command carries a rule of its own.

A category the branch stocks nothing under is not in the table, so naming it SHALL fail as any unknown
name does. Its slug SHALL fail for that reason and SHALL NOT be refused for the shape it was written
in.

The tables matched SHALL be read from the server on each invocation. There is no copy on disk to read
them from.

**Each kind SHALL read what it needs itself, and a command SHALL read only the kinds it names.** A
product search given a category reads categories and SHALL NOT read the promotions, the sets or
anything else no option asked for; a product search given a promotion reads promotions alone. Reading
all three because one was named spends calls on tables nothing will look at, and it makes a kind's
matching unusable except through a reader that fetches its siblings too. A command that does need all
three — the listing — SHALL issue their reads together rather than in turn, the three being
independent of one another.

This puts the dependency the right way round: a kind is self-sufficient, and the catalogue is what a
command assembles by asking the three kinds at once. Nothing SHALL sit above the three kinds fetching
on their behalf.

This is what removes the two-step errand. A caller who knows a part of the catalogue by name had to
find its handle first and carry it into a second command; the handle was never the thing being asked
about.

#### Scenario: A category listed by its name

- **WHEN** the caller asks for the products of a category, naming it by its title
- **THEN** the title is resolved against the categories alone and its products are listed, in one
  command

#### Scenario: A scope named twice costs one reading

- **WHEN** two commands in turn name a record of the same branch
- **THEN** each reads the tables it needs from the server, in one wave with its other reads, because
  no copy is kept between them

#### Scenario: One kind named, one kind read

- **WHEN** a product search names a category and names no promotion and no set
- **THEN** only the categories are read, and no call is made for the promotions or the sets

#### Scenario: Three kinds needed at once

- **WHEN** the listing needs all three kinds
- **THEN** their reads are issued together rather than one after another

#### Scenario: A category named by its identifier

- **WHEN** the caller names a category by its identifier
- **THEN** the CLI finds it in the table it holds and uses that category's slug in every call it makes

#### Scenario: A slug is answered before matching

- **WHEN** the caller names a category by its exact slug
- **THEN** the exact lookup answers it, no matching having been attempted on it

#### Scenario: One value, two commands

- **WHEN** the same title is given to the listing's text and to a product search's category option
- **THEN** both reach the same record, having used the same probe, the same matcher and the same
  settling policy

#### Scenario: A name two scopes carry

- **WHEN** a value is carried by both a promotion and a set
- **THEN** no ambiguity arises, because the option the caller used has already fixed which kind is
  being resolved

#### Scenario: A name two categories carry

- **WHEN** a name matches two categories carrying the same title too close to separate
- **THEN** both are printed with their handles and their paths, and the command stops

#### Scenario: A name nothing carries strongly

- **WHEN** a name's best match within its kind is too weak to trust
- **THEN** the candidates are printed and the command stops, rather than the highest-scoring record
  being used

#### Scenario: A name nothing carries

- **WHEN** a name matches nothing of its kind at the branch
- **THEN** the command fails saying so, rather than falling back to a listing of everything

#### Scenario: A pruned category's slug

- **WHEN** the caller names a category the branch stocks nothing under, by the slug it carries
  elsewhere
- **THEN** the command fails because the table holds no such record, and not because of how the value
  was written

### Requirement: Category listings state their own shape

Each of the three kinds SHALL be printed in the shape of what it is, and no kind SHALL be given a
field or an empty group to make it resemble another. A record SHALL be named by the one handle its
kind is taken by — a category by its slug, a promotion by its code, a set by its slug — and by no
server identifier.

Every category printed SHALL carry the number of products it holds, because that number is what the
caller is choosing between, and the CLI has it for every category without a further call.

A category SHALL carry its path wherever it is printed outside the hierarchy, whose own nesting
already shows it. Measured, 18 titles are carried by two categories each, so a title alone does not
say which category was meant.

A category is therefore the one kind printed in two shapes, and the shape SHALL be chosen by where the
record stands rather than by what narrowed the listing. Inside the hierarchy the nesting supplies the
record's place, so the row carries its slug, its title where known and its count, and no path. Outside
the hierarchy nothing else supplies that place, so the record carries its path as well, and its subtree
where the matching kept it.

**A descendant printed inside a matched record's subtree is placed by the nesting**, exactly as a row
of the hierarchy is, and SHALL therefore carry its slug, its title and its count and no path, at every
depth. The path belongs to the matched record, which is the one nothing else places; repeating it on
each descendant would restate what the nesting has already shown and would grow with the depth the
subtree is printed to.

A promotion and a set have one shape each, having no hierarchy to stand in.

No price range SHALL be printed for a category. The only call that carries one takes a call per
category, and the prices are visible one step further on, among that category's products.

Each group SHALL summarise itself by the number of records it printed, and SHALL name a larger number
beside that only where the larger number counts the same set. Where a text matched a group and the page
size cut it short, the number named SHALL be the number that group's matching kept.

The hierarchy's summary SHALL additionally state **how many categories were dropped for holding
nothing**, and the popular join's own count SHALL be stated there too. Both are reports about a filter
the CLI applied, not second counts of the printed set, and both exist for the same reason: a filter
whose effect never reaches the output cannot be judged from the output.

Where the table was marked uncounted, no dropped count SHALL be stated, nothing having been dropped.

There SHALL be no page offset. The order is a ranking with no meaningful tail, and an offset into it
offers to page through noise.

#### Scenario: Four lookups, four shapes

- **WHEN** the hierarchy, a promotion group, a set group or one category's record is printed
- **THEN** each shows the fields its own kind carries, and no field is shown because a field of that
  name appears in another

#### Scenario: One shape however the listing was narrowed

- **WHEN** a promotion or a set is printed in its group, whole or matched against a text
- **THEN** it reads identically in both, no field being added or dropped because a text narrowed the
  listing

#### Scenario: A category's shape follows its position

- **WHEN** a category is printed within the hierarchy, and another is printed outside it
- **THEN** the first carries its slug, its title and its count and no path, the nesting having already
  placed it
- **AND** the second carries its path as well, nothing else there saying which category was meant

#### Scenario: A descendant inside a matched record's subtree

- **WHEN** a matched category's subtree is printed and a descendant stands two or more levels beneath
  it
- **THEN** that descendant carries its slug, its title and its count and no path, the nesting having
  placed it as it places a row of the hierarchy

#### Scenario: The parent is not shown

- **WHEN** the hierarchy prints a category that has a parent
- **THEN** the parent is not named on the row, because the nesting already shows it

#### Scenario: The path disambiguates a title

- **WHEN** a category is printed outside the hierarchy and its title is carried by another category
- **THEN** its path is printed with it, so the reader can tell which was meant

#### Scenario: One identifier, not three

- **WHEN** any command prints a category
- **THEN** the slug is the only identifier on the line, because it is the one form every category tool
  accepts

#### Scenario: The search counts what it matched

- **WHEN** a text matched a group and kept three of its records
- **THEN** that group states that three were found, and the size of the branch's catalogue is not
  shown beside it

#### Scenario: A bounded page of the same set

- **WHEN** no text was given
- **THEN** no page bounds any group, so no count of a printed set stands beside another
- **AND** the hierarchy still states how many categories were dropped for holding nothing and how many
  popular rows were joined, those being reports of a filter rather than counts of a set

#### Scenario: The pruning is counted

- **WHEN** the hierarchy is printed and categories were dropped for holding nothing
- **THEN** their number is stated, so that the size of the filter is visible from the output rather
  than only from the server's own payload

#### Scenario: Nothing was dropped

- **WHEN** the table was marked uncounted, so nothing was dropped
- **THEN** no dropped count is stated

#### Scenario: A filtered listing cut short

- **WHEN** a text matched a group and kept more records than the page size prints
- **THEN** the number stated beside that group is the number its matching kept, not the size of the
  branch's catalogue

#### Scenario: The path is one line

- **WHEN** a category's path is printed
- **THEN** the titles are joined into a single line in order, so a breadcrumb costs one line

#### Scenario: The price range is one line

- **WHEN** a category is printed
- **THEN** no price range is shown, because obtaining one costs a call per category and the prices are
  one step further on

#### Scenario: A category page with no children

- **WHEN** a category's record carries no children holding products
- **THEN** no group is named for them

#### Scenario: No offset

- **WHEN** the caller wants to see past a printed page
- **THEN** no offset is offered, and a larger page size is the only way to see more
