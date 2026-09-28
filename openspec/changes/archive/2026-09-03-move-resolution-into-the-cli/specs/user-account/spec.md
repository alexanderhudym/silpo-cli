## MODIFIED Requirements

### Requirement: Profile summary

The CLI SHALL answer who the authorized user is under one bare command, and that answer SHALL hold
the profile, the loyalty balance and the premium subscription together, because a caller asking who
it is signed in as wants all three and asked for all three every time it asked for one.

It SHALL print the name, the phone, the email and the birthday, one to a line, in that order, and
then the loyalty card and balance and the subscription state beneath them. The name SHALL read
surname first, then given name, then patronymic, prefixed by the title the recorded gender names. The
profile id, the gender as a field of its own, and the account status SHALL NOT be printed at all: no
other tool accepts the id, the gender is spent on the title, and the status of an account the user is
authorized against carries nothing.

#### Scenario: One fact to a line

- **WHEN** the user asks who they are
- **THEN** the name, the phone, the email and the birthday each take a line of their own, in that
  order, and a field the profile does not carry takes no line

#### Scenario: Three answers in one

- **WHEN** the user asks who they are
- **THEN** the profile, the loyalty balance and the premium subscription are all printed by that one
  command, and no further command is needed for any of them

#### Scenario: The name reads surname first

- **WHEN** a profile carries the parts of a name
- **THEN** they are joined surname, given name, patronymic, as a name is written where the CLI is used

#### Scenario: Gender becomes a title

- **WHEN** a profile records a gender
- **THEN** the name is prefixed by the title that gender names, and a profile that records no gender,
  or records it as unspecified, is prefixed by nothing

#### Scenario: The id is never printed

- **WHEN** the user asks for their profile, however they ask
- **THEN** the id is absent, and the command offers no flag that would include it

#### Scenario: Birthday is not converted

- **WHEN** the profile carries a birthday
- **THEN** it is printed as the date the server gave, with no conversion into a zone

### Requirement: Household and restrictions

The CLI SHALL print the saved delivery addresses of the authorized user, its household members
including children and pets, and its dietary restrictions, each under a subcommand of the account
command named for what it prints. A household member, child or pet SHALL be printed with each of its
fields on a line of its own and without its id, which no tool accepts, one blank line apart, under
the name of the group it belongs to.

#### Scenario: Saved addresses

- **WHEN** the user asks for their addresses
- **THEN** the saved delivery addresses are printed, each in the form "What a saved address prints"
  requires

#### Scenario: Household

- **WHEN** the user asks for their family
- **THEN** the CLI returns the household members, their children and their pets, each field on its own
  line and no id among them, each group named above the members it holds

#### Scenario: Restrictions

- **WHEN** the user asks for their food restrictions
- **THEN** the CLI returns the dietary restrictions and preferences as items in the same form as the
  rest of the household, each field on its own line

#### Scenario: Household timestamps to the minute

- **WHEN** a household member carries an absolute instant for the moment their profile was created
- **THEN** it is shown as local wall clock time to the minute

#### Scenario: A household timestamp that names no zone

- **WHEN** a household member carries that moment as a date and time naming no zone, which is what the
  server sends today
- **THEN** it is taken for a local time by the same rule that governs every time the CLI handles, and
  shown to the minute unmoved, with the command doing nothing to tell the two shapes apart

### Requirement: Loyalty

The loyalty card state, the bonus balance and the premium subscription SHALL be part of the one
answer that says who the user is, and SHALL NOT be commands of their own. What hangs off the card and
is a list SHALL be a subcommand of that same account command: the coupons, the promos, and the gift
certificates. Personal promos and promo codes SHALL be printed together under the promos subcommand,
because they are one question — what offers does this account hold — and were two commands only
because the server answers them in two payloads.

The terms of one coupon SHALL be printed by a subcommand of that same account command, named by the
coupon's own id and standing beside the listing that printed the id. There SHALL be no single-record
command it is reached through instead: a bare number names a coupon only in the company of the
listing it came from, and a command that dispatched on the form of a handle would be guessing at what
kind of thing the number was.

#### Scenario: Balance

- **WHEN** the user asks who they are
- **THEN** the card state and bonus balance are part of that answer, with no separate command for them

#### Scenario: Coupon details

- **WHEN** the user names a business coupon id to the account command's coupon subcommand
- **THEN** that coupon's terms and the products it applies to are printed, and an id that is not a
  whole number fails

#### Scenario: Offers under one subcommand

- **WHEN** the user asks for their promos
- **THEN** the personal promos and the promo codes are printed together, in one answer

#### Scenario: Certificates

- **WHEN** the user lists gift certificates
- **THEN** the CLI forwards the page size and offset it was given

### Requirement: Order history

The CLI SHALL return the order history under one subcommand of the account command, which prints
online orders by default and in-store receipts where the caller asks for those instead.

The in-store history SHALL supply its own delivery context. The branch, the delivery type and the
time slot the tool demands SHALL be taken from the session's cart, and SHALL NOT be asked of the
caller. Where there is no cart, the command SHALL say so rather than ask for four values a caller
reading a receipt has no reason to hold.

Reading the history SHALL NOT move the order: the store, the delivery type and the address the cart
carries SHALL NOT be written by it. The lapsed-slot repair specified by the delivery-resolution
capability is unaffected, and the caller SHALL never be sent after a slot to make this command answer.

#### Scenario: Online orders

- **WHEN** the user lists their orders
- **THEN** the online orders are returned, paged by the requested page size and offset

#### Scenario: In-store receipts

- **WHEN** the user asks for the in-store receipts
- **THEN** the receipts are returned, narrowed to a receipt date range when one is given, with the
  branch, the delivery type and the time slot taken from the cart

#### Scenario: The caller assembles nothing

- **WHEN** the user asks for the in-store receipts
- **THEN** no branch, delivery type or time slot is asked of them, and the paragraph of preparation
  that once stood in front of this command is gone

#### Scenario: No cart to take a context from

- **WHEN** the in-store receipts are asked for and the session has no cart
- **THEN** the command says there is no delivery context to take, and nothing is created to make one

#### Scenario: Reading does not move the order

- **WHEN** the in-store receipts are read against a cart whose slot has lapsed
- **THEN** the receipts are printed, the store, the delivery type and the address are unchanged, and
  the caller is not asked to rebook anything

#### Scenario: Dates in local time

- **WHEN** the receipt date range is given as local wall clock times
- **THEN** they are converted to absolute instants before the call

### Requirement: Account output

Account commands SHALL compose the text they print from the payload they received, naming
every field they show. No account command SHALL print whether the call succeeded, because a
call that did not succeed fails instead of printing. No account command SHALL record anything
about the call it made: the CLI keeps no ledger.

Where one command's answer is composed of several payloads, as the answer to who the user is is,
every field of every payload SHALL still be one that command named.

#### Scenario: Successful call

- **WHEN** an account command completes
- **THEN** the rendered text is written to standard output, and nothing else is written anywhere

#### Scenario: Profile commands state their own output

- **WHEN** the profile, the loyalty balance and the premium subscription are printed as one answer
- **THEN** the text follows from what that command names, field by field, and not from any default
  applied to a payload's shape

#### Scenario: Every account command states its own output

- **WHEN** an order history, a coupon listing, a promo listing or a certificate listing is printed
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting
  the payload's shape or a field's name

### Requirement: Loyalty output

Where the account answer prints the loyalty card, it SHALL print the card's barcode and type, the
bonus total, and each bonus account with its type and amount. The member id SHALL NOT be printed,
because no tool accepts it.

#### Scenario: Card and balance

- **WHEN** the account answer is printed
- **THEN** the card's barcode and type stand on lines of their own, followed by the total and
  the accounts behind it

#### Scenario: The member id is absent

- **WHEN** the account answer is printed
- **THEN** no member id appears

### Requirement: Coupons, promos and certificates output

The coupon listing, the coupon details, the promo listing and the gift certificate listing SHALL each
print the fields their own payload carries, and SHALL print the server's summary when the list is
empty, because a summary that says there is nothing is the whole answer. A promo code SHALL be printed
as the code a caller can pass to the cart.

The promo listing carries two payloads — the personal promos and the promo codes — and SHALL print
each under a group naming which it is, so that a caller can tell an offer it already holds from a code
it has to apply.

#### Scenario: An empty list

- **WHEN** one of these listings holds no item
- **THEN** the server's summary is printed and nothing else

#### Scenario: A promo code

- **WHEN** promo codes are printed
- **THEN** each shows the code itself, so it can be passed to the command that sets the cart's promo
  code

#### Scenario: Two kinds under one command

- **WHEN** the promos are printed
- **THEN** the personal offers and the promo codes each stand under a group that names them, in one
  answer

#### Scenario: An empty half

- **WHEN** the account holds personal offers but no promo codes, or the reverse
- **THEN** the group that holds nothing prints its own summary, and the other prints its items

### Requirement: Premium subscription output

Where the account answer prints the premium subscription, it SHALL print the server's summary, and the
subscription links where the payload carries them, because when there is no subscription those links
are the whole substance of the answer.

#### Scenario: No subscription

- **WHEN** the account holds no premium subscription
- **THEN** the summary and the links to subscribe are printed as part of the account answer

### Requirement: What an in-store receipt prints

An in-store receipt SHALL be printed as a record holding the store's name and city, the moment of the
receipt as local wall clock time, the sum paid, the discount and the bonuses it earned, its rewards
as records, and its lines as records showing the quantity and, where the line names the catalogue
product behind it, that product's uuid and slug so it can be put in a cart, each closing with the
same keyless line of name and price a product listing uses. A receipt line SHALL read what its price
is per from the unit the payload names on that line: where the unit is a unit of weight the price
SHALL name it, where the unit names a package size that size SHALL stand beside the name, and where
the unit merely counts pieces neither SHALL be printed. No amount SHALL be converted. The receipt's
own web address SHALL NOT be printed.

A line the server gives no catalogue product for SHALL be printed with no identifier the server did
not give, and the command SHALL neither fail nor retry. Where the product index already holds that
product — because the caller bought it online, or searched for it, and the CLI kept its identity —
the index MAY supply the handle, and the line SHALL then print it. Where the index cannot, the absence
stands: the line cannot be reordered from the receipt, and buying it again means searching for it by
name, which the skill states. The absence is common rather than exceptional — on a live receipt, half
the lines carried no catalogue product.

No lookup SHALL be made on the line's article code, and the article code SHALL NOT be printed, being
a machine handle no command accepts and the caller cannot act on.

#### Scenario: A receipt and its lines

- **WHEN** in-store receipts are printed
- **THEN** each receipt takes a record of its own, its lines indented beneath the name of their group

#### Scenario: A line that names a catalogue product

- **WHEN** a receipt line carries the catalogue product behind it
- **THEN** that product's uuid and slug are printed on the line, so the caller can buy it again

#### Scenario: A line the index recognises

- **WHEN** a receipt line carries no catalogue product and the index holds a product of that name
  bought before
- **THEN** the handle the index holds is printed, and the line can be bought again without a search

#### Scenario: A line with no catalogue product

- **WHEN** a receipt line carries no catalogue product and the index holds none for it
- **THEN** it prints its quantity, name and price and no identifier, no lookup is attempted, the
  command neither fails nor retries, and buying it again means naming it in a search

#### Scenario: The article code stays out

- **WHEN** a receipt line is printed, matched or not
- **THEN** its article code does not appear, because no command accepts one

#### Scenario: A line priced by weight

- **WHEN** a receipt line names a unit of weight
- **THEN** its price names that unit and its quantity names it too, both as the payload sent them

#### Scenario: A line that names a package size

- **WHEN** a receipt line's unit names the size of one package rather than a unit of weight
- **THEN** that size stands beside the name and the price names only the currency

#### Scenario: Rewards

- **WHEN** a receipt carries rewards
- **THEN** each reward is printed with the text describing it and the amount it applied

### Requirement: Account records print the identifiers their payloads carry

An order, a saved address, a coupon, a certificate, a promo and a household member SHALL each be
printed with the identifier its payload names it by, in the form the payload carried, and SHALL NOT
be printed with any identifier the CLI derived. Where no command accepts that identifier back — as
none accepts an order, a saved address, a promo, a profile or a family member — the identifier SHALL
still be printed where it is the only way to refer to the row in conversation, and left out otherwise.

A coupon's identifier SHALL be printed because the coupon subcommand of the account command takes it
back and prints that coupon's terms.

A gift certificate SHALL print its barcode, because the barcode is what adds and removes it from a
cart, and its own numeric identifier SHALL be left out, because no command accepts it.

#### Scenario: An order

- **WHEN** the order history is printed
- **THEN** each order carries the identifier its payload named it by, and the user is still told
  about it by its receipt number or its date

#### Scenario: A coupon

- **WHEN** the coupons are printed
- **THEN** each carries the id the coupon subcommand takes back for its terms

#### Scenario: A certificate

- **WHEN** the account's certificates are printed
- **THEN** each carries its barcode and not its numeric identifier

### Requirement: What an online order prints

An online order SHALL be printed as a record holding the identifier its payload named it by, its
receipt number, its status, the moment it was created as local wall clock time, its amount and
its discount, its delivery type with the delivery window as local wall clock time, its address
joined into one line by the shared address conversion, the uuid of the branch its lines were
bought at, and its lines as records showing the product's uuid, quantity and line total, each
closing with the same keyless line of name and price a product listing uses. An order line SHALL
print its price with the currency and no unit beyond it, because an online order line declares
neither a weighted flag nor a unit and the CLI SHALL NOT infer one from the shape of the
quantity. A line the order reports as removed SHALL say so. The product image SHALL NOT be
printed.

An order line names its product by uuid alone, and that is what SHALL be printed. No call SHALL
be made to learn a slug or an external product id for it: the uuid is what the product card command
and a cart write both take, so nothing is missing that a further call would supply.

#### Scenario: An order and its lines

- **WHEN** online orders are printed
- **THEN** each order takes a record of its own, its lines indented beneath the name of their
  group

#### Scenario: The order names itself as the payload named it

- **WHEN** an online order is printed
- **THEN** its id is the identifier the server sent, and its receipt number appears
  separately under its own key

#### Scenario: The order names the store it came from

- **WHEN** an online order's lines carry a branch
- **THEN** that branch is printed once for the order as the uuid the payload carried, so that
  checking what is still available at the same store costs no search of the store listing

#### Scenario: A line names its product by uuid

- **WHEN** an online order line is printed
- **THEN** it names its product by the uuid the payload carried, which is what a cart write takes

#### Scenario: Printing an order fetches nothing

- **WHEN** an online order names a product the payload carries no slug for
- **THEN** the uuid is all the line prints and no lookup is made

#### Scenario: A line with no declared unit

- **WHEN** an online order line carries a fractional quantity, which is how a product sold by
  weight appears
- **THEN** its price still names only the currency, because the payload declares no field
  saying what the price is per

#### Scenario: A removed line

- **WHEN** an order line is flagged as removed
- **THEN** the line says so, because a caller reading a receipt needs to know what did not
  arrive

#### Scenario: Delivery that has not happened

- **WHEN** an order carries no delivery window or no delivery moment
- **THEN** those lines are absent rather than shown as empty
