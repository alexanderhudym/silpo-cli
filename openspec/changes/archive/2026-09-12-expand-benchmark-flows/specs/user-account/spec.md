## ADDED Requirements

### Requirement: An order history longer than one call is read in pages

Both order listings cap how many rows one call may return — ten for the in-store receipts, fifty for
the online orders — and each publishes its cap in its own schema. Where the caller asks for more than
that, the history SHALL be read in as many calls as it takes and the number asked for SHALL be
returned.

The number SHALL NOT be passed through to be refused. `--limit 15` against a cap of ten came back as
the server's own validation error naming a limit the caller never chose, which is a report about a
request nobody made.

Fewer rows than were asked for SHALL NOT be returned without saying so either: a caller handed ten
when they asked for fifteen cannot tell that from an account holding ten. Reading SHALL stop when
the rows run out, so asking for more than the account holds costs no call past the end and returns
what there is, and SHALL start at the caller's own offset where one is named.

The summary is printed to the caller as it stands, so a merged result SHALL carry a summary counting
the rows merged rather than the rows one page held.

#### Scenario: More receipts than one call may return

- **WHEN** the caller asks for more in-store receipts than the tool's cap
- **THEN** they are read in as many calls as the cap requires and the number asked for is printed,
  under a summary counting them

#### Scenario: A limit the tool already accepts

- **WHEN** the number asked for is within the cap
- **THEN** one call is made carrying that number unchanged

#### Scenario: More rows than the account holds

- **WHEN** the caller asks for more than exists
- **THEN** reading stops at the last row rather than asking past it, and what exists is returned
