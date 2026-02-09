'use client';

import { useState } from 'react';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { RecipeForm } from '@/components/recipes/RecipeForm';

interface RecipeEditPageContentProps {
  bakeryId: string;
  recipe: {
    id: string;
    name: string;
    description: string | null;
    yieldQty: number;
    yieldUnit: string;
    totalCost: string;
    createdAt: Date;
    updatedAt: Date;
    bakeryId: string;
    sections: Array<{
      id: string;
      name: string;
      order: number;
      instructions: string;
      useBakersMath: boolean;
      bakersMathBaseIndex: number;
      recipeId: string;
      ingredients: Array<{
        id: string;
        ingredientId: string;
        quantity: string;
        unit: string;
        preparation: string | null;
        sectionId: string;
        ingredient: {
          id: string;
          name: string;
          unit: string;
          costPerUnit?: number;
        };
      }>;
    }>;
  };
  availableIngredients: Array<{ id: string; name: string; unit: string }>;
}

export function RecipeEditPageContent({
  bakeryId,
  recipe,
  availableIngredients,
}: RecipeEditPageContentProps) {
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  return (
    <>
      <SetPageHeader
        title={`Edit ${recipe.name}`}
        sticky
        breadcrumbs={[
          { label: 'Recipes', href: '/dashboard/recipes' },
          { label: recipe.name, href: `/dashboard/recipes/${recipe.id}` },
          { label: 'Edit' },
        ]}
        actions={
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              'Update Recipe'
            )}
          </button>
        }
      />

      <RecipeForm
        bakeryId={bakeryId}
        recipe={recipe}
        availableIngredients={availableIngredients}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        showBottomActions={false}
      />
    </>
  );
}
