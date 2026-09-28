## ADDED Requirements

### Requirement: The skill states what a quantity on a list item counts

The skill SHALL state that a number on a list item counts the product's own step, and that a
weighted product's step is a mass rather than a piece. Without it the agent reads a count as a
count of things, which is the one reading the CLI cannot honour: no field of the catalogue says
what one carrot weighs, so a count against a weighted product is answered by the only unit the
branch sells it in.

The rule SHALL be stated as a convention the agent can invert, not as an estimate. An agent that
knows the step and the rule can work out before it calls what the call will buy, and name a
different number where that is not what it wants. An estimate of what a piece weighs could not be
inverted and would be wrong in a way the agent could not correct.

Its examples SHALL name what each one buys, and at least one SHALL be a count against a product
sold by weight. The examples the skill carried named only the writing of a quantity and not its
effect, so an agent reading them had no way to learn that a count against a weighted product is
not a count of things.

It SHALL state that a mass the step does not divide is raised to the next whole step, and that the
settled line says so.

#### Scenario: The skill names the step convention

- **WHEN** the skill describes how much of an item to buy
- **THEN** it states that a number counts the product's step, and that for a weighted product the
  step is a mass

#### Scenario: The skill shows a count against a weighted product

- **WHEN** the skill gives examples of naming a quantity
- **THEN** at least one names a count against a product sold by weight and says what it buys

#### Scenario: The skill states that a mass is raised to the step

- **WHEN** the skill describes naming a weight on a list item
- **THEN** it states that a weight the step does not divide is raised to the next whole step and
  that the line says so

## MODIFIED Requirements

### Requirement: The skill is short enough to be read whole

The skill SHALL be short enough that an agent loading it reads all of it, and its length SHALL be a
consequence of the surface and of the rule that a line earns its place, not of a budget applied
afterwards.

It SHALL carry no section whose subject the CLI now decides for itself, and one entry per leaf
command the agent drives and no more. A command entry SHALL be the need, the command, and the
instructions that entry owes the agent — never an account of the behaviour behind them.

A convention the agent has to hold in order to name an argument correctly is an instruction the
entry owes it, not an account of behaviour. The unit a quantity counts is such a convention: an
agent that does not hold it cannot write the number it means, and no wording of the command line
carries it. Stating it is therefore within the rule rather than an exception to it, and it SHALL
be stated where the argument is named rather than in a section of its own.

The length SHALL be read off that count rather than asserted ahead of it: thirty entries, the
context, the standing rules, the outcomes of the command that fills the cart, what is offered, what
is reported, and the writes that report success without effect. Where the count of entries changes,
the length follows it.

Each decision moved from the agent into the CLI SHALL make the skill shorter rather than longer: a
capability the CLI absorbs SHALL remove the prose that taught the agent to do it by hand, and SHALL
NOT add a section explaining that it now happens.

#### Scenario: The rewritten skill is measured

- **WHEN** the skill is measured against the one it replaces
- **THEN** it is shorter, and the reduction is accounted for by the removal of rationale rather than
  by the removal of an instruction the agent needs

#### Scenario: An entry is measured against its old self

- **WHEN** the entry for the product listing, the catalogue listing or the store listing is compared
  with the one it replaces
- **THEN** each instruction it carried survives in imperative form and nothing that explained the
  CLI's behaviour does

#### Scenario: A command is added to the CLI

- **WHEN** a new command the agent drives is added
- **THEN** the skill grows by one entry, and by nothing else

#### Scenario: The CLI absorbs another decision

- **WHEN** a decision the agent used to make moves into the CLI
- **THEN** the prose that taught the agent to make it is removed, and what replaces it is at most one
  line under what the CLI does on its own

#### Scenario: A convention is needed to name an argument

- **WHEN** an argument cannot be written correctly without a convention the command line does not
  carry
- **THEN** the convention is stated beside that argument, and it is not counted as an account of
  the behaviour behind the command
