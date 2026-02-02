'use client';

import { useEffect, ReactNode } from 'react';
import { useHeader } from '@/contexts/HeaderContext';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface SetPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  sticky?: boolean;
  breadcrumbs?: Breadcrumb[];
  hasUnsavedChanges?: boolean;
}

export function SetPageHeader({
  title,
  description,
  actions,
  sticky = false,
  breadcrumbs,
  hasUnsavedChanges = false,
}: SetPageHeaderProps) {
  const { setHeader, clearHeader } = useHeader();

  useEffect(() => {
    setHeader({
      title,
      description,
      actions,
      sticky,
      breadcrumbs,
      hasUnsavedChanges,
    });

    return () => {
      clearHeader();
    };
  }, [title, description, sticky, setHeader, clearHeader]);

  // Update when any prop changes
  useEffect(() => {
    setHeader({
      title,
      description,
      actions,
      sticky,
      breadcrumbs,
      hasUnsavedChanges,
    });
  }, [actions, breadcrumbs, title, description, sticky, hasUnsavedChanges, setHeader]);

  return null;
}
