## Context

See proposal.md — Why. Two constraints shape everything below.

`claude -p` takes one argv string and has no attachment flag, so an errand that starts from a file
has to reach the agent as a path it reads itself. The run's working directory is created empty per
run, outside the repository, and wiped between runs — which makes it the one place a file can be
put without leaking into the next run.

The account is live, shared and single. The reset clears the cart and re-points it at a base store;
it does not touch favourites, certificates, stored restrictions or history. Anything a flow writes
outside the cart stays there for every run after it.

## Goals / Non-Goals

**Goals:**

- A flow can be added by writing one file. Nothing in the harness should need editing to admit it.
- An errand can begin outside Silpo without the harness treating that as a broken setup.
- A run that fails should be recorded as a failed run of that arm, and only a genuinely broken
  machine should stop the matrix.

**Non-Goals:**

- Running the full matrix. This change proves each flow is passable; measurement is separate.
- Parallelising runs. Considered and dropped: the plugin install/uninstall in `setArm` is global,
  the cart is shared, and contention would corrupt wall-clock, which is a reported metric.
- Judging prose. The checks settle what the cart shows. Whether an answer is any good is read by a
  person, and the flow files say which criteria are which.

## Decisions

**Criteria live in the flow file, in a fenced block, parsed like the prompt.** The alternative was
to keep them in the analyzer and extend the `if/else` chain per flow. That chain is what made the
suite unable to grow: its `else` passed only an empty cart, so every write flow after flow 2 would
have been born failing. A checker that must be edited whenever a flow is added drifts away from the
criteria it enforces. The grammar is deliberately tiny — `field: [op] value` over `products`,
`delivery`, `slot` and `total`, the facts `cart details` actually prints — because a richer one
would invite encoding judgements that belong to a reader.

**Assets are copied in; only the top level ships.** Referencing the repository path directly would
have been simpler and wrong: the path would differ from what the agent's own directory contains and
the file would be shared rather than per-run. `source/` is excluded because the working directory is
readable by the agent — shipping the HTML a list image was rendered from would hand it the list as
text, and the flow would measure nothing it exists to measure. This was caught in the smoke: the
first implementation copied the whole directory.

**Unreached is a run outcome, a leak is a halt.** An errand that starts on the open web gives an
agent a half to drown in before Silpo, and drowning there is a finding about the arm. A leak means
the arms were never separated and nothing measured under it can be trusted, so it still halts. Three
unreached runs in a row on one arm halt too, because that is what a dead credential looks like and
it stops looking like a bad run.

**The reset waits rather than fails.** Cart writes are rate-limited; the reset is two writes at the
top of a run and two at the tail, and a matrix is the workload guaranteed to trip that. It did: six
of the first thirty runs died in the reset before their agent was ever launched. The limit is on how
often, not how many, so waiting is the whole fix. A rate limit surviving four backoffs is still not
a broken setup, so it becomes transient and the matrix takes the run again.

**The payment check is scoped to Silpo's hosts.** `pay` is an ordinary substring of an English
recipe URL and of a search query. Once errands reach the open web, an unscoped check reports runs
that did nothing wrong, and a signal that cries wolf is worse than none.

**The fetch route is counted per run.** Whether an agent used `WebFetch` or fell back to the shell
is a property of the model, not of the arm, and the two differ by an order of magnitude in tokens.
The smoke showed both on the same errand. Without the counts, those runs are indistinguishable in
the metrics and cannot be grouped before they are compared.

**External payload is reported apart from the rest.** An external step costs both arms the same, so
it sits in numerator and denominator alike and drags any ratio computed over the whole run toward
zero. Pooling external and internal flows into one headline would show a saving shrinking every time
a recipe flow is added, with nothing about the CLI changed.

**The destination cascade is steered by the named delivery type, not checked after the fact.** The
cascade tries saved addresses, then stores, then the geocoder, and only then Nova Poshta, and it
does this without looking at what the caller asked for. `SelfPickup` can only ever be served by a
store and a Nova Poshta type only by an office, so a text that lands anywhere else has already
failed — but the failure surfaces as "SelfPickup does not serve this destination", which points the
caller at the one part of their request that was correct. Steering the cascade fixes three of the
smoke's six errors and the parked Nova Poshta dead end with one mechanism, because they are the
same defect: one option carrying addresses, branches and post offices, and no way to say which was
meant.

**The good store matcher already exists; it is simply not on this path.** `silpo stores` geocodes
the text and compares the parsed settlement, street and building against the branches, with fuzzy
street matching and a guard against matching on words most branches share. The destination path
instead asks whether a branch's address string *contains* the caller's text — literal, so `вулиця`
misses a branch spelling it `вул.`, and the shop's name written ahead of its address misses
everything. Rather than write abbreviation tables, the parsed matcher is put behind the containment
test on this path too. The server does the parsing; we stopped throwing its answer away.

**Containment stays as the first try rather than being replaced.** Not for speed: it matches a
fragment carrying neither settlement nor building — a bare street name — which a geocoded lookup
cannot resolve. It also keeps the harness's own reset, which matches by containment and runs sixty
times a matrix, on exactly the path it is on today. A resolution change that broke the reset would
not fail one flow, it would fail every run.

**The skill is corrected here; the CLI is corrected here too.** An earlier draft of this change
deferred the CLI half on the grounds that fixing arm A ages the smoke. It does, and flows 2, 12, 13
and 14 are re-run because of it. Deferring cost more than it saved: the benchmark exists to measure
a boost, and measuring one against an arm with a known resolution defect in it measures the defect.

**The skill fix and the CLI fix, seen together.** Both would change what arm A is and both would
age the smoke, so the split is by what the defect costs to fix and where it lives. The skill rule
is one paragraph implementing a requirement the spec already carries, and re-validating it costs
six runs. `cart setup --to` is a resolution defect in `src/resolve/` under two delivery specs, it
already has a change waiting for it over Nova Poshta, and the two are the same defect seen from
different sides — one option carrying addresses, branches and post offices at once, with a
candidate list it prints and then refuses. Fixing half of it inside a benchmark change would leave
the other half in a change that can no longer be measured against a stable baseline.

**A transient failure must not wear a semantic message.** Three defects here are the same shape: a
call fails for a passing reason, and the CLI reports it as a fact about the request. The ten-second
daemon bound said the daemon had failed when the daemon was working, and an agent concluded the
command could not take long lists. A rate-limited slot repair was reported as a branch with no slots
available, and an agent went hunting for slots the listing said were there. Each cost a run more
than the underlying failure would have. So: a bound that expires says which bound it was, and a
repair that fails keeps its reason and the refusal speaks it.

**A rate-limited call may be repeated; a timed-out one may not.** They look alike and are opposites.
The limiter refuses a call ahead of the work, so it never reached the cart and repeating cannot write
twice — and the server says as much, "Please wait and try again". A call that timed out may have
landed. So the retry is scoped to the rate limit by matching its message, and every other failure
propagates untouched.

**The caps come from the served schemas, not from a table.** Nine tools publish a `maximum` on their
own `limit`, which is where the validation error came from in the first place. The repository already
holds a hand-written table of the same numbers in `test/harness.ts`, and it carries a cap for a tool
the server does not declare one for — which is what table drift looks like when you find it.

**Paging sits at the session's call, not at the typed surface.** The first implementation paged in
`createSurface`, built clean and changed nothing, because the commands do not use the session's
surface: they use the one in `daemon/client.ts`, which serialises over the socket, and the daemon
answers by calling `session.callTool` directly. That call is the single place every path converges,
so paging there covers the commands, the daemon's own surface and `silpo raw` alike — and N server
calls still cost one socket round trip.

**A repair is folded into the write that follows it rather than written ahead of it.** `setup` was
repairing the slot of the branch it was about to leave, one cart write before overwriting it. Since
every destination change already arrives carrying a slot chosen at the branch it is moving to, that
repair existed only to be discarded. It was not free: the server refuses a third cart write in quick
succession, and a single destination change onto a lapsed cart made three.

**The repair on the read path stays.** A read of a lapsed cart still costs a cart write, which is a
real cost now measured. It is also specified, and the skill tells the agent a read repairs the slot,
so removing it is a change to both rather than a bug fix. Left standing and recorded.

## Risks / Trade-offs

**An external source changes or disappears** → One external flow still depends on a live URL, down
from three. Mitigated by preferring inputs that cannot drift where the errand allows it — flows 6 and
7 ship their files and touch no network — and by the runner's `prompt` subcommand, which resolves
every flow in a second so a dead reference is found before a matrix rather than during one. Flow 7 is
the worked example of the drift: its pin's own outbound blog dropped the recipe between the flow being
written and being re-run.

**The list image is a render, not a photograph** → Even lighting, uniform letterforms, no creases.
Real handwriting is harder, so the flow under-tests transcription. Stated in the flow file. A
genuine photograph would strengthen it and would change no criterion.

**Which fetch route an agent picks was variance we did not add** → On the smoke, one arm recovered
from a dead `WebFetch` by falling back to curl and the other gave up and asked. It is counted per
run so populations can be separated, and for flow 7 it was removed outright rather than measured
around: the page is shipped and the prompt forbids looking the recipe up. Flow 8 still fetches a
live recipe page, where the fetch is the errand rather than an obstacle before it.

**A smoke gate invites weakening criteria until they pass** → Criteria are written and committed
before the run that tests them. The smoke produced two failures and neither criterion was relaxed:
one was a criterion that contradicted its own prompt and was corrected to match it, the other was
an agent that gave up, left standing as a failure.

**Anomaly detection is inert at one run per cell** → `anomalies` compares a run against its cell's
median, and a cell of one has no spread. The smoke reported zero anomalies while containing a
69-step run against a 5-step one on the same errand. It measures nothing until repeats exist.
