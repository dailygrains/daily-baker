import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body items-center text-center py-12">
        <div className="bg-base-200 rounded-full p-6 mb-4">
          <Icon className="h-12 w-12 text-base-content/40" />
        </div>
        <h3 className="card-title text-xl">{title}</h3>
        <p className="text-base-content/60 max-w-md">{description}</p>
        {action && (
          <div className="card-actions mt-6">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
