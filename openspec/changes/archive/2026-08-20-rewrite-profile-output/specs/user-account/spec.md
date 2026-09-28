## ADDED Requirements

### Requirement: Profile summary

The CLI SHALL fetch the profile of the authorized user and print the name, the phone, the email and the birthday, one to a line, in that order. The name SHALL read surname first, then given name, then patronymic, prefixed by the title the recorded gender names. The profile id, the gender as a field of its own, and the account status SHALL NOT be printed at all: no other tool accepts the id, the gender is spent on the title, and the status of an account the user is authorized against carries nothing.

#### Scenario: One fact to a line

- **WHEN** the user asks for their profile
- **THEN** the name, the phone, the email and the birthday each take a line of their own, in that order, and a field the profile does not carry takes no line

#### Scenario: The name reads surname first

- **WHEN** a profile carries the parts of a name
- **THEN** they are joined surname, given name, patronymic, as a name is written where the CLI is used

#### Scenario: Gender becomes a title

- **WHEN** a profile records a gender
- **THEN** the name is prefixed by the title that gender names, and a profile that records no gender, or records it as unspecified, is prefixed by nothing

#### Scenario: The id is never printed

- **WHEN** the user asks for their profile, however they ask
- **THEN** the id is absent, and the command offers no flag that would include it

#### Scenario: Birthday is not converted

- **WHEN** the profile carries a birthday
- **THEN** it is printed as the date the server gave, with no conversion into a zone

### Requirement: Saved address listing

The CLI SHALL print each saved delivery address as an item whose every field takes a line of its own under a key, with a blank line between items and no marker in front of any of them. A line SHALL run as long as its value needs, because the output is read by a program rather than looked at in a window. The city, the street, the building, the entrance, the floor and the apartment SHALL be joined into one address, comma separated, each of the last four behind the abbreviation that names it. The latitude and the longitude SHALL be shown as one value under one key.

#### Scenario: A field to a line, under its key

- **WHEN** a saved address is printed
- **THEN** each field it carries takes its own line under its own key, the id included, starting at the first column, and a blank line is what stands between one address and the next

#### Scenario: The parts of a place become one address

- **WHEN** an address carries any of a city, a street, a building, an entrance, a floor or an apartment
- **THEN** they are joined into one comma separated address, with the building, the entrance, the floor and the apartment each behind the abbreviation that names it, and the parts it does not carry left out

#### Scenario: Coordinates under one key

- **WHEN** an address carries both a latitude and a longitude
- **THEN** they are shown as one value under one key, comma separated, each rounded to six decimal places

#### Scenario: A coordinate without the other is no coordinate

- **WHEN** an address carries neither a latitude nor a longitude, or carries only one of the two
- **THEN** nothing is shown, because one axis alone locates nothing

#### Scenario: Free text stays on its line

- **WHEN** a field holds text a user typed, which may carry line breaks or a non-breaking space
- **THEN** its whitespace is collapsed so the field occupies the one line it was given, however long that line becomes

## MODIFIED Requirements

### Requirement: Account output

Account commands SHALL print the tool payload as text and SHALL record the call for token accounting. The four commands under `profile` SHALL compose that text themselves, naming every field they show; the remaining account commands SHALL keep handing their payload to the uniform renderer. No profile command SHALL print whether the call succeeded, because a call that did not succeed fails instead of printing.

#### Scenario: Successful call

- **WHEN** an account command completes
- **THEN** the rendered text is written to standard output and the call is recorded with its token counts

#### Scenario: Profile commands state their own output

- **WHEN** one of the four `profile` commands completes
- **THEN** the text it printed follows from what that command names, field by field, and not from any default applied to the payload's shape

### Requirement: Household and restrictions

The CLI SHALL fetch the saved delivery addresses of the authorized user, and SHALL return the household members including children and pets, and the dietary restrictions. A household member, child or pet SHALL be printed with each of its fields on a line of its own and without its id, which no tool accepts, one blank line apart, under the name of the group it belongs to.

#### Scenario: Household

- **WHEN** the user asks for their family
- **THEN** the CLI returns the household members, their children and their pets, each field on its own line and no id among them, each group named above the members it holds, and records the call

#### Scenario: Restrictions

- **WHEN** the user asks for their food restrictions
- **THEN** the CLI returns the dietary restrictions and preferences as items in the same form as the rest of the household, each field on its own line, and records the call

#### Scenario: Household timestamps to the minute

- **WHEN** a household member carries an absolute instant for the moment their profile was created
- **THEN** it is shown as local wall clock time to the minute

#### Scenario: A household timestamp that names no zone

- **WHEN** a household member carries that moment as a date and time naming no zone, which is what the server sends today
- **THEN** it is taken for a local time by the same rule that governs every time the CLI handles, and shown to the minute unmoved, with the command doing nothing to tell the two shapes apart

## REMOVED Requirements

### Requirement: Profile

**Reason**: The requirement was written around a flag that included the profile id on request, and around printing the gender and the account status as fields. Reviewing the composed output settled all three the other way: the id is never printed and the flag is gone, the gender is spent on a title in front of the name, and the status carries nothing for an account the user is already authorized against.

**Migration**: `--with-id` is withdrawn from the `profile` command. Nothing consumed it but a person reading the terminal, and no tool accepts the id it printed. What the command does print is stated by "Profile summary".

### Requirement: Commands pending output rendering

**Reason**: The requirement describes a state the CLI left when the uniform renderer landed — the profile summary and the saved address listing have printed their output and recorded their calls since then, so the requirement has been false rather than pending. This change makes both compose their own output, which settles the question the requirement was holding open.

**Migration**: None. No behavior is being withdrawn; the requirement is being retired because the behavior it described no longer exists. What these two commands print is covered by "Account output", "Profile summary" and "Saved address listing".
