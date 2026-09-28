## MODIFIED Requirements

### Requirement: A scope selector takes a name as readily as a handle

Where an option names the scope a listing is drawn from — a category, a promotion, or a curated set
— it SHALL accept the handle the server issued for that scope, and SHALL also accept the scope's own
title written the way a person writes it. The two SHALL be one option, not two: a caller that knows
the title should not have to find the handle first, and a caller that holds the handle should not
have to spell the title.

A handle the server issued SHALL be used as given. A title SHALL be resolved by ranking the branch's
scopes against it, rather than by requiring it to be reproduced exactly, so that a scope named
approximately — a shortened word, a different ending — reaches the scope it names.

The ranking SHALL settle the value under the same policy that settles a product: where one scope
stands clearly above the rest, it SHALL be used; where the best matches stand too close together to
separate, or where the best is too weak to trust, the CLI SHALL print every candidate with its kind
and its handle and SHALL stop without listing anything. It SHALL NOT prefer one kind over another,
and SHALL NOT take the first or the highest-scoring match where the ranking did not separate it.
Where nothing matches at all, the command SHALL fail naming the value.

This last part is what a ranked resolution must be held to and an exact one never needed: a ranker
returns its least bad answer for any input whatever, so a value naming no scope must be caught by the
policy rather than by the absence of a match.

#### Scenario: A handle

- **WHEN** the scope option is given a handle the server issued, such as a category slug or a
  promotion code
- **THEN** that scope is used, and no search for a title happens

#### Scenario: A name matching one scope

- **WHEN** the scope option is given a title that matches exactly one category, promotion or set
- **THEN** that scope is used, and the listing is drawn from it

#### Scenario: A name written approximately

- **WHEN** the scope option is given a title close to a scope's own without reproducing it exactly
- **THEN** that scope is used, because the value was ranked rather than compared

#### Scenario: A name matching two scopes

- **WHEN** the scope option is given a title that ranks a category and a promotion too close to
  separate
- **THEN** both are printed with their kind and their handle, nothing is listed, and the command
  fails
- **AND** neither is chosen, whichever kind ranked first

#### Scenario: A name matching nothing

- **WHEN** the scope option is given a value no scope ranks strongly enough for
- **THEN** the command fails naming the value, and no listing is printed
- **AND** the least bad match is not used

## REMOVED Requirements

### Requirement: Selectors that exclude one another are refused before the call

**Reason**: The rule was a property of the server's tools rather than of the caller's question. Four
different MCP tools answer a scope listing, the saved products, the alternatives to a product and a
text search, so the CLI refused to combine them because no single tool could. But the combinations
have plain meanings — the saved products that lie in a category, a text searched inside a scope — and
the CLI already broke the rule once, for a query together with a scope, by paging the scope and
matching the text itself. This change finishes what that exception started.

**Migration**: Replaced by "Selectors compose by kind" in `product-search`, which states that
selectors repeated within one kind union, selectors of different kinds intersect, and a free-text
query is not a selector at all but the filter and the ordering over whatever the selectors chose. The
second half of the removed requirement — that a narrowing option conflicts with no selector — is
carried forward there unchanged.
