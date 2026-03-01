'use client';

import { Copy } from 'lucide-react';

export function CopyInvitationLinkButton({ token }: { token: string }) {
  async function handleClick() {
    const url = `${window.location.origin}/accept-invitation?token=${token}`;
    await navigator.clipboard.writeText(url);
  }

  return (
    <button
      onClick={handleClick}
      className="btn btn-sm btn-ghost"
      title="Copy invitation link"
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}
