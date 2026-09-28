const VOWELS = new Set(["а", "е", "є", "и", "і", "ї", "о", "у", "ю", "я"]);

function isVowel(char: string): boolean {
  return VOWELS.has(char);
}

function indexOfVowelFrom(word: string, from: number): number {
  for (let index = from; index < word.length; index += 1) {
    if (isVowel(word.charAt(index))) return index;
  }

  return -1;
}

function rvStart(word: string): number {
  const vowel = indexOfVowelFrom(word, 0);

  return vowel === -1 ? word.length : vowel + 1;
}

function vowelConsonantRegionStart(word: string, from: number): number {
  const vowel = indexOfVowelFrom(word, from);

  if (vowel === -1) return word.length;

  for (let index = vowel + 1; index < word.length; index += 1) {
    if (!isVowel(word.charAt(index))) return index + 1;
  }

  return word.length;
}

function endsWithinRegion(word: string, suffix: string, regionStart: number): boolean {
  return word.length - suffix.length >= regionStart && word.endsWith(suffix);
}

function stripEnding(
  word: string,
  endings: readonly string[],
  regionStart: number,
): string | undefined {
  for (const ending of endings) {
    if (endsWithinRegion(word, ending, regionStart)) return word.slice(0, word.length - ending.length);
  }

  return undefined;
}

const PERFECTIVE_GERUND_ENDINGS = ["вшись", "вши", "шись", "ши"];

const REFLEXIVE_ENDINGS = ["ся", "сь"];

const ADJECTIVE_ENDINGS = [
  "ий",
  "ій",
  "а",
  "я",
  "е",
  "є",
  "і",
  "у",
  "ю",
  "ого",
  "ому",
  "ої",
  "их",
  "іх",
  "им",
  "ім",
  "ою",
  "ею",
  "єю",
  "ими",
  "іми",
  "його",
  "ьому",
  "ьої",
  "ьою",
];

const PARTICIPLE_FORMANTS = ["ован", "ен", "єн", "ан", "ян", "т", "уч", "юч", "ач", "яч"];

const PARTICIPLE_CASE_ENDINGS = ["ий", "а", "е", "і", "ого", "ому", "их", "им", "ими", "ою"];

const PARTICIPLE_ENDINGS = PARTICIPLE_FORMANTS.flatMap((formant) =>
  PARTICIPLE_CASE_ENDINGS.map((ending) => formant + ending),
);

const ADJECTIVE_OR_PARTICIPLE_ENDINGS = [...PARTICIPLE_ENDINGS, ...ADJECTIVE_ENDINGS].sort(
  (a, b) => b.length - a.length,
);

const VERB_ENDINGS = [
  "ати",
  "яти",
  "ити",
  "іти",
  "ути",
  "ать",
  "ять",
  "уть",
  "ють",
  "ите",
  "їте",
  "емо",
  "ємо",
  "имо",
  "їмо",
  "ить",
  "їть",
  "ете",
  "єте",
  "йте",
  "еш",
  "єш",
  "иш",
  "їш",
  "ла",
  "ло",
  "ли",
  "мо",
  "й",
  "в",
  "у",
  "ю",
  "е",
  "є",
  "и",
].sort((a, b) => b.length - a.length);

const NOUN_ENDINGS = [
  "еві",
  "ові",
  "ами",
  "ями",
  "ою",
  "ею",
  "єю",
  "ів",
  "ей",
  "ам",
  "ям",
  "ах",
  "ях",
  "ом",
  "ем",
  "єм",
  "а",
  "я",
  "и",
  "і",
  "у",
  "ю",
  "е",
  "є",
  "о",
].sort((a, b) => b.length - a.length);

const DERIVATIONAL_ENDINGS = ["ість"];

const SUPERLATIVE_ENDINGS = ["іш"];

export function stem(word: string): string {
  if (word.length === 0) return word;

  const lower = word.toLowerCase();
  const rv = rvStart(lower);

  let current = lower;

  const gerund = stripEnding(current, PERFECTIVE_GERUND_ENDINGS, rv);

  if (gerund !== undefined) {
    current = gerund;
  } else {
    current = stripEnding(current, REFLEXIVE_ENDINGS, rv) ?? current;

    const adjectival = stripEnding(current, ADJECTIVE_OR_PARTICIPLE_ENDINGS, rv);

    if (adjectival !== undefined) {
      current = adjectival;
    } else {
      const verb = stripEnding(current, VERB_ENDINGS, rv);

      current = verb ?? stripEnding(current, NOUN_ENDINGS, rv) ?? current;
    }
  }

  current = stripEnding(current, ["и"], rv) ?? current;

  const r1 = vowelConsonantRegionStart(current, 0);
  const r2 = vowelConsonantRegionStart(current, r1);

  current = stripEnding(current, DERIVATIONAL_ENDINGS, r2) ?? current;
  current = stripEnding(current, ["ь"], rv) ?? current;
  current = stripEnding(current, SUPERLATIVE_ENDINGS, rv) ?? current;

  if (current.endsWith("нн") && current.length - 1 >= rv) {
    current = current.slice(0, -1);
  }

  return current;
}
