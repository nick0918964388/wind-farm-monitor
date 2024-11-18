import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionTitleProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
}

export const SectionTitle = ({ 
  title, 
  isOpen,
  onToggle,
  children,
  rightContent 
}: SectionTitleProps) => (
  <div className="space-y-2">
    <div 
      className="flex items-center justify-between cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-center space-x-2">
        {isOpen ? 
          <ChevronDown className="w-5 h-5 text-gray-500" /> : 
          <ChevronRight className="w-5 h-5 text-gray-500" />
        }
        <h3 className="font-medium text-gray-700">{title}</h3>
      </div>
      {rightContent}
    </div>
    {isOpen && children}
  </div>
); 