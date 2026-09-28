## REMOVED Requirements

### Requirement: Aliases

**Reason**: There is no alias to convert in either direction. An entity is named by the local
number its own table issued, so turning a value into its short form is recording it, and turning
a short form back is reading that table — neither is a conversion of text and neither belongs
here.

**Migration**: The two directions live with the entity: recording happens as a command prints the
entity, resolution happens where the command builds its call. See `cart-identifiers`,
`order-identifiers`, `address-identifiers` and `nova-poshta-identifiers`, alongside the
`store-identifiers`, `product-identifiers` and `category-identifiers` that already worked this
way. Text beginning with `@` has no special shape to recognise and is read as ordinary text.

## MODIFIED Requirements

### Requirement: Converters do not decide how a failure is presented

A conversion that cannot read its input SHALL NOT choose an exit code, a message addressed
to the user, or the command line parser's own error type. It SHALL report the failure in
whichever way its own subject makes clearest: returning nothing where a caller must be free
to offer either form, naming which part failed where there is more than one part, or
raising where every caller has already established what kind of value it holds. Turning any
of those into a message and an exit SHALL remain the responsibility of the caller that owns
the user interface, which is the single handler surrounding the whole parse rather than each
command in turn.

#### Scenario: A failed reading carries no presentation

- **WHEN** a conversion is given input it cannot read
- **THEN** however it reports that, it names no exit code and no wording for the user, and
  the caller decides what the user is told

#### Scenario: The user still learns what was expected

- **WHEN** a command line argument fails to convert
- **THEN** the command still fails naming what it expected, as it did before, including
  which of a coordinate's two axes was at fault

#### Scenario: A converter takes no part in the command line

- **WHEN** a conversion needs to report that it failed
- **THEN** it does so without receiving the command it was called for, because presenting the
  failure is not its concern
