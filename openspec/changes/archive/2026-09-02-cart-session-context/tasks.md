## 1. Tool surface

- [x] 1.1 Refresh the recorded schema snapshot from the live server and commit the diff, so the
      snapshot again matches what `tools/list` returns
- [x] 1.2 Record the shapes this change relies on that the recorded contract
      predates: `exists` on `silpo_get_my_shopping_cart`, `markdownGroup` in the
      `product.offer.stock.max` context, the `product.offer.not_found` and
      `timeslot.not_available` messages, and the 500 an unresolvable branch produces
- [x] 1.3 Add the typed call for `silpo_create_shopping_cart` alongside the other tool wrappers
- [x] 1.4 Add the `exists` field to the typed result of `silpo_get_my_shopping_cart`

## 2. The session context

- [x] 2.1 Answer the cart from the background process over the daemon protocol, with the branch,
      delivery type and time slot read off it rather than kept beside it
- [x] 2.2 Read the cart only when a request wants it, so the daemon starts on the session alone and
      a command needing no cart never provokes a read
- [x] 2.3 Offer the cart through operations named for what they do to it, so no tool name reaches a
      command, and leave the proxy forwarding other answers without inspecting them
- [x] 2.6 Take the cart away from the commands: they ask the daemon for the current cart and name the
      change they want, and the daemon is what calls the tools and reads the cart back
- [x] 2.7 Confirm the active cart and read it on every request that needs one — both calls, every
      time — failing plainly when the server names none, without remembering the absence
- [x] 2.4 Drop the cart when the process exits, and confirm nothing writes it to disk
- [x] 2.5 Raise the `daemon.idleTimeout` default to `10m` and restate its description as bounding
      the process's life

## 3. Repair and opening

- [x] 3.1 Treat a slot whose end has passed as lapsed, without calling the server
- [x] 3.2 Treat a cart carrying a time slot validation at error level as lapsed
- [x] 3.3 Repair a lapsed slot by writing the branch's first slot reported available, echoing the
      cart's stored address field for field, and read the cart back whether or not the write reported
      success; where no slot is available leave the cart standing and still serve reads, refusing
      only writes
- [x] 3.5 Collapse the two delivery type unions the server has since made equal, and declare the
      narrower set `silpo_create_shopping_cart` takes beside that call rather than as a delivery
      entity of its own
- [x] 3.4 Say plainly that the account has no cart rather than inventing one, keep the message short
      enough to leave the instructions to the skill, and never remember the absence
- [x] 3.7 Open a cart again on the settings the held one carried when the server stops naming an
      active cart, taking an available slot where the one it carried has lapsed
- [x] 3.6 Open a cart from what the caller named — delivery type, time slot, branch and an address
      carrying coordinates — naming whichever of the four is missing, and typing the address after
      the delivery type where the address names no type of its own

## 4. Command surface

- [x] 4.1 Remove the `cart id` command
- [x] 4.2 Remove the `<cartId>` argument from `cart details`, `add`, `remove`, `clear`, `setup` and
      `certificates`
- [x] 4.3 Remove `--branch-id`, `--delivery-type`, `--timeslot-start` and `--timeslot-end` from the
      product, category, promotion and set commands, serving them from the context
- [x] 4.4 Remove the branch and company options from the replacements command that the context now
      supplies, keeping the company where it belongs to the product
- [x] 4.5 Delete cart aliasing — the resolver, the store and the table — now that nothing names a
      cart
- [x] 4.6 Stop printing the cart's identifier in the snapshot

## 5. Cart writes

- [x] 5.1 After an add, match `product.offer.stock.max` entries against the products the command
      itself sent, ignoring lines it did not touch
- [x] 5.2 Re-send the matched lines at the reported stock where it is above zero, and report what was
      asked for against what was kept
- [x] 5.3 Leave a line whose stock is zero, or which reports `product.offer.not_found`, in the cart;
      name it as unfillable and fail the command
- [x] 5.4 Fetch and print the replacements offered for an unfillable line, treating an empty answer
      as ordinary
- [x] 5.5 Close `add`, `remove`, `clear`, `setup` and `certificates` on the cart snapshot — summary
      first, what the CLI changed next, the cart beneath — reusing the read the command already made
      rather than issuing another
- [x] 5.6 Drop the echoed per-product quantities from the write output, now that the snapshot reports
      what the cart holds
- [x] 5.7 Rename `cart update` to `cart setup`, and make the delivery type, the time slot, the
      address and the shipments optional there, sending the cart's own value for each one the caller
      did not name

## 6. Output and accounting

- [x] 6.1 Print a category the server marks as not visible as unavailable, and say so rather than
      returning an unexplained empty listing when one is browsed
- [x] 6.2 Keep the calls the CLI makes on its own behalf out of the recorded history, including a
      cart read that a later one supersedes
- [x] 6.3 Record a command that rendered several payloads once, against their sum, naming the tools
      it rendered
- [x] 6.4 State in the gain report that it measures the payloads commands rendered

## 7. Skill and docs

- [x] 7.1 Replace the cart-derived context preamble with the statement that the context is implicit
      and repaired without being asked, and tell the agent what to ask the user when the account has
      no cart and how to open one
- [x] 7.2 State what the CLI does on its own — reduced quantities and unfillable lines — so the
      output is not read as an error
- [x] 7.3 Replace the re-read-after-every-write rule with the fact that a write already prints the
      cart it produced
- [x] 7.4 Restate the replacements entry as picking risk rather than zero stock, and add the
      not-visible category rule
- [x] 7.5 Update every command entry whose arguments or options changed, and confirm no page the
      plugin ships names a command that no longer exists
- [x] 7.6 Update the README where it shows a cart argument or the context options

## 8. Tests

- [x] 8.1 Cover the lifecycle: nothing is read until a request wants the cart, every read is the
      pair, a cart another client edited is seen on the next read, a replaced cart is read afresh,
      and a write reads it back
- [x] 8.2 Cover repair: a slot ended in the past repairs without a server round trip to discover it,
      a validation-driven repair, no available slot fails, a healthy slot is left alone
- [x] 8.3 Cover that a repair echoes a full address unchanged and a sparse one unchanged
- [x] 8.4 Cover reduction: over stock is reduced and reported, an untouched line is left alone,
      nothing to reduce writes once
- [x] 8.5 Cover unfillable lines for both zero stock and no offer, with and without replacements
- [x] 8.6 Cover that a missing cart is reported and never invented, that the absence is not
      remembered, and that opening one names whichever of the four the caller left out
- [x] 8.7 Cover that each write prints the resulting cart, that no echoed quantity appears, and that
      the cart is read once for the command rather than twice
- [x] 8.8 Cover that a write recording one entry counts both payloads against the text it printed
- [x] 8.9 Update the expected output fixtures for every command whose surface or output changed
- [x] 8.10 Cover that an update naming one setting sends the cart's own four beside it, that an
      address left out travels whole, and that one the caller gave is still sent as given
