## REMOVED Requirements

### Requirement: A settlement and an office are each recorded by their remote identity

**Reason**: No entity is recorded. A settlement and an office are named by the uuids their payloads
carry, and `silpo_find_nova_poshta_offices` requires a settlement uuid.

**Migration**: None for a caller. `--settlement-id` takes the uuid the settlement lookup printed.

### Requirement: An office record keeps what a delivery address is built from

**Reason**: This is the one capability the removal costs. The office table held each office's
coordinates so that a cart address naming an office by its local number could have them filled in.
With no table there is nothing to fill them from, and recovering them would mean calling the office
lookup again — which needs a settlement the caller may no longer have in hand.

**Migration**: The caller passes `latitude` and `longitude` in the cart address alongside `officeId`.
`silpo np offices` prints both on every office record, so they are already on screen at the moment
the office is chosen. This is stated in `stores-and-delivery` as a requirement of its own, and in the
skill beside `silpo cart setup`.

### Requirement: Two ways to name a settlement or an office

**Reason**: There is one way. `silpo_find_nova_poshta_offices` declares `settlementId` as a uuid and
enforces it.

**Migration**: Pass the uuid.

### Requirement: An office number is not an identifier

**Reason**: The distinction existed to keep the carrier's own office number out of the numbering
scheme. There is no numbering scheme, and the office number is still printed inside the title where
it always was.

**Migration**: None.

### Requirement: An unresolved settlement or office fails the command

**Reason**: `no settlement <n>` and `no office <n>` cannot be raised by a CLI that resolves nothing.

**Migration**: A wrong settlement or office now fails at the server, or at the tool's own uuid
validation.
