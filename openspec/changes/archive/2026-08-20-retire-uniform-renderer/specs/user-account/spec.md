## ADDED Requirements

### Requirement: Online order output

An online order SHALL be printed as a record holding the alias of its order id, its number,
its status, the moment it was created as local wall clock time, its amount and its discount,
its delivery type with the delivery window as local wall clock time, its address joined into
one line by the shared address conversion, and its lines as records showing the product's
alias, name, quantity, price and line total. A line the order reports as removed SHALL say so.
The product image SHALL NOT be printed.

#### Scenario: An order and its lines

- **WHEN** online orders are printed
- **THEN** each order takes a record of its own, its lines indented beneath the name of their
  group

#### Scenario: A removed line

- **WHEN** an order line is flagged as removed
- **THEN** the line says so, because a caller reading a receipt needs to know what did not
  arrive

#### Scenario: Delivery that has not happened

- **WHEN** an order carries no delivery window or no delivery moment
- **THEN** those lines are absent rather than shown as empty

### Requirement: In-store receipt output

An in-store receipt SHALL be printed as a record holding the store's name and city, the moment
of the receipt as local wall clock time, the sum paid, the discount and the bonuses it earned,
its rewards as records, and its lines as records showing the name, the unit, the quantity and
the price. Where a line names the catalogue product behind it, that product's alias SHALL be
printed so it can be put in a cart. The receipt's own web address SHALL NOT be printed.

#### Scenario: A receipt and its lines

- **WHEN** in-store receipts are printed
- **THEN** each receipt takes a record of its own, its lines indented beneath the name of
  their group

#### Scenario: A line that names a catalogue product

- **WHEN** a receipt line carries the catalogue product behind it
- **THEN** that product's alias is printed on the line, so the caller can buy it again

#### Scenario: Rewards

- **WHEN** a receipt carries rewards
- **THEN** each reward is printed with the text describing it and the amount it applied

### Requirement: Loyalty output

The loyalty command SHALL print the card's barcode and type, the bonus total, and each bonus
account with its type and amount. The member id SHALL NOT be printed, because no tool accepts
it.

#### Scenario: Card and balance

- **WHEN** the loyalty information is printed
- **THEN** the card's barcode and type stand on lines of their own, followed by the total and
  the accounts behind it

#### Scenario: The member id is absent

- **WHEN** the loyalty information is printed
- **THEN** no member id appears

### Requirement: Coupons, promos and certificates output

The coupon listing, the coupon details, the personal promos, the promo codes and the gift
certificates SHALL each print the fields their own payload carries, and SHALL print the
server's summary when the list is empty, because a summary that says there is nothing is the
whole answer. A promo code SHALL be printed as the code a caller can pass to a cart.

#### Scenario: An empty list

- **WHEN** a loyalty listing holds no item
- **THEN** the server's summary is printed and nothing else

#### Scenario: A promo code

- **WHEN** promo codes are printed
- **THEN** each shows the code itself, so it can be passed to the cart update

### Requirement: Premium subscription output

The premium subscription command SHALL print the server's summary, and the subscription links
where the payload carries them, because when there is no subscription those links are the
whole substance of the answer.

#### Scenario: No subscription

- **WHEN** the account holds no premium subscription
- **THEN** the summary and the links to subscribe are printed

## MODIFIED Requirements

### Requirement: Account output

Account commands SHALL compose the text they print from the payload they received, naming
every field they show, and SHALL record the call for token accounting. No account command
SHALL print whether the call succeeded, because a call that did not succeed fails instead of
printing.

#### Scenario: Successful call

- **WHEN** an account command completes
- **THEN** the rendered text is written to standard output and the call is recorded with its
  token counts

#### Scenario: Profile commands state their own output

- **WHEN** one of the four `profile` commands completes
- **THEN** the text it printed follows from what that command names, field by field, and not
  from any default applied to the payload's shape

#### Scenario: Every account command states its own output

- **WHEN** an order history, a loyalty listing or the premium subscription is printed
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting
  the payload's shape or a field's name
