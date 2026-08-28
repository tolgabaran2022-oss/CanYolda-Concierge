export const FREE_PET_LIMIT = 1;

export function resolveEffectivePetLimit(grandfatheredPetLimit: unknown): number {
  const parsedLimit = Number(grandfatheredPetLimit);
  return Number.isFinite(parsedLimit)
    ? Math.max(FREE_PET_LIMIT, Math.floor(parsedLimit))
    : FREE_PET_LIMIT;
}