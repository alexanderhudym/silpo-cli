## 1. Storage

- [x] 1.1 Add the `branches` and `companies` tables to the schema in `src/db/database.ts`: local id as autoincrement primary key, remote id text not null unique
- [x] 1.2 Add `src/db/stores.ts` with an upsert per kind keyed on the remote id, a bulk upsert for a whole store listing, and lookups by local id and by remote id, selecting before inserting so a repeat spends no number
- [x] 1.3 Cover the storage module with tests: a new row takes the next number of its own kind, a repeat keeps its number, a branch and a company may hold the same number, and a row cannot be written without a remote id

## 2. Resolving a branch and a company

- [x] 2.1 Add the resolver: digits are looked up as a local number, a value in the form of a uuid is returned as typed and recorded nowhere, anything else fails the command naming the value
- [x] 2.2 Give the resolver its filling path — an unrecorded number makes it list the stores, paging until it holds the total the server reported, record every branch and every company that answer names, and retry the lookup once
- [x] 2.3 Make the fill happen at most once per command however many arguments missed, and never from a render
- [x] 2.4 Cover the resolver with tests: each input form, a number resolved only after the fill, a number still unresolved after it, a company filled from the branches that name it, two misses in one command sharing one fill, and a value in neither form

## 3. Recording what is printed

- [x] 3.1 Record every branch and company the store listing carries, and print their local numbers in place of the two aliases
- [x] 3.2 Fold the store listing's city and street into one address value through `formatAddress`, dropping the line where the payload carries neither
- [x] 3.3 Record and print the branch of each delivery option as a local number
- [x] 3.4 Record and print the company and branch of every cart shipment as local numbers
- [x] 3.5 Record and print the company of a product listing's `common` section, of a record that disagrees with it, and of a product card as local numbers

## 4. Inputs

- [x] 4.1 Resolve `--branch-id` through the new resolver on every command that takes one: the offline orders, the four product listings, the replacements, the product card and the cart move
- [x] 4.2 Resolve the positional branch of the slot listing through the resolver
- [x] 4.3 Resolve `--company-id` on the replacements through the resolver
- [x] 4.4 Teach the JSON argument walk a second kind of field, so a cart item resolves `productId` as an alias while `companyId` and `branchId` resolve as local numbers, at any depth
- [x] 4.5 Update the option help of every touched argument to name what it now accepts, in the same words across commands

## 5. Retiring the two aliases

- [x] 5.1 Remove `branch` and `company` from the alias entities in `src/utils/alias.ts`
- [x] 5.2 Check that no render and no argument still reaches for either of them, and that `silpo aliases` still works with the entities that remain

## 6. Tests and fixtures

- [x] 6.1 Refresh the store listing fixture so it carries a store with no city, one with no street, one whose external number is not digits, and two stores sharing an address
- [x] 6.2 Update the store listing tests for the local numbers, the folded address and the absent address line
- [x] 6.3 Update the cart, delivery and product tests for the branches and companies they print
- [x] 6.4 Update the command input tests for a JSON argument that mixes an alias with two local numbers
- [x] 6.5 Update the alias tests that named a branch or a company
- [x] 6.6 Update the golden tests covering store, cart, delivery and product output
- [x] 6.7 Run the full suite

## 7. Documentation

- [x] 7.1 Record what was measured for this change: 455 branches returned in one answer that reports a page size of 50, one company across all of them, 450 of 455 external numbers made of digits and all 455 unique with the numeric ones running from 1932 to 791091, and 63 groups of stores sharing a city and an address with 8 carrying no city and 7 no address
- [x] 7.2 Update the alias section of `README.md`, whose worked example passes a branch and a company as handles
