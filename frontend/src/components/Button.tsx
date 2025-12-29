import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
}

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: ButtonProps) {
  const baseStyles = 'px-6 py-3 border-3 border-black font-bold text-lg shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm transition-all active:translate-x-2 active:translate-y-2 active:shadow-none';
  
  const variantStyles = {
    primary: 'bg-primary text-secondary hover:bg-primary-900',
    secondary: 'bg-secondary text-primary hover:bg-secondary-200',
    accent: 'bg-accent text-secondary hover:bg-accent-600',
  };

  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
