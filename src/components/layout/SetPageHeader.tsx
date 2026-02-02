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
}

export function SetPageHeader({
  title,
  description,
  actions,
  sticky = false,
  breadcrumbs,
}: SetPageHeaderProps) {
  const { setHeader, clearHeader } = useHeader();

  useEffect(() => {
    setHeader({
      title,
      description,
      actions,
      sticky,
      breadcrumbs,
    });

    return () => {
      clearHeader();
    };
  }, [title, description, sticky, setHeader, clearHeader]);

  // Update actions separately since they may change independently
  useEffect(() => {
    setHeader({
      title,
      description,
      actions,
      sticky,
      breadcrumbs,
    });
  }, [actions, breadcrumbs, title, description, sticky, setHeader]);

  return null;
}
