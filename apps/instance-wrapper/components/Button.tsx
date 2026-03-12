
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'secondary', 
  size = 'md', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-[14px] font-medium transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-white text-[#0B0B0C] hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-[0.98]",
    secondary: "border border-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.92)] hover:border-[rgba(255,255,255,0.20)] hover:bg-white/5",
    ghost: "text-[rgba(255,255,255,0.64)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
