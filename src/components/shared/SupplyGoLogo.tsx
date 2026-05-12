import React from 'react';

const LOGO_SRC = '/logo_supply.png';

interface SupplyGoLogoProps {
  className?: string;
  /** `full`: ícone + textos (nome e tagline). `compact`: apenas o ícone. */
  variant?: 'full' | 'compact';
  /** Tamanho do ícone. */
  size?: 'small' | 'medium' | 'large';
  /** Esconde a tagline (apenas variant=full). */
  hideTagline?: boolean;
}

const SIZE_CLASS: Record<NonNullable<SupplyGoLogoProps['size']>, string> = {
  small: 'h-7 w-7',
  medium: 'h-9 w-9',
  large: 'h-12 w-12',
};

export function SupplyGoLogo({
  className = '',
  variant = 'full',
  size = 'medium',
  hideTagline = false,
}: SupplyGoLogoProps) {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center ${className}`}>
        <img
          src={LOGO_SRC}
          alt="SupplyGo"
          className={`${SIZE_CLASS[size]} shrink-0 object-contain`}
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="SupplyGo"
        className={`${SIZE_CLASS[size]} shrink-0 object-contain`}
        loading="eager"
        decoding="async"
      />
      <div className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-base font-bold tracking-tight text-foreground">
          Supply<span className="text-[#3F76FF]">Go</span>
        </span>
        {!hideTagline && (
          <span className="truncate text-[11px] text-muted-foreground">Controle de Estoque</span>
        )}
      </div>
    </div>
  );
}
