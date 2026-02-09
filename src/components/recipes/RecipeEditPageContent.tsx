'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import { TagManager } from '@/components/tags/TagManager';
import { deleteRecipe } from '@/app/actions/recipe';
import { useToast } from '@/contexts/ToastContext';
import { Trash2, Save } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color?: string | null;
  tagType?: { id: string; name: string };
}

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
    _count?: {
      productionSheetRecipes: number;
    };
  };
  availableIngredients: Array<{ id: string; name: string; unit: string }>;
  initialTags?: Tag[];
  tagTypes?: Array<{ id: string; name: string }>;
}

export function RecipeEditPageContent({
  bakeryId,
  recipe,
  availableIngredients,
  initialTags = [],
  tagTypes = [],
}: RecipeEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  async function handleDelete() {
    if (!recipe?.id) return;

    setIsDeleting(true);

    const result = await deleteRecipe(recipe.id);

    if (result.success) {
      showToast(`Recipe "${recipe.name}" deleted successfully`, 'success');
      router.push('/dashboard/recipes');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete recipe', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  const productionSheetCount = recipe._count?.productionSheetRecipes ?? 0;

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
            disabled={isSaving || isDeleting}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Update Recipe
              </>
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
        renderAfterYield={
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Tags</legend>
            <TagManager
              bakeryId={bakeryId}
              entityType="recipe"
              entityId={recipe.id}
              initialTags={initialTags}
              allowCreate
              tagTypes={tagTypes}
            />
          </fieldset>
        }
      />

      {/* Danger Zone */}
      <div className="mt-8">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-error">Danger Zone</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
              <div>
                <h3 className="font-semibold">Delete this recipe</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {productionSheetCount > 0
                    ? `This recipe is used in ${productionSheetCount} production sheet${productionSheetCount !== 1 ? 's' : ''}. Remove it from all production sheets before deleting.`
                    : 'Once you delete this recipe, there is no going back. All sections and ingredients will be permanently removed.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting || productionSheetCount > 0}
              >
                <Trash2 className="h-4 w-4" />
                Delete Recipe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <input
            type="checkbox"
            id="delete-recipe-modal"
            className="modal-toggle"
            checked={showDeleteModal}
            onChange={() => setShowDeleteModal(!showDeleteModal)}
          />
          <div className="modal modal-open" role="dialog">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Delete Recipe</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{recipe.name}</strong>?
                This will permanently remove all sections and ingredients associated with this recipe.
              </p>
              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-ghost"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-error"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
            <label className="modal-backdrop" htmlFor="delete-recipe-modal">Close</label>
          </div>
        </>
      )}
    </>
  );
}
