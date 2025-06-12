import { useNavigate } from 'react-router-dom';

interface ToolCardProps {
  title: string;
  description: string;
  icon: string;
  accent: string;
  path: string;
}

const ToolCard = ({ title, description, icon, accent, path }: ToolCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(path);
  };

  return (
    <div 
      className={`group flex flex-col bg-[var(--secondary-color)] rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 border border-transparent hover:border-[var(--accent-color-${accent})] cursor-pointer`}
      onClick={handleClick}
    >
      <div className="p-6 flex flex-col items-center text-center">
        <div className={`mb-4 p-3 rounded-full bg-[var(--accent-color-${accent})] text-white`}>
          <span className="material-symbols-outlined text-4xl">{icon}</span>
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-[var(--text-secondary)] text-sm">{description}</p>
      </div>
    </div>
  );
};

export default ToolCard; 