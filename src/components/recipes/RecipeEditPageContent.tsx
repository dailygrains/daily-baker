'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface RecipeEditPageContentProps {
  bakeryId: string;
  recipe: {
    id: string;
    name: string;
    description: string | null;
    yield: string;
    totalCost: string;
    createdAt: Date;
    updatedAt: Date;
    bakeryId: string;
    sections: Array<{
      id: string;
      name: string;
      order: number;
      instructions: string;
      recipeId: string;
      ingredients: Array<{
        id: string;
        ingredientId: string;
        quantity: string;
        unit: string;
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
      <PageHeader
        title={`Edit ${recipe.name}`}
        sticky
        actions={
          <>
            <Link href="/dashboard/recipes" className="btn btn-ghost">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Link>
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
          </>
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
