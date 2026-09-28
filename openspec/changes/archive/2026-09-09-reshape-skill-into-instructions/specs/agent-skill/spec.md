## ADDED Requirements

### Requirement: The skill states what the agent offers the person

The skill SHALL state what the agent offers a person unasked, and SHALL state each offer over a line
the CLI already prints rather than over a field of the server's payload.

It SHALL state that where the cart a write printed carries a bonus balance available to it and
carries no line saying bonuses were already requested, the agent offers to spend them, and writes
them only once the person agrees. The offer SHALL ride with the report of the finished cart rather
than stand in place of it, so that the person is never left waiting on an answer for a cart that is
already done.

It SHALL state that a link that cart printed is handed back whole, and that where it printed two
links both are handed back.

It SHALL state that a budget the person named is held: the cart is filled as close to that budget as
the catalogue allows without passing it, the cart's own total is what the person pays, and a cart
whose total stands above the budget is never reported as ready. This SHALL hold whether the cart is
written or a list is only costed.

#### Scenario: A cart is finished with bonuses unspent

- **WHEN** the printed cart carries a bonus balance available to it and no line saying bonuses were
  requested
- **THEN** the skill has established that the agent offers them in the same report that hands the
  finished cart back, and spends them only on the person's word

#### Scenario: A list was written and the order is being finished

- **WHEN** a list has been turned into cart lines
- **THEN** the total, the bonus balance and the links are already in that command's own output, and
  the skill asks for no further read to reach them

#### Scenario: A budget was named and the cart exceeds it

- **WHEN** the person stated a budget and the printed total stands above it
- **THEN** the skill has established that the cart is reduced and re-read, and that it is not
  reported as ready while the total stands above the budget

#### Scenario: A budget was named and nothing is written

- **WHEN** the person asked for a costed list rather than a cart
- **THEN** the same budget rule holds, and the total is computed from the printed prices rather
  than estimated

#### Scenario: A command prints two links

- **WHEN** a command prints both links that finish an order
- **THEN** the skill has established that both reach the person, each whole

### Requirement: The skill names what never reaches the cart

The skill SHALL state that a plastic bag is never written to the cart, under whichever of the shop's
names it carries, and that an item naming one is dropped from a list without the person being asked
about it.

#### Scenario: A list names a bag

- **WHEN** a shopping list carries a plastic bag among its items
- **THEN** the skill has established that the item is dropped and the rest of the list is written,
  and that no question is put to the person about it

#### Scenario: A past order carries a bag

- **WHEN** the products of a previous order are put back into the cart
- **THEN** the skill has established that the bag among them does not travel with them

### Requirement: The skill states how a cart's own report is read

The skill SHALL state what a validations row is — a level, a type and a stable identifier, with the
values that produced it printed beneath it where the server sent any — and SHALL state that the
identifier is never read to a person. What the row means SHALL be said in the person's own words,
built from those values where they are there and from the identifier's own subject where they are
not.

It SHALL state that only a row at error level blocks checkout, and that a row at any other level
still reaches the person.

It SHALL state that no machine handle is read to a person — not an identifier, a slug, an external
id or a barcode. A product is named by its name, a store by its address, an order by its date.

It SHALL state how a product with no stock is described in a product listing: one printed as
unavailable at a price of zero is not sold at this branch and is never described as temporarily out
of stock, where a stock of zero beside a real price is out of stock now.

It SHALL state separately what the command that fills the cart means by the same word, that word
naming there a product the branch cannot supply at all, so that the two are not read as one.

#### Scenario: A row names the shop's minimum order

- **WHEN** the cart prints an error row carrying the shop's minimum order value
- **THEN** the skill has established that the person is told the minimum and the shortfall in words,
  and that the identifier itself is not read out

#### Scenario: A row below error level

- **WHEN** the cart prints a row that does not block checkout
- **THEN** the skill has established that it still reaches the person, and nothing in the skill says
  that only errors are worth reporting

#### Scenario: A row carries no values

- **WHEN** the cart prints a validations row with nothing beneath it
- **THEN** the skill has established what the agent says from the row alone, and the identifier is
  still not read out

#### Scenario: A saved product the branch does not carry

- **WHEN** a listing prints a product as unavailable at a price of zero
- **THEN** the skill has established that it is described as not sold at this branch, and not as
  temporarily out of stock

#### Scenario: The same word means something else while a list is filled

- **WHEN** the command that fills the cart names a product unavailable
- **THEN** the skill has established that it means the branch cannot supply that product at all, and
  the reader does not carry the listing's reading across to it

#### Scenario: A handle stands beside the thing it names

- **WHEN** an outcome prints an identifier beside a product's name
- **THEN** the skill has established that the identifier goes back to the CLI and the name goes to
  the person

### Requirement: The skill is grouped by what the agent is doing

The skill's sections SHALL be named for the work they cover — the context every command runs within,
the standing rules, the command index, filling a list, what is offered, what is reported, and the
writes that report success without effect. A section SHALL NOT exist because a requirement of this
specification produced it, and the requirements of this specification SHALL NOT be recoverable from
the skill's shape.

#### Scenario: The skill's sections are read as a list

- **WHEN** the section headings are read on their own
- **THEN** each names a piece of the work the agent does, and none names a requirement of this
  specification

#### Scenario: One requirement touches several sections

- **WHEN** a requirement of this specification governs both a command entry and a standing rule
- **THEN** it is stated in each place the agent needs it, and no section is created to hold it
  whole

## MODIFIED Requirements

### Requirement: Rules, not walkthroughs

The skill SHALL carry as rules only what an agent would otherwise get wrong, and SHALL NOT carry
end-to-end walkthroughs of tasks a capable agent composes on its own.

A rule SHALL take one of three forms: what to do in order to reach a stated end, what is never done,
and what always holds. It SHALL be stated imperatively and SHALL NOT carry the reason it exists.

A rule SHALL NOT guard against a mistake the agent has no reason to make. Where nothing in the
surface would lead the agent to a thing, the skill SHALL NOT forbid it.

#### Scenario: A step is one a capable agent takes unprompted

- **WHEN** a published workflow step describes something the agent would do without being told
- **THEN** it does not appear, and only the part that would otherwise be got wrong survives as a rule

#### Scenario: A rule guards against a silent failure

- **WHEN** a delivery type is to be passed back and a familiar value would read as an equivalent of
  the one the server printed
- **THEN** a rule states that only a value the server printed is passed back, and stops there

#### Scenario: A prohibition has nothing to prohibit

- **WHEN** a rule would forbid a thing the agent has no way and no reason to attempt
- **THEN** it is not in the skill, because the prohibition costs the reader attention and changes
  nothing the agent does

### Requirement: The skill states what is decided silently and what is asked

The skill SHALL state, for the command that fills the cart from a list, which decisions the CLI takes
on its own and which it puts back to the caller, and how one that is put back is answered.

It SHALL name each of the outcomes the command prints and what each means for the reader: the ones
resolved automatically are already in the cart and need no verification; the ones the CLI would not
choose between are not in the cart and are owed an answer; the ones carrying a warning are in the
cart and are the reader's to raise with the person; the ones that matched nothing are neither in the
cart nor recoverable by repeating the command.

It SHALL state that an outcome that matched nothing is reported as a term not found at this branch,
and SHALL NOT let it be reported as a product that does not exist.

It SHALL state that every outstanding question is answered in one further call, naming a chosen
candidate per term, and that the candidate is named by the identifier printed beside it, passed back
unchanged. It SHALL state that the further call carries the whole of the original list alongside the
choices, that an item the first call already wrote is not written a second time by it, and that a
quantity the reader stated on a term is carried by that term as it was first given rather than by the
choice that answers it. It SHALL state that the answer comes from the printed candidates — decided
by the agent where the person's request settles it, and put to the person where it does not — and
SHALL NOT direct the reader to search again for a term that was asked about.

It SHALL state that the automatically resolved items print names and prices and no identifiers.

#### Scenario: A list comes back with items in more than one state

- **WHEN** a list resolves into some items chosen automatically and some the CLI would not choose
  between
- **THEN** the skill has established which of them are in the cart and which are not, without the
  reader inspecting the cart to find out

#### Scenario: The outstanding questions are answered

- **WHEN** three terms came back with candidates and no choice made
- **THEN** the skill has established that all three are answered in one call, by naming a candidate
  per term with the identifier as printed, that the call repeats the whole original list beside those
  choices, and that the items already in the cart are not doubled by it

#### Scenario: A warning rides on an item that was added

- **WHEN** an item is resolved and carries a warning about a stored dietary restriction
- **THEN** the skill has established that the item is in the cart and that the warning is to be put
  to the person, not silently acted on

#### Scenario: A term matched nothing

- **WHEN** an item comes back as matching nothing
- **THEN** the skill has established that repeating the command changes nothing, that the term is
  reported as not found at this branch rather than as a product that does not exist, and what the
  reader does instead

### Requirement: The skill states what a catalogue query should be

The catalogue entry SHALL make the agent write a name the shop uses rather than a description of a
need, and SHALL make it read an empty answer as an answer.

To that end it SHALL state that the text is a name — a category, a promotion or a set as the shop
calls it, or an approximation of one; that the titles matched are the shop's own Ukrainian and that
nothing is translated for the caller; that a text sharing no word with any title returns nothing
rather than the least bad match; and that a record returned for a text is not evidence that the text
was understood.

It SHALL state that naming a category prints its whole subtree, and that each kind is matched on its
own so that one kind's position in the answer says nothing against another's.

It SHALL NOT state why any of that is so. It SHALL NOT carry the matcher's own rules for handles,
spellings or transliterations. It SHALL NOT ask the agent to decide what kind of thing a name names
before naming it, and SHALL NOT promise that a wrong query is refused.

#### Scenario: The text is declared a name

- **WHEN** the reader has a need to express rather than a name
- **THEN** the entry has told them the text is a name

#### Scenario: The language is declared

- **WHEN** the reader is about to write a catalogue text in a language other than the catalogue's
- **THEN** the entry has told them the titles are the shop's own Ukrainian and that nothing is
  translated for them

#### Scenario: What the search matches is declared

- **WHEN** the reader is about to compose a catalogue text
- **THEN** the entry has told them the search matches the words the catalogue itself uses, so they
  write such a word rather than a description of what they want

#### Scenario: An empty answer is declared

- **WHEN** the reader's text shares no word with any title and the command returns nothing
- **THEN** the entry has already told them that is what such a text returns, so the empty answer is
  read as an answer

#### Scenario: A coincidence is not declared safe

- **WHEN** the reader writes a sentence and is given a record sharing one of its words
- **THEN** the entry has told them a returned record is not evidence the query was understood

#### Scenario: Ranking within a kind is declared

- **WHEN** the reader sees a category and a promotion in one answer
- **THEN** the entry has told them each kind was matched in its own right, so neither position means
  anything against the other

#### Scenario: The subtree rule is stated once

- **WHEN** the reader wants everything under a category
- **THEN** the entry has told them that naming the category is enough

#### Scenario: The printed depth is declared

- **WHEN** the reader sees a matched category with children
- **THEN** the entry has told them the whole subtree is printed, so the deepest printed row is the
  deepest row there is

#### Scenario: No classification is asked for

- **WHEN** the reader holds a name and does not know what kind of thing it names
- **THEN** nothing in the entry requires them to decide before asking

#### Scenario: The entry is read for an explanation

- **WHEN** the reader looks in the entry for why the matching behaves as it does
- **THEN** nothing answers, because every line of the entry is an instruction

### Requirement: The skill states what the catalogue listing answers and what it costs

The catalogue entry SHALL state what the listing returns with no text — the branch's promotions, its
whole hierarchy, then its sets, in that fixed order — and that the page size does not apply to it.

It SHALL state that with a text the page size trims each kind's own result, that there is no offset,
and that a record the matching did not keep is reached by narrowing the text or raising the page
size.

It SHALL state that every category carries the number of products it holds, and that this number is
the branch's own for the session's delivery type and time slot.

It SHALL state that a category holding nothing at this branch is neither printed nor nameable, and
that such a name is reported as not stocked here rather than as absent from the catalogue.

It SHALL NOT carry the size of the listing, the number of categories a branch holds, or any other
count measured at one branch on one day, and SHALL NOT explain why the listing is shaped as it is.

#### Scenario: The unbounded listing is declared

- **WHEN** the reader looks for what the catalogue command returns with no text
- **THEN** the entry says it is the promotions, then the whole hierarchy, then the sets, in that
  fixed order, and that the page size does not apply

#### Scenario: The order is declared

- **WHEN** the reader looks for where in the answer a promotion or a set will be
- **THEN** the entry names the order of the three groups, and states it as fixed

#### Scenario: The page size is declared a trim

- **WHEN** the reader wants a record the printed page did not reach
- **THEN** the entry has told them to narrow the text or raise the page size, and that no offset
  exists

#### Scenario: The pruning is declared

- **WHEN** the reader cannot find a category they expected
- **THEN** the entry has told them that a category holding nothing at this branch is neither printed
  nor nameable, and how that is reported to the person

#### Scenario: Counts are not carried

- **WHEN** the branch's catalogue grows or shrinks
- **THEN** no line of the skill has to change with it

### Requirement: The skill states what a store query should be

The store entry SHALL make the agent send a place rather than a sentence about a place. It SHALL
name what to leave out — politeness, proximity and question words — and SHALL name the forms the
query accepts, among them a settlement, an address, a coordinate pair, a district, a metro station, a
landmark, a branch identifier and a store code, without asking the agent to decide which of them it
holds.

It SHALL state that a settlement is written in the spelling the country uses now, and that another
language's name, a transliteration or a former name goes through the map and may resolve elsewhere.
It SHALL point the reader at the line the answer prints naming the places the stores came from, as
where that shows itself.

It SHALL state that the retailer's own name is sent with the rest of the query rather than stripped
from it, which is what the CLI does with it.

It SHALL state that the first result is the answer, and that a query mixing alphabets fails naming
the value, which is put to the person rather than guessed at.

These SHALL be stated in the store entry itself and SHALL NOT be gathered into a section of rules
elsewhere in the file. The entry SHALL NOT say why the CLI answers a query the way it does, and
SHALL NOT promise that a sentence is refused.

#### Scenario: The reader is told to send a place

- **WHEN** the reader looks up how to search for a store
- **THEN** the entry asks for the place itself rather than a sentence around it, and names
  politeness, proximity and question words as what to leave out

#### Scenario: The retailer's name is in the query

- **WHEN** the person names the shop as part of the place
- **THEN** the entry has told the reader to send it with the rest, and no rule elsewhere in the file
  contradicts that

#### Scenario: The reader is told which spelling of a settlement to send

- **WHEN** the reader holds a settlement's name in another language, a transliteration or a former
  name
- **THEN** the entry says to send the current Ukrainian name, and says that the other forms go
  through the map and may resolve elsewhere

#### Scenario: Where a mis-resolved place shows itself

- **WHEN** a settlement was sent in some other spelling
- **THEN** the entry has pointed the reader at the line naming the places the stores came from, as
  where the reader sees it resolved somewhere else

#### Scenario: The accepted forms are named

- **WHEN** the reader holds a district, a metro station or a landmark
- **THEN** the entry says the command takes it as it stands

#### Scenario: The reader is not asked what kind of place it is

- **WHEN** the reader holds a district, a metro station or a landmark rather than a street address
- **THEN** the entry asks for it in the same way as a street address, and nothing in the entry turns
  on which of them the reader holds

#### Scenario: A sentence is still answered

- **WHEN** the entry describes what to leave out of the query
- **THEN** it does not say the command rejects a sentence, because it does not

#### Scenario: A query resolves to nothing

- **WHEN** a query mixes alphabets and the command fails naming the value
- **THEN** the entry has told the reader to ask the person for the spelling rather than guess at one

#### Scenario: The contract is at the point of use

- **WHEN** the reader reads the store entry and nothing else
- **THEN** what to send is there, and no other section of the file has to be found for the entry to
  be acted on

### Requirement: The skill states how selectors compose

The skill SHALL state the rule by which the product listing's selectors compose — that repeating one
kind unions, that different kinds intersect, and that a query is not a selector but the filter and
the ordering over what the selectors chose. The rule SHALL be stated once, where the listing is
described.

The skill SHALL name the option of each kind, and SHALL say which composition one repeated option
produces and which two options together produce.

The skill SHALL state that naming a category names its whole subtree, so that a reader does not name
a parent and its children together.

The skill SHALL state what orders a listing the CLI ranked: how many of the query's own probes
returned a product, then the shop's own position, then the smaller package where both records carry
a size of the same kind. It SHALL say that nothing about the reader enters the order — not what they
have bought, not what they have saved, not what is discounted.

The skill SHALL state that the sort options are honoured only over a single population of one kind
with no query. The CLI refuses them anywhere else and the call fails, so an agent that does not know
the limit spends a call discovering it.

The skill SHALL NOT carry any constant of the matcher, and SHALL NOT say why the kind is named by an
option rather than inferred from the handle.

#### Scenario: The composition rule is stated once

- **WHEN** the reader looks for what happens when two selectors are given together
- **THEN** the rule is stated at the listing's entry, and no other entry restates it

#### Scenario: The options of each kind are named

- **WHEN** the reader looks for how to narrow a listing to a part of the catalogue
- **THEN** the entry names the option of each kind and says which composition each produces

#### Scenario: The ordering is declared unshaped

- **WHEN** the reader reads what the listing returns
- **THEN** the skill says the order follows the query's own probes and the shop's position, and that
  nothing about the reader shapes it

#### Scenario: A sort is asked for over a query

- **WHEN** the reader wants a listing ordered by price and has also written a query
- **THEN** the entry has told them the sort is honoured only over a single population with no query,
  so the failing call is not made

#### Scenario: Constants are not carried

- **WHEN** the matcher's rules change
- **THEN** no line of the skill has to change with them

### Requirement: What the CLI does on its own is stated, and nothing it keeps

The skill SHALL state the things the CLI does without being asked, so that the reader recognises the
output rather than treating it as an error, and does not repeat work that is already done. It SHALL
state each of these, and SHALL state each without the reason it happens:

- that every product named comes from a call made for the question that was asked;
- that a shopping list stated as free text is normalised, matched and resolved by the CLI, which
  writes the cart itself;
- that a destination stated as free text is resolved into the address, the delivery type, the branch
  and the slot, and written to the cart;
- that a lapsed timeslot is replaced before any call whose answer depends on stock or price, and
  that this replaces the slot alone and never the store, the delivery type or the address;
- that a quantity the branch cannot fill is reduced, and a product it cannot fill at all is named
  and left in the cart;
- that an item the branch can fill only in part is put to the reader rather than written short, and
  what the three answers to it are;
- that where more than one candidate is plausible the CLI prints them and stops rather than choosing,
  so a printed candidate list is answered rather than retried;
- that where a listing's single decisive match is out of stock at the branch, its alternatives are
  fetched and printed beneath it unasked, so they are answered from rather than searched for again.

It SHALL NOT claim that a cart is among the things the CLI opens on its own, and it SHALL NOT claim
that anything is carried from one command to the next.

#### Scenario: The output reports a reduced quantity

- **WHEN** an add reports that a quantity was reduced to what the branch holds
- **THEN** the skill has established that the CLI did this, and that the reduced quantity is what is
  in the cart

#### Scenario: The output names an unfillable product

- **WHEN** a write reports a product the branch cannot fill at all
- **THEN** the skill has established that the line is still in the cart, that the CLI will not remove
  it, and that replacing or dropping it is the reader's decision to put to the user

#### Scenario: The reader looks for the verification step

- **WHEN** the reader has changed the cart and looks for the command that confirms the result
- **THEN** the skill has established that the write already printed it

#### Scenario: Every term is searched

- **WHEN** a product the account buys every week is named in a list
- **THEN** the skill has established that it was searched like any other, and that the price beside
  it came from the call that printed it

#### Scenario: An item the branch can only partly fill

- **WHEN** a list asks for more of a product than the branch holds
- **THEN** the skill has established that the CLI asks rather than writing the line short, and names
  the three answers available

#### Scenario: The command prints candidates and stops

- **WHEN** a destination or a term matches more than one plausible candidate and nothing was written
- **THEN** the skill has established that the way forward is to answer it rather than to repeat the
  command

#### Scenario: The one match a listing found is out of stock

- **WHEN** a product listing prints alternatives beneath a match the branch has none of
- **THEN** the skill has established that they were fetched for the reader, so the reader chooses
  among them rather than running a further search

### Requirement: The skill does not contradict the CLI or itself

Every statement the skill makes about what the CLI does SHALL be true of the CLI as it stands, and
SHALL NOT be contradicted by another statement of the skill. A fact SHALL be stated once, in the
place a reader needs it: a rule about one command belongs to that command's entry, and the rules
section holds only what has no single command to belong to.

Specifically, the skill SHALL state that the cart is read afresh on every command and SHALL NOT
suggest that a change made elsewhere needs the background process restarted; SHALL state that a read
of the cart may repair a lapsed slot and that it changes nothing else about how the order travels;
SHALL state that a cart ordered away mid-session is reopened on the settings it carried; SHALL NOT
describe the shape of the address a cart carries nor which of its fields the CLI fills; SHALL state
that an identifier is passed back exactly as it was printed; and SHALL state that no command takes a
delivery context.

Where a command refuses a name and takes only the identifier its own snapshot printed, the skill
SHALL say so in that command's entry. Elsewhere it SHALL NOT carry an account of which identifier
form a command requires.

The skill SHALL state that every write closes on the cart it produced, the command that fills the
cart from a list among them, and SHALL NOT carve that command out of the rule.

#### Scenario: A cart changed in the Silpo app

- **WHEN** the reader is told the user has just changed the cart on another device
- **THEN** the skill has established that the next command sees it, and offers no ritual to force it

#### Scenario: Reading the cart

- **WHEN** the reader prints the cart
- **THEN** the skill has established that a lapsed slot may be repaired in the course of it, and that
  the store, the delivery type and the address are left as they were

#### Scenario: A fact with one home

- **WHEN** a reader looks up how a command behaves
- **THEN** the command's own entry carries the rule, and the rules section does not repeat it

#### Scenario: A command refuses a name

- **WHEN** the reader changes the quantity of a cart line or takes a line out of the cart
- **THEN** that command's entry says the argument is the identifier the cart's own snapshot printed,
  because the command fails on a name

#### Scenario: The totals after a list is filled

- **WHEN** the reader fills the cart from a list and looks for the totals
- **THEN** they are in that command's own output, and no entry sends the reader to a second command
  for them

### Requirement: The skill is short enough to be read whole

The skill SHALL be short enough that an agent loading it reads all of it, and its length SHALL be a
consequence of the surface and of the rule that a line earns its place, not of a budget applied
afterwards.

It SHALL carry no section whose subject the CLI now decides for itself, and one entry per leaf
command the agent drives and no more. A command entry SHALL be the need, the command, and the
instructions that entry owes the agent — never an account of the behaviour behind them.

The length SHALL be read off that count rather than asserted ahead of it: thirty entries, the
context, the standing rules, the outcomes of the command that fills the cart, what is offered, what
is reported, and the writes that report success without effect. Where the count of entries changes,
the length follows it.

Each decision moved from the agent into the CLI SHALL make the skill shorter rather than longer: a
capability the CLI absorbs SHALL remove the prose that taught the agent to do it by hand, and SHALL
NOT add a section explaining that it now happens.

#### Scenario: The rewritten skill is measured

- **WHEN** the skill is measured against the one it replaces
- **THEN** it is shorter, and the reduction is accounted for by the removal of rationale rather than
  by the removal of an instruction the agent needs

#### Scenario: An entry is measured against its old self

- **WHEN** the entry for the product listing, the catalogue listing or the store listing is compared
  with the one it replaces
- **THEN** each instruction it carried survives in imperative form and nothing that explained the
  CLI's behaviour does

#### Scenario: A command is added to the CLI

- **WHEN** a new command the agent drives is added
- **THEN** the skill grows by one entry, and by nothing else

#### Scenario: The CLI absorbs another decision

- **WHEN** a decision the agent used to make moves into the CLI
- **THEN** the prose that taught the agent to make it is removed, and what replaces it is at most one
  line under what the CLI does on its own
