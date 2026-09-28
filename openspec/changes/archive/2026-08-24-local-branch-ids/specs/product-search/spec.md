## MODIFIED Requirements

### Requirement: The company of a listing

A listing of products SHALL print the local number of the company that sells them once, in a
section named `common` standing between the summary and the records, rather than in every
record. Where the records of one payload do not all name the same company, each record SHALL
carry its own company row instead and the section SHALL NOT be printed, so that the section
never states something the payload contradicts. A single product card, which is one record and
not a listing, SHALL keep the company as a row of its own.

#### Scenario: One company for the whole listing

- **WHEN** every product of a listing names the same company
- **THEN** that company's local number is printed once under the `common` section above the
  records, and no record repeats it

#### Scenario: Records that disagree

- **WHEN** the products of one payload do not all name the same company
- **THEN** the `common` section is absent and every record carries its own company row

#### Scenario: A single card

- **WHEN** a product card is printed
- **THEN** its company is a row of the record, because one record is not a listing
