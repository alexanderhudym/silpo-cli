## MODIFIED Requirements

### Requirement: Confirmation output

Every command that changes the cart — putting products in through the list, changing how much of one
line it holds, removing them, clearing the cart, setting its delivery settings, setting a promo code,
setting a bonus amount, adding or removing a certificate, and confirming the buyer is old enough —
SHALL close on the cart that resulted. It SHALL print the server's summary first, then what the CLI
itself changed on the caller's behalf, then the cart snapshot, and nothing else. It SHALL NOT print
the quantities the write echoed back, because a write echoes what was requested rather than what the
cart now holds, and the snapshot beneath it carries the truth.

The command that fills the cart from a list SHALL close on the cart in the same way, and the "nothing
else" above SHALL be read against its own composition rather than against the shape of a single-line
write. It SHALL print, in this order: the count of the items it settled and those items as names and
prices; what the CLI changed on the caller's behalf; the row per item that still needs the caller;
the validations; and then the cart snapshot. Nothing beyond those SHALL be printed.

No further command SHALL be needed to see what the cart holds after a write. This SHALL hold for the
fill as much as for any other write: a caller that has just turned a list into cart lines SHALL be
able to read the total, the bonus balance and the checkout links out of that command's own output.

#### Scenario: Products confirmed

- **WHEN** products are put in, changed or removed
- **THEN** the summary is printed and the cart beneath it shows the resulting lines, so that the
  quantity the caller reads is the quantity the cart holds

#### Scenario: A payload that carries only a summary

- **WHEN** a cart is cleared, its delivery settings are set, or a promo code or bonus amount is
  applied, and the write payload carries nothing but a summary
- **THEN** that summary is printed and the resulting cart is printed beneath it, rather than the
  command ending on a line that says nothing about the cart

#### Scenario: The write is not read twice

- **WHEN** a command changes the cart and prints the result
- **THEN** the cart is read once for that command, and the snapshot printed is that same read

#### Scenario: No read follows a write

- **WHEN** a write has printed its snapshot
- **THEN** the caller has what it needs, and a command asking for the cart again would add nothing

#### Scenario: The echoed quantity is absent

- **WHEN** a write reports back the quantities it was asked for
- **THEN** none of them is printed, because the snapshot reports what the cart holds instead

#### Scenario: A list is turned into cart lines

- **WHEN** a shopping list is resolved and written
- **THEN** the count, the settled names and prices, the CLI's own changes, the rows that need the
  caller and the validations are printed, and the cart snapshot closes the output beneath them

#### Scenario: The totals after a list is filled

- **WHEN** the caller has filled the cart from a list and needs the amount the person will pay, the
  bonus balance or the checkout links
- **THEN** all three are in that command's own output, and no second command is issued to reach them

#### Scenario: A list that settles nothing

- **WHEN** every item of a list needs the caller and none was written
- **THEN** the cart snapshot is still printed beneath the rows, because the caller learns from it
  what the cart holds regardless of what this call added
