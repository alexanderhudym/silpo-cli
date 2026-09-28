## ADDED Requirements

### Requirement: Cart snapshot output

The cart snapshot SHALL print the cart's alias, its delivery type, its time slot as local wall
clock time, and its address joined into one line by the shared address conversion. Each
shipment SHALL be printed with the aliases of its company and branch, holding its products as
records that show the product's alias, name, quantity, price, previous price where there is
one, line total, discount, stock, the ratio it is sold by, the step it is sold in when the
product is weighted, and the comment where the line carries one. The shipment's own id SHALL
NOT be printed, because no tool accepts it. The totals of the calculation and the bonus state
SHALL be printed, and the checkout address where the payload carries one, because the CLI
offers no tool that places an order and that address is the only way to finish one. The
product image SHALL NOT be printed.

#### Scenario: A cart with several shipments

- **WHEN** a cart holds more than one shipment
- **THEN** each shipment names a group of its own holding its products, indented beneath it

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

### Requirement: Validations are always printed

A cart payload SHALL have every validation it carries printed — its level, its type, its
message and the context it names — whether the response reported success or not. A validation
whose context is an empty list SHALL print its message alone.

#### Scenario: Errors inside a successful response

- **WHEN** a successful cart response carries validations at error level
- **THEN** every one of them is printed, because the response succeeded while the cart did not

#### Scenario: Context in either shape

- **WHEN** a validation carries its context as an object of named values, or as an empty list
- **THEN** the named values are printed under the validation, and an empty list adds nothing

### Requirement: Confirmation output

The four commands that change a cart — adding or updating products, removing them, clearing
the cart, and updating its delivery settings — SHALL print the server's summary and the
aliases of the products the server confirmed, and nothing else, because these payloads carry
nothing else.

#### Scenario: Products confirmed

- **WHEN** products are added, updated or removed
- **THEN** the summary and the affected products are printed, each with the quantity the
  server confirmed where it reported one

#### Scenario: A payload that carries only a summary

- **WHEN** a cart is cleared or its delivery settings are updated
- **THEN** the summary is printed and the cart id is not repeated back

### Requirement: Gift certificate output

The certificate command SHALL print each certificate the server accepted or removed with its
barcode and face value, and SHALL print the validations of a certificate the server refused,
including the message the server wrote for the user.

#### Scenario: A refused certificate

- **WHEN** the server refuses a certificate inside a response that reports failure
- **THEN** the barcode and every validation under it are printed, the server's message
  included

#### Scenario: An accepted certificate

- **WHEN** the server accepts a certificate
- **THEN** its barcode and face value are printed

## MODIFIED Requirements

### Requirement: Cart output

Cart commands SHALL compose the text they print from the payload they received, naming every
field they show, and SHALL record the call for token accounting. A cart command SHALL keep
failing on a payload that reports failure, after that payload has been printed.

#### Scenario: Successful call

- **WHEN** a cart command completes
- **THEN** the text it composed is written to standard output and the call is recorded with
  its token counts

#### Scenario: A payload that reports failure

- **WHEN** a cart payload reports that it did not succeed
- **THEN** what it carries is printed first, and the command then exits with a failure status

#### Scenario: The command states its output

- **WHEN** a cart command prints a payload
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting
  the payload's shape or a field's name
