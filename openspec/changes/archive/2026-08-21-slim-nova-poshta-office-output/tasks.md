## 1. Compose the office record

- [x] 1.1 `src/commands/np.ts`: in `officesText`, drop the `number` and the `address` rows
- [x] 1.2 `src/commands/np.ts`: print the title as a bare row instead of `formatEntryAsRow("title", title)`, and place it last in the record, below every keyed row
- [x] 1.3 `src/commands/np.ts`: print the `status` row only when the status is not the literal the server sends for an office in service, and place it between the coordinates and the title
- [x] 1.4 Confirm the destructure in `officesText` still names only the fields the record uses, so an unused binding does not survive the cut

## 2. Cover the conditional status

- [x] 2.1 `test/fixtures/np.offices.json`: give exactly one office a status other than `Working`, leaving the other records as captured
- [x] 2.2 `test/fixtures/README.md`: record that this one status is invented, and why — no live office has ever reported anything else, so the conditional line has no captured data to exercise it
- [x] 2.3 Regenerate `test/expected/np.offices.txt` with `UPDATE_GOLDEN=1`, then read the diff and confirm it shows exactly the four intended edits: no `number`, no `address`, a keyless title moved last, and one `status` line surviving in one record

## 3. Write down what the probe found

- [x] 3.1 Record the NovaPoshta variant of `CartAddress` — the four fields a cart update actually needs, and the fields the tool description asks for that the server stores but never reads
- [x] 3.2 Record that the description's `type`-to-word mapping renders a `Пункт` as `Відділення`, naming a different office, and that leaving `street` unset is therefore safer than following the recipe
- [x] 3.3 State the boundary — the probe reached cart update, not checkout, so `street` is proven optional only up to that point
- [x] 3.4 Note the single unreproduced read-after-write that returned the previous address, marked as one observation rather than established behaviour

## 4. Verify

- [x] 4.1 Run the full suite; every golden file other than `np.offices.txt` must pass untouched
- [x] 4.2 Run `np offices` against the live server for one settlement and confirm the printed record matches the golden shape, including that no status line appears
