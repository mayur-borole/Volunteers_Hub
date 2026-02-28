import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export const StarRating = ({ 
  rating, 
  maxRating = 5, 
  size = 'md',
  interactive = false,
  onChange 
}: StarRatingProps) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className="flex gap-0.5">
      {[...Array(maxRating)].map((_, index) => (
        <Star
          key={index}
          className={cn(
            sizes[size],
            interactive && 'cursor-pointer transition-transform hover:scale-110',
            index < rating 
              ? 'fill-yellow-400 text-yellow-400' 
              : 'fill-transparent text-muted-foreground'
          )}
          onClick={() => handleClick(index)}
        />
      ))}
    </div>
  );
};
