import React from 'react';
import logoImage from '../../assets/gowork-removebg-preview.png';

interface GoworkLogoProps {
  className?: string;
  variant?: 'full' | 'compact';
  size?: 'small' | 'medium' | 'large';
}

export function GoworkLogo({ className = '', variant = 'full', size = 'large' }: GoworkLogoProps) {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center ${className}`}>
        <img 
          src={logoImage} 
          alt="Gowork Logo" 
          className={`${sizeClasses[size]} object-contain`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoImage} 
        alt="Gowork Logo" 
        className={`${sizeClasses[size]} object-contain`}
      />
      <div className="flex flex-col leading-none">
        <span className="font-semibold text-foreground tracking-tight">Gowork</span>
        <span className="text-xs text-muted-foreground">Controle de Estoque</span>
      </div>
    </div>
  );
}
