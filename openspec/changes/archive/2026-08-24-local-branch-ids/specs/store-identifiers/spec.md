## Purpose

Gives every branch and every company a short local number the user can paste into any option
that takes one, and defines how that number or a remote uuid is turned into the identifier the
tool behind the option requires, including the listing the CLI fetches for itself when a number
resolves to nothing.

## ADDED Requirements

### Requirement: A branch and a company are each recorded by their remote identity

The CLI SHALL keep a record of every branch and of every company it has seen, each holding a
local number and the identifier the server uses for it. A record SHALL NOT exist without the
server's identifier, which SHALL name at most one record of its kind. The CLI SHALL create a
record whenever a payload gives it a branch's or a company's server identifier, whichever
command printed it, including a company an answer names only as the operator of a branch.
Branches and companies SHALL be numbered apart from one another, so that a branch and a
company may carry the same number, and a number once given SHALL NOT be given to another
record or reassigned.

#### Scenario: A branch is seen for the first time

- **WHEN** a payload carries a branch the CLI holds no record of
- **THEN** a record is created with the next branch number and the server's identifier

#### Scenario: A branch is seen again

- **WHEN** a payload carries a branch the CLI already holds a record of
- **THEN** the existing number is kept and no new number is consumed

#### Scenario: A company named by a branch

- **WHEN** a store listing names the company that operates each branch
- **THEN** every one of those companies is recorded under its own identifier, alongside the
  branches that named it

#### Scenario: The two kinds are numbered apart

- **WHEN** branches and companies are recorded in turn
- **THEN** each kind draws from its own sequence, so the first company recorded is numbered
  one however many branches were recorded before it

#### Scenario: Numbers are not reassigned

- **WHEN** branches are recorded over several commands
- **THEN** each keeps the number it was given, and recording another branch never renumbers
  the ones already recorded

### Requirement: Two ways to name a branch or a company

An option, a positional argument, or a field of a JSON argument that takes a branch or a
company SHALL accept the local number or the server's identifier, and SHALL decide which was
given from the shape of the text: a run of digits is a local number, and a value in the form of
a uuid is the server's identifier. A value in neither shape SHALL fail the command. A server
identifier SHALL be passed on as it was typed and SHALL NOT be recorded on the strength of
having been typed, because records are made from what the server sent rather than from what the
caller claimed.

#### Scenario: A local number

- **WHEN** a branch argument is given as digits only
- **THEN** it is looked up as a local number and the recorded identifier is sent

#### Scenario: A server identifier

- **WHEN** a branch argument is given in the form of a uuid
- **THEN** it is sent as typed, and no record is created for it

#### Scenario: A store's external number is not an identifier

- **WHEN** a branch argument is given as the digits of a store's external number, which the
  store listing prints
- **THEN** it is read as a local number like any other run of digits, and resolves only if a
  record carries that number

#### Scenario: Neither shape

- **WHEN** a branch or company argument is neither digits only nor in the form of a uuid
- **THEN** the command fails naming the value, and no tool is called

### Requirement: An unrecorded number sends the CLI for the store listing

Where a branch or company argument was read as a local number and no record matches it, the
CLI SHALL list the stores itself, asking for further pages until it has as many as the server
reported, SHALL record every branch and every company that answer names, and SHALL then try the
lookup again. That listing SHALL NOT be printed, and the CLI SHALL fetch it at most once in one
command however many arguments failed to resolve.

#### Scenario: The number is recorded by the listing

- **WHEN** a branch argument names a number the CLI holds no record of
- **THEN** the CLI lists the stores, records what it returns, and the command continues with
  the resolved identifier

#### Scenario: The listing is not printed

- **WHEN** the CLI fetches the stores to fill a gap
- **THEN** nothing of that listing reaches the output, which holds only what the command was
  asked for

#### Scenario: More stores than one page holds

- **WHEN** the server answers with fewer stores than the total it reports
- **THEN** the CLI asks for the pages that follow until it holds the total the server named

#### Scenario: A company number

- **WHEN** a company argument names a number the CLI holds no record of
- **THEN** the same store listing fills the gap, because the companies are named by the
  branches they operate

#### Scenario: Two arguments miss at once

- **WHEN** one command is given both a branch number and a company number that match no record
- **THEN** the stores are fetched once and both lookups are tried again against what it
  recorded

### Requirement: An unresolved branch or company fails the command

Where a branch or company argument matches no record and the store listing does not supply one,
the CLI SHALL fail the command, naming the value it could not resolve, and SHALL NOT call the
tool with the text as typed.

#### Scenario: A number nothing was recorded under

- **WHEN** a branch argument is digits that match no record, before the listing and after it
- **THEN** the command fails naming the value, and the call it was meant for is not made

#### Scenario: A company the stores do not name

- **WHEN** a company argument is digits that match no record and no branch of the listing names
  a company that takes that number
- **THEN** the command fails naming the value, and no tool is called
