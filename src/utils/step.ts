const STEP_TOLERANCE = 1e-6;
const ARITHMETIC_PRECISION = 8;

function isUsableStep(step: number | undefined): step is number {
  return step !== undefined && step > 0;
}

export function isMultipleOfStep(quantity: number, step: number): boolean {
  if (step <= 0) return true;

  const ratio = quantity / step;

  return Math.abs(ratio - Math.round(ratio)) < STEP_TOLERANCE;
}

export function stepMultiple(whole: number, step: number): number {
  return Number((whole * step).toFixed(ARITHMETIC_PRECISION));
}

function wholeSteps(amount: number, step: number, round: (ratio: number) => number): number {
  const ratio = amount / step;
  const nearest = Math.round(ratio);

  return Math.abs(ratio - nearest) < STEP_TOLERANCE ? nearest : round(ratio);
}

export function ceilToStep(amount: number, step: number | undefined): number {
  return isUsableStep(step) ? stepMultiple(wholeSteps(amount, step, Math.ceil), step) : Math.ceil(amount);
}

export function floorToStep(amount: number, step: number | undefined): number {
  return isUsableStep(step) ? stepMultiple(wholeSteps(amount, step, Math.floor), step) : Math.floor(amount);
}
