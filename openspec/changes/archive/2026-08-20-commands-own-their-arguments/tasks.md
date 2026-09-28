## 1. Rebuild the recorded invocation from the parser

- [x] 1.1 Write the reconstruction that reads the command path, the positional arguments,
      and the parsed options, turning each option name back into its long flag and
      expanding a gathered list into one entry per element
- [x] 1.2 Run it side by side with the existing argv tokenizer over the current tests and
      over real invocations, and record where the two disagree
- [x] 1.3 Confirm the only disagreements are the two the design predicts: a short flag
      recorded under its long name, and a repeated option grouped at its first appearance
- [x] 1.4 Switch call recording to the reconstruction and update `test/calls.test.ts`

## 2. Alias resolution named by the command

- [x] 2.1 Give the JSON argument reader a field-to-entity mapping supplied by its caller
- [x] 2.2 Declare that mapping at each command that takes a JSON argument, from the shape
      that command accepts
- [x] 2.3 Remove the key-to-entity table and its lookup from `src/aliases.ts`
- [x] 2.4 Keep every case in `test/aliases.test.ts` and `test/options.test.ts` passing,
      including aliases nested at depth inside a JSON argument

## 3. Conversion moves into the actions

- [x] 3.1 Decide how a command raises a conversion failure through commander's error path,
      and write it once so the seven files do it the same way
- [x] 3.2 Move alias conversion out of the option parsers; the option receives the alias as
      typed and the action converts it where it builds the call. Delete the `fromAlias`
      adapter — the conversion already passes through anything that is not an alias, so
      nothing between the argument and the action is left to do
- [x] 3.3 Remove `collectAliases`; a repeatable alias option gathers with the plain
      collector and the action converts each element
- [x] 3.4 Move time conversion out of the option parsers into the actions
- [x] 3.5 Move coordinate conversion out of the option parsers into the actions
- [x] 3.6 Move JSON reading and its alias expansion out of the option parsers into the
      actions
- [x] 3.7 Work through `products.ts`, `cart.ts`, `catalog.ts`, `delivery.ts`, `orders.ts`,
      `np.ts` and `branches.ts`, one file at a time, keeping the suite green after each

## 4. Removal and check

- [x] 4.1 Delete the argv tokenizer from `src/commands/input.ts` — the `--flag=value`
      split, the `--` handling, the option lookup by flag, and the arity check
- [x] 4.2 Drop the cases in `test/input.test.ts` that exercised the tokenizer and keep
      those that describe what is recorded
- [x] 4.3 Decide whether what is left of `src/commands/input.ts` belongs where the call is
      recorded instead
- [x] 4.4 Assert in a test that a command sends converted values to the tool while
      recording the typed ones, for an alias, a time, a coordinate pair and a JSON
      argument
- [x] 4.5 Wipe the database, run the full suite, and exercise one command of each argument
      kind by hand against a live account
