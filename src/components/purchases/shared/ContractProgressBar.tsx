import { Progress } from '@/components/ui/progress';

interface ContractProgressBarProps {
  valorTotal: number;
  valorConsumido: number;
  showLabel?: boolean;
}

export function ContractProgressBar({ valorTotal, valorConsumido, showLabel = true }: ContractProgressBarProps) {
  const percent = valorTotal > 0 ? Math.min(100, (valorConsumido / valorTotal) * 100) : 0;
  const isCritical = percent >= 100;
  const isWarning = percent >= 80 && percent < 100;

  return (
    <div className="space-y-1">
      <Progress
        value={percent}
        className={`h-2 ${isCritical ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-amber-500' : ''}`}
      />
      {showLabel && (
        <p className="text-xs text-muted-foreground">
          {percent.toFixed(0)}% consumido
          {isCritical && ' — Contrato esgotado'}
          {isWarning && !isCritical && ' — Alerta'}
        </p>
      )}
    </div>
  );
}
