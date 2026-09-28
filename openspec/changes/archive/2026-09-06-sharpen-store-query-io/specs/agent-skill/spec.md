## ADDED Requirements

### Requirement: The skill states what a store query should be

The store entry SHALL tell the reader what to put in the query, and not only what the query accepts.
The CLI reduces the text it was given before it asks the map about it, and every phrasing that
reduction has to undo is a guess the CLI maintains on the reader's behalf. Stating the form the query
should take removes the phrasings rather than surviving them.

The entry SHALL ask for **a place and not a sentence about a place**. Words of politeness, words of
proximity, question words and the retailer's own name SHALL be named as what to leave out, because
they name nothing on a map. The entry SHALL NOT present this as a formatting rule the CLI enforces:
the CLI still answers a sentence, less reliably, and the reader is being told how to be answered
well.

The entry SHALL ask for **a settlement in the spelling the country uses now** — the current Ukrainian
name. It SHALL say plainly that another language's name, a transliteration or a former name is
resolved through the map rather than recognised directly, and that a former name in another language
may resolve somewhere else entirely. That failure is visible in what the CLI prints, which names the
place it looked up and the place it settled on, and the entry SHALL point the reader at that line as
where to notice it.

The entry SHALL name the forms the query accepts, a district, a metro station and a landmark among
them, as the store listing capability requires the query to accept them. A reader who does not know
those are accepted will turn one into a street address itself, which is work the CLI already does and
does better, having the map to do it with.

It SHALL NOT, however, ask the reader to decide which of those forms it is holding, or to send any of
them differently from the others. The CLI takes one path for all of them and branches on nothing
about which it was given, so a reader asked to classify would be deciding something nothing acts on.
Naming a form as accepted and asking the reader to identify it are different things, and only the
first belongs in the entry.

These SHALL be stated in the store entry itself and SHALL NOT be gathered into a section of rules
elsewhere in the file, so that a reader who reaches the command reads them at the point of use.

#### Scenario: The reader is told to send a place

- **WHEN** the reader looks up how to search for a store
- **THEN** the entry asks for the place itself rather than a sentence around it, and names politeness,
  proximity, question words and the retailer's name as what to leave out

#### Scenario: The reader is told which spelling of a settlement to send

- **WHEN** the reader holds a settlement's name in another language, a transliteration or a former
  name
- **THEN** the entry says to send the current Ukrainian name, and says that the other forms go through
  the map and may resolve elsewhere

#### Scenario: Where a mis-resolved place shows itself

- **WHEN** the entry describes sending a settlement in some other spelling
- **THEN** it points at the line the CLI prints naming what it looked up and what it settled on, as
  where the reader sees that it resolved somewhere else

#### Scenario: The accepted forms are named

- **WHEN** the reader holds a district, a metro station or a landmark and looks for whether the
  command takes one
- **THEN** the entry says it does, so the reader sends it as it is rather than resolving it to a
  street address first

#### Scenario: The reader is not asked what kind of place it is

- **WHEN** the reader holds a district, a metro station or a landmark rather than a street address
- **THEN** the entry asks for it in the same way as a street address, and nothing in the entry turns
  on which of them the reader holds

#### Scenario: The contract is at the point of use

- **WHEN** the reader reads the store entry and nothing else
- **THEN** what to send is there, and no other section of the file has to be found for the entry to
  be acted on

#### Scenario: A sentence is still answered

- **WHEN** the entry describes what to leave out of the query
- **THEN** it does not say the command rejects a sentence, because it does not, and the reader is
  told how to be answered well rather than how to satisfy a validator
