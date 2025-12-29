import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border-5 border-black shadow-brutal p-6 ${className}`}>
      {children}
    </div>
  );
}
