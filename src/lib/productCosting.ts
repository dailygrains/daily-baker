/**
 * Pure product costing helpers, shared by the server actions that persist costs
 * and the product form that previews them. Keeping one implementation means the
 * number a user sees while editing is the number that gets stored.
 */

export type CostBasis = {
  name: string;
  unitWeightG?: number | null;
  batchYieldQty?: number | null;
};

export type BatchBasis = {
  /** Ingredient cost of the whole scaled batch. */
  batchCost: number;
  /** Weight of the whole scaled batch in grams, or null if not derivable. */
  batchWeightG: number | null;
};

export type AllocationResult = { cost: number; warning?: string };

/**
 * Allocate a batch's ingredient cost to a single variation.
 *
 * Weight-based when the variation has a unit weight and the batch weight is
 * known — a 1000g loaf then carries twice the ingredient cost of a 500g one.
 * Otherwise falls back to the variation's explicit per-batch yield, which is
 * how count-based goods (cookies, rolls) are costed.
 */
export function allocateIngredientCost(
  variation: CostBasis,
  batch: BatchBasis
): AllocationResult {
  if (variation.unitWeightG != null && batch.batchWeightG != null && batch.batchWeightG > 0) {
    return { cost: batch.batchCost * (variation.unitWeightG / batch.batchWeightG) };
  }

  if (variation.batchYieldQty != null && variation.batchYieldQty > 0) {
    // Only worth flagging when weight-based costing was intended but couldn't
    // be delivered; a purely count-based variation is not a problem.
    const warning =
      variation.unitWeightG != null
        ? `"${variation.name}" has a unit weight but the recipe's batch weight could not be computed, so its batch yield was used instead.`
        : undefined;
    return { cost: batch.batchCost / variation.batchYieldQty, warning };
  }

  return {
    cost: 0,
    warning: `"${variation.name}" has no usable unit weight or batch yield, so its ingredient cost is 0.`,
  };
}

export type SupplyLine = {
  supplyId: string;
  quantity: number;
  wasteFactor: number;
  costOverride?: number | null;
};

/**
 * Sum a variation's packaging BOM, honouring per-line cost overrides.
 */
export function sumSupplyCost(lines: SupplyLine[], costMap: Map<string, number>): number {
  return lines.reduce((sum, line) => {
    const unitCost = line.costOverride ?? costMap.get(line.supplyId) ?? 0;
    return sum + unitCost * line.quantity * line.wasteFactor;
  }, 0);
}
