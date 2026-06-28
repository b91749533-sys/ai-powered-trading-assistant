import { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  extra?: ReactNode;
}

export default function Card({ title, description, children, className = "", extra }: CardProps) {
  return (
    <div className={`glass-panel rounded-xl p-6 ${className}`}>
      {(title || description || extra) && (
        <div className="flex items-start justify-between border-b border-trading-border/55 pb-4 mb-4">
          <div>
            {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
            {description && <p className="text-xs text-trading-textSecondary mt-0.5">{description}</p>}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
