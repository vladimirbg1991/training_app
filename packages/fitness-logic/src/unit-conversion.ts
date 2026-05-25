const KG_PER_LB = 0.45359237;
const LB_PER_KG = 2.20462262;

export type WeightUnit = 'kg' | 'lb';

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === 'kg' ? value * LB_PER_KG : value * KG_PER_LB;
}

export function normalizeToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

export function formatWeight(value: number, unit: WeightUnit, decimals: number = 1): string {
  return `${value.toFixed(decimals)} ${unit}`;
}
