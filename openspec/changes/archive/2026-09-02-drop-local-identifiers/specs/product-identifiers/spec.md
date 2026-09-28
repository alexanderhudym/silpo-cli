## REMOVED Requirements

### Requirement: A product is recorded by its remote identity

**Reason**: The CLI keeps no record of any entity. A product's identity is whatever the payload
carried, and it is printed as it stands.

**Migration**: None for a caller. A product is named by the uuid, slug or `externalProductId` the
CLI printed, and `silpo_get_product_details` and `silpo_get_similar_products` accept all three.

### Requirement: A payload short of an identifier is resolved where it can be

**Reason**: The resolver that filled a missing identifier by calling `silpo_get_product_details`
with an invented delivery context is removed. A payload short of a field is printed short of it.

**Migration**: A record that carries no `externalProductId` — a product card, a cart line — prints
none. Where one is needed, as `silpo_add_or_update_favorite_products` needs it, it comes from a
listing that carries the field.

### Requirement: Three ways to name a product

**Reason**: There are now two ways the CLI recognises — the uuid and the slug — and it recognises
neither. Whatever the caller passes reaches the tool unchanged, and the tool decides.

**Migration**: A cart write, a removal and a replacement lookup take the uuid alone. Product details
and alternatives take any form the server accepts.

### Requirement: A product resolves to the form its call needs

**Reason**: No form is chosen on the caller's behalf, because no mapping between forms is held.

**Migration**: Pass the form the tool wants. The skill states which tools want which.

### Requirement: A missing identifier is resolved in a fixed order

**Reason**: There is no resolution order because there is no resolution.

**Migration**: None.

### Requirement: An unresolved product fails the command

**Reason**: `no product <n>` cannot be raised by a CLI that resolves nothing. A product the server
does not recognise fails at the server, in the server's own words.

**Migration**: A wrong product identifier now surfaces as the tool's own error — `Resource not
found` from the catalogue, `-32602 invalid_format` from a cart write.
