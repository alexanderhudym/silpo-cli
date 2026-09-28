## Purpose

Gives command code a compile-time-checked way to call MCP tools, so that a wrong tool name, a wrong argument, or a field that is not on a response fails to build instead of failing silently at runtime.

## ADDED Requirements

### Requirement: One typed call per tool

The CLI SHALL expose exactly one typed call per tool published in the recorded schema snapshot, named after that tool, and SHALL type both its arguments and its result. Command code SHALL reach tool payloads through these calls rather than by naming tools as strings.

#### Scenario: Calling a tool with valid arguments

- **WHEN** command code invokes the typed call for a tool and supplies every required argument with the declared type
- **THEN** the code compiles and the call reaches the same background session that untyped calls use

#### Scenario: Tool name that does not exist

- **WHEN** command code tries to invoke a typed call for a name that is not a published tool
- **THEN** the build fails, rather than the call reaching the server and being rejected there

#### Scenario: Argument that the tool does not declare

- **WHEN** command code passes an argument whose name or type is not in the tool's declared input schema
- **THEN** the build fails

#### Scenario: Required argument omitted

- **WHEN** command code omits an argument the tool's schema lists as required
- **THEN** the build fails

#### Scenario: Tool that declares no arguments

- **WHEN** command code invokes the typed call for a tool whose input schema declares no properties
- **THEN** the call accepts no argument at all, rather than requiring an empty object

#### Scenario: Tool whose arguments are all optional

- **WHEN** command code invokes the typed call for a tool that declares properties but requires none of them
- **THEN** the argument object may be omitted entirely

#### Scenario: Reading a field the response does not carry

- **WHEN** command code reads a field that is not in the tool's declared output schema
- **THEN** the build fails, rather than yielding an undefined value at runtime

### Requirement: Typed results carry the whole response

Typed results SHALL carry every field the server returned, including the success marker, alongside the response's unstructured text content. A payload marking the call unsuccessful SHALL be returned as data rather than raised as a failure, because only some write tools can report it and a read command has nothing to do with it. Protocol-level errors SHALL keep failing.

#### Scenario: Successful call

- **WHEN** a tool returns a payload marked successful
- **THEN** the result carries every field of that payload, the success marker included, and the text content the server sent with it

#### Scenario: Payload marks the call unsuccessful

- **WHEN** a tool returns a payload marked unsuccessful
- **THEN** the result is returned with the marker set false, nothing is thrown, and the calling command decides whether that matters

#### Scenario: Server reports a protocol-level error

- **WHEN** the server answers a tool call with an error rather than a payload
- **THEN** the call fails with the server's message

#### Scenario: Successful response carries no structured payload

- **WHEN** a response is not an error yet carries no structured payload
- **THEN** the call fails, so that a typed result never stands for a payload that never arrived

### Requirement: Tool definitions are transport-independent

A tool's definition — its name, its argument type, and its result type — SHALL NOT depend on how the call is delivered. The in-process session and the background-process client SHALL both satisfy one declared surface built from those definitions, so that a definition is written once and neither transport can drift from it.

#### Scenario: Both transports offer the same tool

- **WHEN** a tool is defined once
- **THEN** the session that calls the server directly and the client that calls it through the background process both expose that tool with the same argument and result types

#### Scenario: Definitions do not reach for a transport

- **WHEN** a tool definition is compiled
- **THEN** it pulls in nothing from the background-process layer, so the dependency runs from the transports to the definitions and never back

### Requirement: Types follow the server's declared schema

Where the recorded schema snapshot describes a field, the type SHALL follow that declaration for nullability and for whether the field is optional — not the narrower shapes that live sampling happened to observe. No runtime validation of results against these types SHALL be added, because the MCP session already validates results against the server's own output schema.

#### Scenario: Schema allows null where samples never showed one

- **WHEN** the schema declares a field as nullable but every recorded live response carried a value
- **THEN** the type declares the field nullable, and command code must handle the null case

#### Scenario: Schema omits a field from its required list

- **WHEN** the schema declares a property but does not list it as required
- **THEN** the type marks the field optional

#### Scenario: Server sends a field the schema does not declare

- **WHEN** a response carries a field absent from the declared schema
- **THEN** the call still succeeds and the extra field is simply not visible through the typed result

### Requirement: Documented types where the schema is silent

Where the schema declares an object without describing its contents, the type SHALL be taken from the recorded response contract instead, and SHALL be marked in place as documentation-sourced rather than schema-sourced, so a later reader knows it cannot be checked against the snapshot.

#### Scenario: Payload the schema declares as an unconstrained object

- **WHEN** a tool's schema describes a payload only as an object with no properties
- **THEN** its type comes from the recorded response contract and carries a note naming that source

#### Scenario: Structure the schema cannot express

- **WHEN** a payload is recursive and the schema therefore leaves it unconstrained
- **THEN** its type is written as a recursive type from the recorded response contract, with the same source note

### Requirement: Schema provenance is recorded

The schema snapshot the types were written from SHALL be committed alongside them, identifying the server version it was taken from, so that types can be traced to a declaration and a later snapshot can be compared against it to find server drift.

#### Scenario: Tracing a type to its source

- **WHEN** a reader asks why a field is typed as it is
- **THEN** the committed snapshot answers it, including which server version declared it

#### Scenario: Detecting server drift

- **WHEN** a fresh snapshot is taken from the server and compared with the committed one
- **THEN** added, removed, and retyped fields appear as differences that can be reviewed

### Requirement: Untyped tool access is preserved

The CLI SHALL keep its untyped path that calls any tool by name with an arbitrary JSON object of arguments and returns the payload unchanged. The typed calls SHALL be built on that path rather than replacing it.

#### Scenario: Untyped call to a tool that also has a typed call

- **WHEN** the user names a tool that has a typed call and passes arguments as JSON
- **THEN** the CLI calls it untyped and prints the payload as JSON, unaffected by the typed layer

#### Scenario: Untyped call to a tool the snapshot does not describe

- **WHEN** the user names a tool that the server publishes but the snapshot predates
- **THEN** the untyped call still works, giving access to tools before types are written for them

#### Scenario: Untyped call without arguments

- **WHEN** the user names a tool and passes no arguments
- **THEN** the CLI calls it with an empty argument object

#### Scenario: Untyped call returns the payload as the server sent it

- **WHEN** an untyped call succeeds
- **THEN** the printed payload carries every field the server returned, the success marker included, with nothing stripped from it

### Requirement: Typed payloads reach rendering

Rendering that selects fields of a payload entity SHALL be constrained to that entity's declared fields, so that a field name which does not exist fails to build instead of rendering as blank.

#### Scenario: Column naming a declared field

- **WHEN** a table column selects a field the entity declares
- **THEN** the code compiles and the column renders from that field

#### Scenario: Column naming a field that does not exist

- **WHEN** a table column selects a field name absent from the entity
- **THEN** the build fails, rather than the column silently rendering empty and being dropped
