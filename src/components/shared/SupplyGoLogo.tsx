type LogoVariant = 'colored' | 'dark' | 'light'

interface SupplyGoLogoProps {
  variant?: LogoVariant
  size?: number
  className?: string
  showText?: boolean
}

const srcMap: Record<LogoVariant, string> = {
  colored: '/colorido.png',
  dark: '/preto.png',
  light: '/branco.png',
}

export function SupplyGoLogo({ variant = 'colored', size = 40, className = '', showText = false }: SupplyGoLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={srcMap[variant]}
        alt="SupplyGo"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
      {showText && (
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: size * 0.5 }}
        >
          SupplyGo
        </span>
      )}
    </div>
  )
}
