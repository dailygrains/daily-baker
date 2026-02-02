import { ReactNode } from 'react';
import Link from 'next/link';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  sticky?: boolean;
  breadcrumbs?: Breadcrumb[];
}

export function PageHeader({ title, description, actions, sticky = false, breadcrumbs }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${
        sticky
          ? 'sticky top-0 z-10 bg-base-100 -mx-6 -mt-6 px-6 pt-4 pb-4 border-b border-base-300 shadow-sm'
          : ''
      }`}
    >
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="breadcrumbs text-sm mb-1">
            <ul>
              {breadcrumbs.map((crumb, index) => (
                <li key={index}>
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-base-content/60 hover:text-base-content">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-base-content/60">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-base-content/60 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
