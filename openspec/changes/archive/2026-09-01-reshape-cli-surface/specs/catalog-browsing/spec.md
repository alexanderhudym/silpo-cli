## ADDED Requirements

### Requirement: Categories found by name

The CLI SHALL find the categories of a branch whose title contains a given text, matched
without regard to letter case. Because the server offers no such filter and returns the
categories a page at a time, the CLI SHALL request as many pages as the listing reports and
match over all of them, so that a category is found wherever it sits in the listing. The text
SHALL be required: a search with nothing to search for is not a listing under another name.

#### Scenario: A category found wherever it sits

- **WHEN** the user searches the categories of a branch for a text that matches a category the
  server would return on its fourth page
- **THEN** that category is found, because the search covers the whole listing rather than one
  page of it

#### Scenario: Case is not part of the match

- **WHEN** the search text and a category's title differ only in letter case
- **THEN** the category matches

#### Scenario: Nothing matches

- **WHEN** no category's title contains the text
- **THEN** the command succeeds and reports that nothing matched, because a search that found
  nothing is an answer

#### Scenario: A search with no text

- **WHEN** the user runs the search without giving a text
- **THEN** the command fails, rather than printing the whole listing

## MODIFIED Requirements

### Requirement: Category listings state their own shape

The category lookups return different records, and each SHALL be printed by the command that
asked for it rather than through one shape imposed on all of them. A category SHALL be named in
output by its local number and nothing else: no slug, no server identifier, and no parent. The
flat listing SHALL print each category's local number and title. The search SHALL print the
matches in the same shape the flat listing uses, and SHALL summarise them by the number it
matched, never by a total the server reported for a listing that was not filtered. The popular
listing SHALL print local number and title, and SHALL NOT print the page address. The category
page SHALL print local number and title, the path to it as one line, the price range as one
line, and its children as records of their own.

#### Scenario: Four lookups, four shapes

- **WHEN** the flat listing, the search, the popular listing, the category page or the tree is
  printed
- **THEN** each shows the fields its own payload carries, and no field is shown because a
  field of that name appears in another lookup

#### Scenario: The parent is not shown

- **WHEN** the flat listing prints a category that has a parent
- **THEN** the parent is not printed, because the listing is a lookup and the tree is where
  the hierarchy is read

#### Scenario: One identifier, not three

- **WHEN** any command prints a category
- **THEN** the local number is the only identifier on the line, because every option that
  takes a category accepts that number, and printing the slug beside it would cost a line per
  category to say the same thing twice

#### Scenario: The search counts what it matched

- **WHEN** the search matched three categories out of a listing of a thousand
- **THEN** the summary states that three were found, and the size of the unfiltered listing is
  not shown beside it, because it counts a different set

#### Scenario: The path is one line

- **WHEN** a category page carries the path that leads to it
- **THEN** the titles are joined into a single line in order, so a breadcrumb costs one line

#### Scenario: The price range is one line

- **WHEN** a category page carries a price range
- **THEN** the lowest and the highest price are shown together on one line

#### Scenario: A category page with no children

- **WHEN** a category page carries no children
- **THEN** no group is named for them
