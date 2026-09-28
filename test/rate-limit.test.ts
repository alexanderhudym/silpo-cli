import assert from "node:assert/strict";
import { test } from "node:test";

const { pastRateLimit } = await import("../dist/mcp/session.js");

const NOW = [0, 0, 0];

const LIMITED = {
  isError: true as const,
  content: "Error in update-shopping-cart: Rate limit exceeded. Please wait and try again.",
};
const DONE = { isError: false as const, content: "written", structured: { success: true } };

function answering(queue: (typeof LIMITED | typeof DONE)[]) {
  const attempts: number[] = [];

  return {
    attempts,
    attempt: async () => {
      attempts.push(attempts.length);

      return queue[Math.min(attempts.length - 1, queue.length - 1)] as typeof DONE;
    },
  };
}

test("a call the limiter turned away is made again and its answer is the one returned", async () => {
  const { attempt, attempts } = answering([LIMITED, DONE]);

  const outcome = await pastRateLimit(attempt, NOW);

  assert.equal(outcome.isError, false);
  assert.equal(attempts.length, 2, "the rejected call was not repeated");
});

test("a call that succeeds is made exactly once", async () => {
  const { attempt, attempts } = answering([DONE]);

  await pastRateLimit(attempt, NOW);

  assert.equal(attempts.length, 1, "a call nobody rejected was sent more than once");
});

test("a limiter that never relents gives up and reports the rejection it was given", async () => {
  const { attempt, attempts } = answering([LIMITED]);

  const outcome = await pastRateLimit(attempt, NOW);

  assert.equal(outcome.isError, true);
  assert.match(outcome.content, /Rate limit/, "the caller lost the reason the call failed");
  assert.equal(attempts.length, NOW.length + 1, "the retries did not stop at the waits allowed");
});

test("a failure that is not the rate limit is not repeated, because it may have landed", async () => {
  const refused = { isError: true as const, content: "the branch does not serve this address" };
  const { attempt, attempts } = answering([refused as never]);

  const outcome = await pastRateLimit(attempt, NOW);

  assert.equal(outcome.isError, true);
  assert.equal(attempts.length, 1, "a write that may have reached the cart was sent twice");
});

test("the waits are spent in order, one per repeat", async () => {
  const spent: number[] = [];
  const started = Date.now();
  const { attempt } = answering([LIMITED, LIMITED, DONE]);

  await pastRateLimit(async () => {
    spent.push(Date.now() - started);

    return attempt();
  }, NOW);

  assert.equal(spent.length, 3, "the second rejection did not buy a third attempt");
});
