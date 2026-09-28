## MODIFIED Requirements

### Requirement: How much of one line the cart holds is changed by a named intent

Changing the cart's lines SHALL be a command that names a product as its first positional value and
its quantity as its second, and takes a line's comment as an option. It SHALL change quantities,
a comment, or both, and SHALL change nothing else about the cart. Without it, a caller wanting three
of something the cart holds two of has no command at all: the list write puts products in, a removal
takes them out, and neither says how much.

Further product and quantity pairs SHALL follow the first, and all of them SHALL reach the server in
one write. The list write and the removal both already take as many products as the caller has; this
one taking a single pair is what forces a caller correcting several lines to loop over the command in
a shell. That is a loop whose quoting is easy to get wrong and whose failure looks like the CLI's,
and a cart is routinely corrected on several lines at once because a weighed line comes back at the
step its branch sells in.

Arguments that do not pair up SHALL fail saying so, before anything is written. A product named twice
SHALL fail rather than letting one quantity win silently, because a quantity is a total and two
totals for one line are a contradiction rather than a sum. A quantity that is rejected anywhere among
the pairs SHALL leave the whole call unwritten, so that a caller reading a failure does not have to
work out which half of their correction landed.

The comment option names one line's comment, so it SHALL be passed with a single pair and SHALL fail
alongside more, rather than writing one comment onto every line named.

The quantity SHALL be the quantity the line is to hold and SHALL NOT be an amount added to what it
holds, because a caller asking for three instead of two says three. There SHALL be no option that
turns it into an increment. It SHALL be greater than nothing: a line is emptied by removing it, not by
setting it to nothing, so that a caller reading the command cannot mistake one act for the other.

A product sold by weight SHALL be named in kilograms, in multiples of the step the cart snapshot
prints for that line. A quantity that is not such a multiple SHALL fail naming the step the line is
sold in, rather than being rounded to one, because a rounded weight is a quantity the caller did not
ask for and would read back as the CLI's own.

Where a comment is named, it SHALL replace the comment the line carries. Where none is named, the
comment the line carries SHALL be sent again unchanged, by the same rule that governs a reduction:
the write replaces the line rather than amending it, so a comment not re-sent is a comment lost.

#### Scenario: Several lines corrected at once

- **WHEN** the caller names several product and quantity pairs
- **THEN** every line is set to its named quantity in a single write to the server

#### Scenario: A product left without a quantity

- **WHEN** the arguments do not pair up
- **THEN** the command fails saying so and nothing is written

#### Scenario: One product named twice

- **WHEN** the same product appears in two pairs
- **THEN** the command fails naming it, rather than taking either quantity

#### Scenario: A quantity rejected among several pairs

- **WHEN** any one of the named quantities is rejected
- **THEN** nothing is written, including the pairs that would have been accepted

#### Scenario: A comment named alongside several pairs

- **WHEN** the comment option is passed with more than one pair
- **THEN** the command fails, rather than writing that comment onto every line named

#### Scenario: Three instead of two

- **WHEN** the caller names a product the cart holds and a larger quantity
- **THEN** that line holds the named quantity, every other line is untouched, and the resulting cart
  is printed

#### Scenario: The quantity is not an increment

- **WHEN** the caller looks for a way to add to what a line already holds rather than state its total
- **THEN** there is none, because the quantity named is the quantity the line ends with

#### Scenario: Nothing is not a quantity

- **WHEN** the caller sets a line to nothing
- **THEN** the command fails naming the removal as the way to take a line out of the cart

#### Scenario: A line sold by weight

- **WHEN** the caller changes a weighted line and names the quantity in kilograms as a multiple of
  the step the snapshot printed
- **THEN** that weight is written, named in the same unit the snapshot prints it in

#### Scenario: A weight the step does not divide

- **WHEN** the quantity named for a weighted line is not a multiple of that line's step
- **THEN** the command fails naming the step, and nothing is rounded on the caller's behalf

#### Scenario: A comment changed alone

- **WHEN** the caller names the quantity the line already holds together with a new comment
- **THEN** the comment is replaced and the quantity is unchanged

#### Scenario: A comment survives a quantity it was not named with

- **WHEN** the quantity of a line carrying a comment is changed and no comment is named
- **THEN** the comment the line carried is sent again with the new quantity and still stands afterwards

#### Scenario: A product the cart does not hold

- **WHEN** the caller names a product no line of the cart carries
- **THEN** the command fails naming that product and names the list write as the way to put it in,
  because there is no line whose company and branch it could take

