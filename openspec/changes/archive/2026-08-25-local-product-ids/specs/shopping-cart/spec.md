## MODIFIED Requirements

### Requirement: Cart snapshot output

The cart snapshot SHALL print the cart's alias, its delivery type, its time slot as local wall
clock time, and its address joined into one line by the shared address conversion. Each
shipment SHALL be printed with the local numbers of its company and branch, holding its
products as
records that show the product's local number, quantity, line total, discount, stock, the step
it is sold in when the product is weighted, and the comment where the line carries one, and
that close with the same keyless line of name and price a product listing uses — the name, the
size of one package where the product is sold by the piece, the price with its currency and
the unit it is per where the product is sold by weight, and the previous price where the line
carries one. The product's slug SHALL NOT be printed, for the reason it is absent from a
product listing's records. A shipment's company and branch SHALL be printed, unlike a product
listing's, because a cart may hold more than one shipment and neither is an argument the
caller passed. The quantity, the stock and the step of a line sold by weight SHALL name the
unit they are counted in, and SHALL be the numbers the payload carried, unconverted, so that
the price, the quantity and the total on one record still multiply. The ratio SHALL NOT be
printed under a key of its own. The shipment's own id SHALL NOT be printed, because no tool
accepts it. The totals of the calculation and the bonus state SHALL be printed, and the
checkout address where the payload carries one, because the CLI offers no tool that places an
order and that address is the only way to finish one. The product image SHALL NOT be printed.

#### Scenario: A cart with several shipments

- **WHEN** a cart holds more than one shipment
- **THEN** each shipment names a group of its own holding its products, indented beneath it

#### Scenario: A shipment names its store

- **WHEN** a shipment is printed
- **THEN** its company and its branch appear as the local numbers those two are named by, so
  the caller can hand them back to a cart update

#### Scenario: A line names its product by number

- **WHEN** a cart line is printed
- **THEN** it names its product by the local number recorded for it, and prints no slug,
  because that number reaches every tool a cart line feeds

#### Scenario: A line sold by weight

- **WHEN** a cart line is flagged as weighted
- **THEN** its price names the unit it is per, its quantity, stock and step name that same
  unit, and multiplying the printed price by the printed quantity still yields the printed
  total

#### Scenario: A line reads like a search result

- **WHEN** a cart line and a product listing print the same product
- **THEN** the name and price line reads the same in both

#### Scenario: The address is one line

- **WHEN** a cart carries a delivery address
- **THEN** its parts are joined into one line by the same conversion the saved address listing
  uses

#### Scenario: A line comment

- **WHEN** a product line carries a comment
- **THEN** it takes a line of its own under the product, and a line without one shows nothing

#### Scenario: The shipment id is absent

- **WHEN** a cart snapshot is printed
- **THEN** no shipment id appears, because no tool accepts one

#### Scenario: The checkout address

- **WHEN** a cart snapshot carries a checkout address
- **THEN** it is printed, as the exception to leaving out addresses the CLI cannot follow,
  because no tool of the surface places an order
