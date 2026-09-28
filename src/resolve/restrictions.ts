import type { FoodRestriction } from "../mcp/entities/food-restriction.js";

const RESTRICTION_TRIGGERS: Readonly<Record<string, readonly string[]>> = {
  "vegan": [
    "молоко", "вершки", "сметана", "йогурт", "сир", "масло вершкове", "морозиво",
    "яйце", "яйця", "м'ясо", "м'ясн", "риба", "курка", "яловичина", "свинина",
    "індичка", "ковбаса", "бекон", "шинка", "мед",
  ],
  "vegetarian": [
    "м'ясо", "м'ясн", "риба", "курка", "яловичина", "свинина", "індичка",
    "ковбаса", "бекон", "шинка", "сало", "оселедець", "скумбрія",
  ],
  "pescatarian": ["м'ясо", "м'ясн", "курка", "яловичина", "свинина", "індичка", "ковбаса", "бекон", "шинка", "сало"],
  "lactose-free": ["молоко", "вершки", "сметана", "сир", "йогурт", "масло вершкове", "згущене молоко", "морозиво"],
  "gluten-free": ["хліб", "борошно", "макарони", "вермішель", "печиво", "булка", "сухарі", "манна крупа"],
  "no-sugar": ["цукор", "цукерки", "морозиво", "печиво", "варення", "шоколад", "тістечко", "вафлі"],
  "nut-free": ["горіх", "горіхи", "арахіс", "мигдаль", "фундук"],
  "halal": ["свинина", "бекон", "сало", "алкоголь"],
  "kosher": ["свинина", "бекон", "сало"],
};

export function detectRestrictionConflicts(
  name: string,
  restrictions: readonly FoodRestriction[],
): readonly FoodRestriction[] {
  const normalized = name.toLowerCase();

  return restrictions.filter((restriction) => {
    const triggers = RESTRICTION_TRIGGERS[restriction.slug];

    return triggers !== undefined && triggers.some((trigger) => normalized.includes(trigger));
  });
}
