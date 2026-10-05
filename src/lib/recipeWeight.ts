import { db } from '@/lib/db';

/**
 * Total batch weight computation for recipes.
 *
 * Product variations can be sized by weight (e.g. a 500g vs a 1000g loaf from
 * the same dough). To allocate a batch's ingredient cost across those sizes we
 * need the batch's total weight in grams, which is the sum of every ingredient
 * line converted to grams.
 *
 * Weight units convert directly. Volume units convert to mL first, then use the
 * ingredient's densityGramsPerMl. Lines that can't be resolved are reported in
 * `unresolved` rather than silently counted as zero — a partial sum would
 * understate the batch and inflate per-unit cost.
 */

const GRAM = 'g';
const MILLILITRE = 'mL';

export type RecipeWeightResult = {
  /** Total batch weight in grams, or null when nothing could be resolved. */
  totalGrams: number | null;
  /** Ingredient lines that could not be converted to grams. */
  unresolved: { ingredientName: string; quantity: number; unit: string; reason: string }[];
};

type ConversionEdge = { toUnit: string; factor: number };

/**
 * Build an adjacency map of the unit-conversion graph, loaded in one query.
 */
async function loadConversionGraph(): Promise<Map<string, ConversionEdge[]>> {
  const conversions = await db.unitConversion.findMany({
    select: { fromUnit: true, toUnit: true, factor: true },
  });

  const graph = new Map<string, ConversionEdge[]>();
  for (const c of conversions) {
    const edges = graph.get(c.fromUnit) ?? [];
    edges.push({ toUnit: c.toUnit, factor: Number(c.factor) });
    graph.set(c.fromUnit, edges);
  }
  return graph;
}

/**
 * Breadth-first search for a multiplicative factor from `fromUnit` to
 * `targetUnit`. Returns null when the target is unreachable.
 *
 * A search (rather than a direct lookup) means we only need the conversions
 * that are actually seeded: "cup -> mL" and "lb -> g" exist, but "tsp -> g"
 * never has to.
 */
function findFactor(
  graph: Map<string, ConversionEdge[]>,
  fromUnit: string,
  targetUnit: string
): number | null {
  if (fromUnit === targetUnit) return 1;

  const queue: { unit: string; factor: number }[] = [{ unit: fromUnit, factor: 1 }];
  const visited = new Set<string>([fromUnit]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.get(current.unit) ?? []) {
      if (visited.has(edge.toUnit)) continue;
      const factor = current.factor * edge.factor;
      if (edge.toUnit === targetUnit) return factor;
      visited.add(edge.toUnit);
      queue.push({ unit: edge.toUnit, factor });
    }
  }

  return null;
}

/**
 * Compute the total weight in grams of one unscaled batch of a recipe.
 *
 * Note this is the sum of raw ingredient weights, so it represents dough/batter
 * weight before any bake-off loss. Variation `unitWeightG` values are
 * interpreted on the same basis.
 */
export async function computeRecipeBatchWeightGrams(
  recipeId: string
): Promise<RecipeWeightResult> {
  const [sections, graph] = await Promise.all([
    db.recipeSection.findMany({
      where: { recipeId },
      select: {
        ingredients: {
          select: {
            quantity: true,
            unit: true,
            ingredient: { select: { name: true, densityGramsPerMl: true } },
          },
        },
      },
    }),
    loadConversionGraph(),
  ]);

  const unresolved: RecipeWeightResult['unresolved'] = [];
  let totalGrams = 0;
  let resolvedAny = false;

  for (const section of sections) {
    for (const line of section.ingredients) {
      const quantity = Number(line.quantity);
      const name = line.ingredient.name;

      // Direct weight conversion.
      const toGrams = findFactor(graph, line.unit, GRAM);
      if (toGrams !== null) {
        totalGrams += quantity * toGrams;
        resolvedAny = true;
        continue;
      }

      // Volume: convert to mL, then apply density.
      const toMl = findFactor(graph, line.unit, MILLILITRE);
      if (toMl === null) {
        unresolved.push({
          ingredientName: name,
          quantity,
          unit: line.unit,
          reason: `No conversion from "${line.unit}" to grams or millilitres`,
        });
        continue;
      }

      const density = line.ingredient.densityGramsPerMl;
      if (density === null) {
        unresolved.push({
          ingredientName: name,
          quantity,
          unit: line.unit,
          reason: `"${name}" is measured by volume but has no density set`,
        });
        continue;
      }

      totalGrams += quantity * toMl * Number(density);
      resolvedAny = true;
    }
  }

  return { totalGrams: resolvedAny ? totalGrams : null, unresolved };
}
