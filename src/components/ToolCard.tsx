import { Link } from 'react-router-dom';

interface ToolCardProps {
  title: string;
  description: string;
  icon: string;
  accent?: string;
  path: string;
}

const ToolCard = ({ title, description, icon, accent, path }: ToolCardProps) => {
  // Default accent color if none provided
  const accentColor = accent || 'accent-color-1';

  return (
    <Link
      to={path}
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-[var(--secondary-color)] p-6 transition-all hover:scale-[1.02] hover:shadow-lg`}
    >
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 h-full w-1 bg-[var(--${accentColor})]`} />

      {/* Content */}
      <div className="flex flex-col gap-4">
        {/* Icon */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--${accentColor})] bg-opacity-10`}>
          <span className="material-symbols-outlined text-2xl text-[var(--${accentColor})]">
            {icon}
          </span>
        </div>

        {/* Text content */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
    </Link>
  );
};

export default ToolCard; 