import { Badge } from '@/components/ui/badge';
import { getStatusConfig } from '@/lib/format';

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  const cfg = getStatusConfig(status);
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}
