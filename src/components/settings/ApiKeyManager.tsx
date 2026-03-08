'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { createApiKey, revokeApiKey } from '@/app/actions/apiKey';
import { useToastStore } from '@/store/toast-store';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { Key, Plus, Copy, Check, AlertTriangle } from 'lucide-react';

interface ApiKeyData {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

interface ApiKeyManagerProps {
  bakeryId: string;
  initialKeys: ApiKeyData[];
}

export function ApiKeyManager({ bakeryId, initialKeys }: ApiKeyManagerProps) {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);

  const [keys, setKeys] = useState<ApiKeyData[]>(initialKeys);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyData | null>(null);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [createdKeyName, setCreatedKeyName] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<('read' | 'write')[]>(['read', 'write']);
  const [newKeyExpiration, setNewKeyExpiration] = useState('');

  const createModalRef = useRef<HTMLDialogElement>(null);
  const revealModalRef = useRef<HTMLDialogElement>(null);
  const revokeModalRef = useRef<HTMLDialogElement>(null);

  const openCreateModal = useCallback(() => {
    setNewKeyName('');
    setNewKeyScopes(['read', 'write']);
    setNewKeyExpiration('');
    createModalRef.current?.showModal();
  }, []);

  const closeCreateModal = useCallback(() => {
    createModalRef.current?.close();
  }, []);

  const openRevealModal = useCallback(() => {
    setHasCopied(false);
    revealModalRef.current?.showModal();
  }, []);

  const closeRevealModal = useCallback(() => {
    setCreatedRawKey(null);
    setCreatedKeyName('');
    revealModalRef.current?.close();
    router.refresh();
  }, [router]);

  const openRevokeModal = useCallback((key: ApiKeyData) => {
    setRevokeTarget(key);
    revokeModalRef.current?.showModal();
  }, []);

  const closeRevokeModal = useCallback(() => {
    setRevokeTarget(null);
    revokeModalRef.current?.close();
  }, []);

  const handleScopeToggle = useCallback((scope: 'read' | 'write') => {
    setNewKeyScopes((prev) => {
      if (prev.includes(scope)) {
        // Don't allow removing the last scope
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== scope);
      }
      return [...prev, scope];
    });
  }, []);

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) {
      addToast('Name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createApiKey({
        bakeryId,
        name: newKeyName.trim(),
        scopes: newKeyScopes,
        expiresAt: newKeyExpiration ? new Date(newKeyExpiration) : null,
      });

      if (result.success && result.data) {
        addToast(`API key "${result.data.name}" created`, 'success');
        setCreatedRawKey(result.data.rawKey);
        setCreatedKeyName(result.data.name);
        closeCreateModal();
        // Add new key to the list
        setKeys((prev) => [
          {
            id: result.data!.id,
            name: result.data!.name,
            prefix: result.data!.prefix,
            scopes: result.data!.scopes as string[],
            lastUsedAt: null,
            expiresAt: result.data!.expiresAt,
            createdAt: result.data!.createdAt,
            revokedAt: null,
          },
          ...prev,
        ]);
        openRevealModal();
      } else {
        addToast(result.error || 'Failed to create API key', 'error');
      }
    } catch {
      addToast('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [bakeryId, newKeyName, newKeyScopes, newKeyExpiration, addToast, closeCreateModal, openRevealModal]);

  const handleRevokeKey = useCallback(async () => {
    if (!revokeTarget) return;

    setIsSubmitting(true);
    try {
      const result = await revokeApiKey(revokeTarget.id);

      if (result.success && result.data) {
        addToast(`API key "${revokeTarget.name}" revoked`, 'success');
        setKeys((prev) =>
          prev.map((k) =>
            k.id === revokeTarget.id
              ? { ...k, revokedAt: result.data!.revokedAt }
              : k
          )
        );
        closeRevokeModal();
      } else {
        addToast(result.error || 'Failed to revoke API key', 'error');
      }
    } catch {
      addToast('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [revokeTarget, addToast, closeRevokeModal]);

  const handleCopyKey = useCallback(async () => {
    if (!createdRawKey) return;

    try {
      await navigator.clipboard.writeText(createdRawKey);
      setHasCopied(true);
      addToast('API key copied to clipboard', 'success');
    } catch {
      addToast('Failed to copy to clipboard', 'error');
    }
  }, [createdRawKey, addToast]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const isExpired = (key: ApiKeyData) => {
    if (!key.expiresAt) return false;
    return new Date(key.expiresAt) < new Date();
  };

  const getStatusBadge = (key: ApiKeyData) => {
    if (key.revokedAt) {
      return <span className="badge badge-sm badge-error">Revoked</span>;
    }
    if (isExpired(key)) {
      return <span className="badge badge-sm badge-warning">Expired</span>;
    }
    return <span className="badge badge-sm badge-success">Active</span>;
  };

  return (
    <>
      <SetPageHeader
        title="API Keys"
        description="Manage API keys for programmatic access"
        breadcrumbs={[
          { label: 'Settings', href: '/dashboard/settings' },
          { label: 'API Keys' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Create API Key
          </button>
        }
      />

      {/* Empty state */}
      {keys.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Key className="h-12 w-12 text-base-content/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
          <p className="text-base-content/60 max-w-md mb-6">
            Create an API key to enable programmatic access to your bakery data.
            API keys allow external tools and integrations to interact with your
            recipes, ingredients, and inventory.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Create Your First API Key
          </button>
        </div>
      )}

      {/* Keys table */}
      {keys.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key Prefix</th>
                <th>Scopes</th>
                <th>Last Used</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key.id}
                  className={key.revokedAt ? 'opacity-50' : ''}
                >
                  <td>
                    <span className={key.revokedAt ? 'line-through' : ''}>
                      {key.name}
                    </span>
                  </td>
                  <td>
                    <code className="text-sm font-mono bg-base-200 px-2 py-0.5 rounded">
                      {key.prefix}...
                    </code>
                  </td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className={`badge badge-sm ${
                            scope === 'read'
                              ? 'badge-primary'
                              : 'badge-secondary'
                          }`}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-base-content/60">
                    {formatDate(key.lastUsedAt)}
                  </td>
                  <td className="text-base-content/60">
                    {formatDate(key.createdAt)}
                  </td>
                  <td>{getStatusBadge(key)}</td>
                  <td>
                    {!key.revokedAt && (
                      <button
                        type="button"
                        className="btn btn-outline btn-error btn-xs"
                        onClick={() => openRevokeModal(key)}
                      >
                        Revoke
                      </button>
                    )}
                    {key.revokedAt && (
                      <span className="text-xs text-base-content/40">
                        {formatDate(key.revokedAt)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create API Key Modal */}
      <dialog ref={createModalRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create API Key</h3>

          <div className="space-y-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Name *</legend>
              <input
                type="text"
                className="input input-bordered w-full"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Integration"
                maxLength={100}
                autoFocus
              />
              <label className="label">
                <span className="label-text-alt">
                  A descriptive name to identify this key
                </span>
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Scopes *</legend>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={newKeyScopes.includes('read')}
                    onChange={() => handleScopeToggle('read')}
                  />
                  <span className="text-sm">Read</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-secondary"
                    checked={newKeyScopes.includes('write')}
                    onChange={() => handleScopeToggle('write')}
                  />
                  <span className="text-sm">Write</span>
                </label>
              </div>
              <label className="label">
                <span className="label-text-alt">
                  At least one scope is required
                </span>
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Expiration</legend>
              <input
                type="date"
                className="input input-bordered w-full"
                value={newKeyExpiration}
                onChange={(e) => setNewKeyExpiration(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <label className="label">
                <span className="label-text-alt">
                  Leave empty for a non-expiring key
                </span>
              </label>
            </fieldset>
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={closeCreateModal}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateKey}
              disabled={isSubmitting || !newKeyName.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Creating...
                </>
              ) : (
                'Create Key'
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={closeCreateModal}>
            close
          </button>
        </form>
      </dialog>

      {/* Key Reveal Modal */}
      <dialog ref={revealModalRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-2">API Key Created</h3>

          <div className="alert alert-warning mb-4">
            <AlertTriangle className="h-5 w-5" />
            <span>
              This key won&apos;t be shown again. Copy it now and store it
              securely.
            </span>
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Key for &quot;{createdKeyName}&quot;
            </legend>
            <div className="join w-full">
              <input
                type="text"
                className="input input-bordered join-item w-full font-mono text-sm"
                value={createdRawKey ?? ''}
                readOnly
              />
              <button
                type="button"
                className={`btn join-item ${hasCopied ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopyKey}
              >
                {hasCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </fieldset>

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-primary"
              onClick={closeRevealModal}
            >
              Done
            </button>
          </div>
        </div>
        {/* Intentionally no backdrop close — user must acknowledge */}
      </dialog>

      {/* Revoke Confirmation Modal */}
      <dialog ref={revokeModalRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-2">Revoke API Key</h3>
          <p className="text-base-content/70 mb-4">
            Are you sure you want to revoke{' '}
            <strong>&quot;{revokeTarget?.name}&quot;</strong>? Any applications
            or integrations using this key will immediately lose access. This
            action cannot be undone.
          </p>

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={closeRevokeModal}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-error"
              onClick={handleRevokeKey}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Revoking...
                </>
              ) : (
                'Revoke Key'
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={closeRevokeModal}>
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
