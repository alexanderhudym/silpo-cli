## ADDED Requirements

### Requirement: The skill says where a food's composition is written down

The skill SHALL state that composition, allergens, nutrition and country of origin are carried only
by the product card, and that a plain search prints names and prices and none of them. It SHALL
state that a question turning on any of these is answered by one search asking for the cards of
every product at once, rather than by the card command one product at a time.

It SHALL say that such a question is never answered from the reader's own knowledge of what a food
usually contains. A reader that knows what goes into a biscuit will answer from that knowledge
unless told not to, and the answer will be fluent, plausible and unsourced — which is the failure
this rule exists to prevent, because the attributes differ between two products sitting beside each
other on the same shelf.

It SHALL further state that a card carrying no such attribute is not a card denying it: where the
line is absent the reader says so, rather than reporting the product free of what was asked about.

#### Scenario: A question about what is in a food

- **WHEN** the reader is asked which products contain an allergen, or for their nutrition or origin
- **THEN** the skill has established that the cards are read for every candidate in one call, and
  that the answer comes from what those cards printed

#### Scenario: A card that says nothing on the point

- **WHEN** a card carries no line for the attribute that was asked about
- **THEN** the skill has established that this is reported as unknown, not as an absence of the
  thing

#### Scenario: A food the reader already knows about

- **WHEN** the reader could answer from general knowledge of the food rather than from the card
- **THEN** the skill has established that it does not, because two products on the same shelf differ

### Requirement: The skill says a failed call tells the reader nothing about what was sent

The skill SHALL state that a call failing on the network — a timeout, a gateway error, a server that
stopped answering — says nothing about the shape of what was sent, and that the same call is repeated
once before anything about it is changed.

It SHALL state that a list is shortened only after a short one has failed too, and SHALL say
outright that one timeout is not evidence that a command cannot take a long list. A reader that
draws that conclusion splits one call into a dozen and spends the run doing it; two benchmark runs
lost roughly seventy steps between them to exactly this inference, each disproved inside its own
transcript by a short call timing out identically.

Where the call that failed was a write, the skill SHALL state that the cart is read before the call
is repeated, because a write that timed out may have reached the server and landed, and repeating it
blindly puts the same products in twice.

#### Scenario: A call that times out

- **WHEN** a command fails on the network
- **THEN** the skill has established that the same call is sent again unchanged before its shape is
  questioned

#### Scenario: A long list that timed out

- **WHEN** a call carrying many products times out
- **THEN** the skill has established that the length was not the cause, and that the list is split
  only after a short call has failed as well

#### Scenario: A write that timed out

- **WHEN** the call that failed was a write to the cart
- **THEN** the skill has established that the cart is read before the write is repeated

### Requirement: The skill says a rate limit is already waited out

The skill SHALL state that the CLI waits out a rate limit itself, so that one reaching the reader has
already been waited out and retried, and that sleeping in the shell and running the command again
will not clear it.

Without this the reader treats the message as an instruction to wait: one benchmark run slept 20,
60, 180, 120, 420 and 600 seconds in turn against a limit whose window was under two seconds, and the
run had to be abandoned. The waiting never helped, because the calls that spent the allowance were
inside the command it kept re-running.

#### Scenario: A rate limit that reaches the reader

- **WHEN** a command fails reporting a rate limit
- **THEN** the skill has established that waiting and repeating will not clear it, and that the
  reader says what is happening rather than sleeping
