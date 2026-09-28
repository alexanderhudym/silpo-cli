## Purpose

Owns the active cart on behalf of every command, so that the branch, the delivery type and the time
slot every catalogue call needs are read off that cart rather than asked of the caller, and so that
there is one path to the cart rather than one per command.

## ADDED Requirements

### Requirement: The cart is what the CLI works within

The CLI SHALL work within one cart, and SHALL take the branch, the delivery type and the time slot
that a call needs from that cart. No command SHALL accept any of the three from the caller. The cart
SHALL NOT be written to disk, and no copy of it SHALL outlive the request that read it, so that it
can be absent but never stale.

#### Scenario: A command that needs a branch, a delivery type or a time slot

- **WHEN** a command calls a tool that requires any of the three
- **THEN** the values are read off the cart the process read for that command, and the caller is
  asked for none of them

#### Scenario: The background process ends

- **WHEN** the background process exits for any reason
- **THEN** the cart goes with it, and nothing on disk describes it

#### Scenario: Logging out

- **WHEN** the user logs out
- **THEN** the background process stops and the cart of the previous identity cannot outlive it

### Requirement: The cart is read afresh whenever one is wanted

The background process SHALL start and listen without touching the cart, so that starting turns only
on the session being authorized and a command needing no cart is served by a process that has never
read one.

Every request needing the cart SHALL ask the server which cart is active and then read that cart,
both calls, every time. It SHALL NOT answer from a cart read earlier. The CLI is a second client
beside the website and the mobile app, all three writing the one cart, and it is given no way to
learn that another has written: the tool surface offers no subscription, no revision and no
conditional read. The website holds a cached cart only because a push channel tells it when that
cache is stale — measured on 2026-09-02, it re-read the cart within two seconds of a write made
through this CLI, three times out of three, while ninety seconds of inactivity produced no request at
all. Lacking that channel, the CLI SHALL pay the second call rather than serve a snapshot it has no
way to know is wrong. Only after the cart is read SHALL the time slot be checked.

#### Scenario: The process comes up

- **WHEN** the background process starts
- **THEN** it listens once the session is authorized, and reads no cart until a request asks for one

#### Scenario: A command that needs no cart

- **WHEN** a command that does not work within the cart is served
- **THEN** no cart is read on its behalf

#### Scenario: Every read is a pair

- **WHEN** any request needing the cart is served
- **THEN** the active cart is confirmed and that cart is read, and neither call is skipped on the
  grounds that a cart was read before

#### Scenario: A cart another client changed

- **WHEN** the cart is edited on the website or in the mobile app between two commands
- **THEN** the second command already reflects the edit, because it read the cart rather than
  recalling it

#### Scenario: The active cart is a different one

- **WHEN** the server names a cart other than the one read last
- **THEN** that cart is the one read, and it becomes the cart the session works within

### Requirement: The process owns the cart and the CLI consumes it

The background process SHALL offer the cart through operations named for what they do to it —
reading it, adding products, removing them, emptying it, changing its delivery settings, applying
certificates — and SHALL NOT let the name of a tool cross that boundary. A command SHALL name the
operation and its subject, never the tool that carries it out.

Every change SHALL be made by the process, which SHALL read the cart back immediately after each one
and answer the command with both what the write reported and the cart that resulted. No command SHALL
call a cart tool itself, so that there is one path to the cart and one moment at which it can change.
The cart the process keeps between calls SHALL serve only the operations that need what the last cart
carried — reopening one that was ordered away, and repairing a slot — and SHALL never be answered to a
read in place of a fresh one.

#### Scenario: A command asks for the cart

- **WHEN** a command needs the cart
- **THEN** it asks the process for the current cart, and receives it as the state of a cart rather
  than as the answer of a named tool

#### Scenario: A command changes the cart

- **WHEN** a command adds, removes, clears, updates settings or applies certificates
- **THEN** it names that operation, and the process makes the call, reads the cart back, and answers
  with the confirmation and the resulting cart

#### Scenario: No tool name crosses the boundary

- **WHEN** a command works with the cart
- **THEN** nothing it passes or receives names a tool, so the tools the cart is built from can change
  without any command changing

#### Scenario: A write is not read from what it reported

- **WHEN** a command changes the cart
- **THEN** what it prints comes from the read the process made afterwards, not from what the write
  echoed or from what the command sent, because a write answers with nothing the cart could be taken
  from

#### Scenario: Nothing sniffs the traffic

- **WHEN** the process proxies a tool call for a command
- **THEN** it forwards the answer untouched, and does not inspect it to decide whether it concerns
  the cart

### Requirement: A missing cart is reported, never invented

Where the user has no cart, the CLI SHALL say so and SHALL NOT create one on its own behalf, because
nothing it could read tells it where this order belongs: a saved address list spans years and cities,
the branch listing is ordered by nothing the user would recognise, and a cart opened at the wrong
place prices every listing against the wrong store without looking wrong. The reason SHALL be short
and constant, and it SHALL be the skill, not the message, that carries what to do about it.

Where a cart was held and the server stops naming one — the cart having been ordered away — the CLI
SHALL open a replacement on the settings that cart carried, because those are the user's own choice
rather than a guess: the same branch, the same delivery type, the same address, and the same slot
where it can still be booked. This SHALL be the only case in which reading the cart creates one.

The absence SHALL NOT be remembered. Every request SHALL ask the server afresh, so that a cart made
elsewhere is picked up by the next command rather than after the process has idled out.

#### Scenario: No cart at all

- **WHEN** a command needs the cart, the account has none, and none was held
- **THEN** it fails saying the account has no shopping cart, and nothing is created, read or guessed
  at on its behalf

#### Scenario: The cart is ordered away mid-session

- **WHEN** the server stops naming an active cart while one is held
- **THEN** a cart is opened again on the branch, delivery type, address and slot the held one
  carried, and it becomes the cart the session works within

#### Scenario: The slot the held cart carried has lapsed

- **WHEN** a cart is opened again and the slot it carried has already passed
- **THEN** the branch's first available slot is taken instead, because a lapsed slot cannot open
  anything

#### Scenario: A cart made elsewhere

- **WHEN** a cart is created outside the CLI after a command has already failed for want of one
- **THEN** the next command finds it, because the absence was never cached

#### Scenario: A cart that names no branch

- **WHEN** the cart the server hands back carries no shipment
- **THEN** it is still served as the cart it is, and only a command that needs the branch fails,
  saying the cart names no branch

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

### Requirement: The stored address survives a repair

Where the CLI writes the cart on its own behalf, it SHALL send the address exactly as the cart
carries it, field for field, because the server replaces the stored address with what it is given
rather than merging into it. The CLI SHALL NOT reduce an address to the fields it happens to care
about.

#### Scenario: Repairing a slot on a cart with a full address

- **WHEN** the CLI writes the cart to replace a lapsed slot, and the cart's address carries a city,
  a street and a house
- **THEN** every one of those fields is sent back unchanged, and the address after the write is the
  address before it

#### Scenario: Repairing a slot on a cart with a sparse address

- **WHEN** the cart's address carries only the fields the server itself stored
- **THEN** exactly those fields are sent, and no field is invented to fill a gap
