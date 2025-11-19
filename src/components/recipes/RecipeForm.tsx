'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRecipe, updateRecipe } from '@/app/actions/recipe';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Recipe, RecipeSection, RecipeSectionIngredient, Ingredient } from '@prisma/client';

type RecipeWithSections = Recipe & {
  sections: (RecipeSection & {
    ingredients: (RecipeSectionIngredient & {
      ingredient: Pick<Ingredient, 'id' | 'name' | 'unit' | 'costPerUnit'>;
    })[];
  })[];
};

interface RecipeFormProps {
  bakeryId: string;
  recipe?: RecipeWithSections;
  availableIngredients: Array<{ id: string; name: string; unit: string }>;
}

interface SectionFormData {
  id?: string;
  name: string;
  order: number;
  instructions: string;
  ingredients: Array<{
    id?: string;
    ingredientId: string;
    quantity: number;
    unit: string;
  }>;
}

export function RecipeForm({ bakeryId, recipe, availableIngredients }: RecipeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: recipe?.name ?? '',
    description: recipe?.description ?? '',
    yield: recipe?.yield ?? '',
  });

  const [sections, setSections] = useState<SectionFormData[]>(
    recipe?.sections.map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      instructions: s.instructions,
      ingredients: s.ingredients.map((ing) => ({
        id: ing.id,
        ingredientId: ing.ingredientId,
        quantity: Number(ing.quantity),
        unit: ing.unit,
      })),
    })) || [
      {
        name: 'Main',
        order: 0,
        instructions: '',
        ingredients: [],
      },
    ]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = recipe
        ? await updateRecipe({
            id: recipe.id,
            ...formData,
            description: formData.description || null,
            sections,
          })
        : await createRecipe({
            bakeryId,
            ...formData,
            description: formData.description || null,
            sections,
          });

      if (result.success) {
        router.push('/dashboard/recipes');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save recipe');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        name: `Section ${sections.length + 1}`,
        order: sections.length,
        instructions: '',
        ingredients: [],
      },
    ]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ];

    // Update order values
    newSections.forEach((section, i) => {
      section.order = i;
    });

    setSections(newSections);
  };

  const updateSection = (index: number, field: keyof SectionFormData, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const addIngredient = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].ingredients.push({
      ingredientId: availableIngredients[0]?.id || '',
      quantity: 0,
      unit: availableIngredients[0]?.unit || 'g',
    });
    setSections(newSections);
  };

  const removeIngredient = (sectionIndex: number, ingredientIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].ingredients = newSections[sectionIndex].ingredients.filter(
      (_, i) => i !== ingredientIndex
    );
    setSections(newSections);
  };

  const updateIngredient = (
    sectionIndex: number,
    ingredientIndex: number,
    field: string,
    value: any
  ) => {
    const newSections = [...sections];
    newSections[sectionIndex].ingredients[ingredientIndex] = {
      ...newSections[sectionIndex].ingredients[ingredientIndex],
      [field]: value,
    };

    // Update unit when ingredient changes
    if (field === 'ingredientId') {
      const ingredient = availableIngredients.find((ing) => ing.id === value);
      if (ingredient) {
        newSections[sectionIndex].ingredients[ingredientIndex].unit = ingredient.unit;
      }
    }

    setSections(newSections);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Recipe Name *</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            maxLength={200}
            placeholder="e.g., Classic Sourdough"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Description</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={2000}
            placeholder="Brief description of the recipe..."
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Yield *</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={formData.yield}
            onChange={(e) => setFormData({ ...formData, yield: e.target.value })}
            required
            maxLength={100}
            placeholder="e.g., 2 loaves, 12 baguettes"
          />
        </div>
      </div>

      <div className="divider">Recipe Sections</div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="card bg-base-200 shadow-md">
            <div className="card-body">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1"
                      value={section.name}
                      onChange={(e) => updateSection(sectionIndex, 'name', e.target.value)}
                      placeholder="Section name (e.g., Poolish, Dough)"
                      maxLength={100}
                    />
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => moveSection(sectionIndex, 'up')}
                        disabled={sectionIndex === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => moveSection(sectionIndex, 'down')}
                        disabled={sectionIndex === sections.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    {sections.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={() => removeSection(sectionIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Instructions</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered h-32"
                      value={section.instructions}
                      onChange={(e) =>
                        updateSection(sectionIndex, 'instructions', e.target.value)
                      }
                      placeholder="Step-by-step instructions for this section..."
                      maxLength={10000}
                    />
                  </div>

                  {/* Ingredients */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label-text font-semibold">Ingredients</label>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => addIngredient(sectionIndex)}
                        disabled={availableIngredients.length === 0}
                      >
                        <Plus className="h-3 w-3" />
                        Add Ingredient
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.ingredients.map((ingredient, ingredientIndex) => (
                        <div key={ingredientIndex} className="flex gap-2">
                          <select
                            className="select select-bordered select-sm flex-1"
                            value={ingredient.ingredientId}
                            onChange={(e) =>
                              updateIngredient(
                                sectionIndex,
                                ingredientIndex,
                                'ingredientId',
                                e.target.value
                              )
                            }
                          >
                            {availableIngredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            className="input input-bordered input-sm w-24"
                            value={ingredient.quantity}
                            onChange={(e) =>
                              updateIngredient(
                                sectionIndex,
                                ingredientIndex,
                                'quantity',
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <span className="text-sm self-center w-12">{ingredient.unit}</span>
                          <button
                            type="button"
                            className="btn btn-error btn-sm"
                            onClick={() => removeIngredient(sectionIndex, ingredientIndex)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {section.ingredients.length === 0 && (
                        <p className="text-sm text-base-content/50">No ingredients added yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-outline w-full" onClick={addSection}>
          <Plus className="h-4 w-4" />
          Add Section
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Saving...
            </>
          ) : recipe ? (
            'Update Recipe'
          ) : (
            'Create Recipe'
          )}
        </button>
      </div>
    </form>
  );
}
