'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createRecipe, updateRecipe } from '@/app/actions/recipe';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { MDXEditor } from '@/components/ui/MDXEditor';
import type { Recipe, RecipeSection, RecipeSectionIngredient, Ingredient } from '@/generated/prisma';

type RecipeWithSections = Omit<Recipe, 'totalCost'> & {
  totalCost: string | Recipe['totalCost'];
  sections: (Omit<RecipeSection, 'createdAt' | 'updatedAt' | 'ingredients'> & {
    createdAt?: Date;
    updatedAt?: Date;
    ingredients: (Omit<RecipeSectionIngredient, 'quantity' | 'ingredient'> & {
      quantity: string | RecipeSectionIngredient['quantity'];
      ingredient: Pick<Ingredient, 'id' | 'name' | 'unit'> & {
        costPerUnit?: number; // Computed from inventory weighted average
      };
    })[];
  })[];
};

interface RecipeFormProps {
  bakeryId: string;
  recipe?: RecipeWithSections;
  availableIngredients: Array<{ id: string; name: string; unit: string }>;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  showBottomActions?: boolean;
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
    preparation?: string | null;
  }>;
}

export function RecipeForm({
  bakeryId,
  recipe,
  availableIngredients,
  onFormRefChange,
  onSavingChange,
  showBottomActions = true,
}: RecipeFormProps) {
  const router = useRouter();
  const { submit, isSubmitting, error } = useFormSubmit({
    mode: recipe ? 'edit' : 'create',
    entityName: 'Recipe',
    listPath: '/dashboard/recipes',
  });
  const formRef = useRef<HTMLFormElement>(null);
  // Track mounted state to prevent MDXEditor onChange callbacks from triggering
  // state updates before the component is fully mounted or after unmount.
  // MDXEditor can fire onChange during its initial render, which would cause
  // React warnings about state updates on unmounted components.
  const isMounted = useRef(false);

  const [formData, setFormData] = useState({
    name: recipe?.name ?? '',
    description: recipe?.description ?? '',
    yieldQty: recipe?.yieldQty?.toString() ?? '1',
    yieldUnit: recipe?.yieldUnit ?? '',
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
        preparation: (ing as { preparation?: string | null }).preparation ?? null,
      })),
    })) || [
      {
        name: '',
        order: 0,
        instructions: '',
        ingredients: [],
      },
    ]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const yieldQty = parseInt(formData.yieldQty) || 1;
    await submit(
      () =>
        recipe
          ? updateRecipe({
              id: recipe.id,
              name: formData.name,
              description: formData.description || null,
              yieldQty,
              yieldUnit: formData.yieldUnit,
              sections,
            })
          : createRecipe({
              bakeryId,
              name: formData.name,
              description: formData.description || null,
              yieldQty,
              yieldUnit: formData.yieldUnit,
              sections,
            }),
      formData.name
    );
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        name: '',
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

  const updateSection = useCallback((index: number, field: keyof SectionFormData, value: unknown) => {
    if (!isMounted.current) return;
    setSections((prevSections) => {
      const newSections = [...prevSections];
      newSections[index] = { ...newSections[index], [field]: value };
      return newSections;
    });
  }, []);

  const addIngredient = useCallback((sectionIndex: number) => {
    setSections((prevSections) => {
      const newSections = [...prevSections];
      newSections[sectionIndex].ingredients.push({
        ingredientId: availableIngredients[0]?.id || '',
        quantity: 0,
        unit: availableIngredients[0]?.unit || 'g',
        preparation: null,
      });
      return newSections;
    });
  }, [availableIngredients]);

  const removeIngredient = useCallback((sectionIndex: number, ingredientIndex: number) => {
    setSections((prevSections) => {
      const newSections = [...prevSections];
      newSections[sectionIndex].ingredients = newSections[sectionIndex].ingredients.filter(
        (_, i) => i !== ingredientIndex
      );
      return newSections;
    });
  }, []);

  const updateIngredient = useCallback((
    sectionIndex: number,
    ingredientIndex: number,
    field: string,
    value: unknown
  ) => {
    if (!isMounted.current) return;
    setSections((prevSections) => {
      const newSections = [...prevSections];
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

      return newSections;
    });
  }, [availableIngredients]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(isSubmitting);
    }
  }, [isSubmitting, onSavingChange]);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Recipe Name *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            maxLength={200}
            placeholder="e.g., Classic Sourdough"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <textarea
            className="textarea textarea-bordered w-full h-24"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={2000}
            placeholder="Brief description of the recipe..."
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Yield *</legend>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              className="input input-bordered w-24"
              value={formData.yieldQty}
              onChange={(e) => setFormData({ ...formData, yieldQty: e.target.value })}
              required
            />
            <input
              type="text"
              className="input input-bordered flex-1"
              value={formData.yieldUnit}
              onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
              required
              maxLength={100}
              placeholder="e.g., loaves, baguettes, dozen cookies"
            />
          </div>
          <label className="label">
            <span className="label-text-alt">Quantity and description of what this recipe produces</span>
          </label>
        </fieldset>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Recipe Sections</h2>

        <div className="space-y-4 fieldset">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border border-base-300 rounded-lg p-4 bg-base-200">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    value={section.name}
                    onChange={(e) => updateSection(sectionIndex, 'name', e.target.value)}
                    placeholder="Section name - optional (e.g., Poolish, Dough)"
                    maxLength={100}
                  />
                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => moveSection(sectionIndex, 'up')}
                      disabled={sectionIndex === 0}
                      aria-label={`Move ${section.name} section up`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => moveSection(sectionIndex, 'down')}
                      disabled={sectionIndex === sections.length - 1}
                      aria-label={`Move ${section.name} section down`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-error btn-sm"
                      onClick={() => removeSection(sectionIndex)}
                      aria-label={`Delete ${section.name} section`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Ingredients</legend>
                  <div className="space-y-3">
                    {section.ingredients.map((ingredient, ingredientIndex) => (
                      <div key={ingredientIndex} className="flex flex-wrap gap-2 items-center">
                        <select
                          className="select select-bordered flex-1 min-w-[200px] text-base"
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
                          className="input input-bordered w-28 text-base"
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
                        <span className="text-base self-center w-16">{ingredient.unit}</span>
                        <input
                          type="text"
                          className="input input-bordered flex-1 min-w-[150px] text-base"
                          value={ingredient.preparation || ''}
                          onChange={(e) =>
                            updateIngredient(
                              sectionIndex,
                              ingredientIndex,
                              'preparation',
                              e.target.value || null
                            )
                          }
                          placeholder="Preparation (e.g., finely diced)"
                          maxLength={200}
                        />
                        <button
                          type="button"
                          className="btn btn-error btn-sm"
                          onClick={() => removeIngredient(sectionIndex, ingredientIndex)}
                          aria-label={`Remove ingredient from ${section.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {section.ingredients.length === 0 && (
                      <p className="text-sm text-base-content/50">No ingredients added yet</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-2"
                    onClick={() => addIngredient(sectionIndex)}
                    disabled={availableIngredients.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Ingredient
                  </button>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Instructions</legend>
                  <MDXEditor
                    markdown={section.instructions}
                    onChange={(markdown) =>
                      updateSection(sectionIndex, 'instructions', markdown)
                    }
                    placeholder="Step-by-step instructions for this section..."
                    className="min-h-[200px]"
                  />
                </fieldset>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-outline w-full" onClick={addSection}>
            <Plus className="h-5 w-5 mr-2" />
            Add Section
          </button>
        </div>
      </div>

      {/* Actions */}
      {showBottomActions && (
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
      )}
    </form>
  );
}
