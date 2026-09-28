import MiniSearch from "minisearch";

const WORD_SHAPE = /[\n\r\p{Z}\p{P}]+/u;

function queryWords(text: string): readonly string[] {
  return text
    .split(WORD_SHAPE)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 0);
}

export type MatchCandidate<T> = {
  readonly record: T;
  readonly score: number;
  readonly accounted: boolean;
};

export type Matcher<T> = {
  readonly search: (text: string) => readonly MatchCandidate<T>[];
};

export type MatchRule = {
  readonly prefix: boolean;
  readonly processTerm?: (term: string) => string;
};

export function buildMatcher<T, D extends { readonly key: string }>(
  records: readonly T[],
  key: (record: T) => string,
  fields: readonly string[],
  toDocument: (record: T) => D,
  rule: MatchRule,
): Matcher<T> {
  const byKey = new Map(records.map((record) => [key(record), record] as const));
  const mini = new MiniSearch<D>({
    fields: [...fields],
    idField: "key",
    ...(rule.processTerm === undefined ? {} : { processTerm: rule.processTerm }),
  });

  mini.addAll(records.map(toDocument));

  return {
    search(text: string): readonly MatchCandidate<T>[] {
      const words = queryWords(text);

      if (words.length === 0) return [];

      const processedWords = rule.processTerm === undefined ? words : words.map(rule.processTerm);
      const results = mini.search(text, { prefix: rule.prefix, fuzzy: false, combineWith: "OR" });

      return results.flatMap((result) => {
        const record = byKey.get(String(result.id));

        if (record === undefined) return [];

        const accounted = processedWords.every((word) => result.queryTerms.includes(word));

        return [{ record, score: result.score, accounted }];
      });
    },
  };
}
