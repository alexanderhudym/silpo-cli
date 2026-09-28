## MODIFIED Requirements

### Requirement: A lapsed time slot is repaired

The CLI SHALL repair the cart's time slot rather than work within a slot that cannot be booked. It
SHALL read the cart back after attempting a repair whether or not the write reported success, because
a write that failed may still have landed in part and what is held would otherwise describe a cart
that no longer exists. Where no slot can be had, nothing is written and what is held stays true.
It SHALL treat a slot whose end has passed as lapsed without asking the server, and SHALL treat a cart
that reports a time slot problem as lapsed as well. Repair SHALL write the branch's first slot
reported as available, and SHALL be silent, because the caller chose no slot to begin with. Where the
slot cannot be replaced, the cart SHALL be left as it stands and reads SHALL still be served; only a
write SHALL be refused.

A repair that could not be made SHALL keep why, and the refusal it causes SHALL speak it. Reads are
served from a cart whose repair failed, so the reason cannot be raised where it happens; and the
refusal must not assert what it did not check. Discarding it outright is what let a repair rejected
by the rate limiter be reported as a branch with no slot left to give, while the slot listing for
that same branch was answering that it had sixteen — sending the caller to hunt for slots that were
never missing.

Only a branch that genuinely offers no available slot SHALL be reported as one. A reason kept from a
failed repair SHALL NOT outlive the read that recorded it, so that a cart repaired since is not
refused on the strength of an older failure.

#### Scenario: The held slot has already ended

- **WHEN** the slot on the cart the process holds ended before now
- **THEN** the slot listing for the branch and delivery type is read, the first available slot is
  written to the cart, and the cart is read back before anything is answered

#### Scenario: The server reports the slot as unusable

- **WHEN** the cart carries a time slot validation at error level
- **THEN** the slot is replaced the same way

#### Scenario: No slot is available

- **WHEN** the branch offers no available slot for the delivery type
- **THEN** the cart's slot is left as it was and the process still starts, because a cart nobody can
  repair must not take down the commands that never touch one

#### Scenario: A write onto a slot that cannot be booked

- **WHEN** a command tries to change a cart whose slot is still reported unusable after a repair was
  attempted
- **THEN** the change is refused before it is sent, naming the slot, because a write into such a cart
  comes back reporting every line as out of stock

#### Scenario: A usable slot is left alone

- **WHEN** the slot on the held cart has not ended and the server reports no problem with it
- **THEN** no slot listing is read and the cart is not written

#### Scenario: A repair the server refused

- **WHEN** the write that would replace a lapsed slot is itself rejected, and a change to the cart is
  then refused
- **THEN** the refusal carries the server's own words for that rejection, and does not say the branch
  has no slot available

#### Scenario: A read behind a repair that failed

- **WHEN** the write that would replace a lapsed slot is rejected
- **THEN** the read is still answered from the cart as it stands, rather than failing with the reason
  the repair could not be made

#### Scenario: A branch that truly has nothing to offer

- **WHEN** the slot listing for the branch reports no available slot at all
- **THEN** the refusal names the branch as offering none, which is what was read

## ADDED Requirements

### Requirement: A delivery change carries the slot it needs instead of repairing ahead of itself

Where a change to the cart's delivery settings is about to be written, the slot that change needs
SHALL travel in that same write, and no repair SHALL be written ahead of it.

Repairing first spends a cart write on the branch the call is leaving. Every destination change
already arrives carrying a slot chosen at the branch it is moving to, and that slot replaces
whatever the repair wrote moments earlier — so the repair is a write whose only effect is to be
overwritten. It is not free: the server refuses a third cart write made in quick succession, and a
single destination change onto a lapsed cart made three, the third of which was refused.

Where the change names no slot of its own and the cart's has lapsed, a replacement SHALL be read and
carried in the change's own write. It SHALL be sought at the branch the change is moving to, not the
one the cart currently names, because a slot at the branch being left is not bookable at the one
being taken.

Where the change names no slot and the cart's has not lapsed, the cart's own SHALL be sent again
unchanged, and no slot listing SHALL be read.

#### Scenario: A destination change that brought its own slot

- **WHEN** a change naming a slot is written onto a cart whose slot has lapsed
- **THEN** one write is sent, carrying the named slot, and no repair is written first

#### Scenario: A setting change onto a lapsed cart

- **WHEN** a change that names no slot — a promo code, a bonus request — is written onto a cart whose
  slot has lapsed
- **THEN** a replacement slot is read and carried in that change's own write, which is the only write
  sent

#### Scenario: The branch the replacement is sought at

- **WHEN** a change moves the cart to another branch and names no slot
- **THEN** the replacement is sought at the branch being moved to

#### Scenario: A healthy cart

- **WHEN** a change that names no slot is written onto a cart whose slot stands
- **THEN** the cart's own slot is sent again and no slot listing is read
