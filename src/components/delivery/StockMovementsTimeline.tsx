import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { replaceUnitIdsWithNames } from '@/lib/format';
import { Badge } from '../ui/badge';
import { 
  ArrowDown, 
  Package, 
  ArrowRightLeft, 
  RotateCcw,
  User,
  FileText,
  Building2,
  Clock
} from 'lucide-react';

interface StockMovementsTimelineProps {
  unitId: string;
}

export function StockMovementsTimeline({ unitId }: StockMovementsTimelineProps) {
  const { movements, units, getItemById, getUnitById, getUserById } = useApp();

  const recentMovements = useMemo(() => {
    // Get movements for this unit, sorted by most recent
    const unitMovements = movements
      .filter(m => m.unitId === unitId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Show last 10 movements

    return unitMovements;
  }, [movements, unitId]);

  const getMovementTypeInfo = (type: string) => {
    switch (type) {
      case 'entry':
        return {
          label: 'Entrada',
          icon: ArrowDown,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          borderColor: 'border-l-green-500',
        };
      case 'consumption':
        return {
          label: 'Consumo',
          icon: Package,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-l-blue-500',
        };
      case 'loan':
        return {
          label: 'Empréstimo',
          icon: ArrowRightLeft,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30',
          borderColor: 'border-l-purple-500',
        };
      case 'return':
        return {
          label: 'Devolução',
          icon: RotateCcw,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-950/30',
          borderColor: 'border-l-orange-500',
        };
      default:
        return {
          label: type,
          icon: Package,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/30',
          borderColor: 'border-l-slate-500',
        };
    }
  };

  const formatRelativeTime = (dateString: Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short'
    });
  };

  if (recentMovements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma movimentação recente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentMovements.map((movement) => {
        const item = getItemById(movement.itemId);
        const user = getUserById(movement.userId);
        const typeInfo = getMovementTypeInfo(movement.type);
        const TypeIcon = typeInfo.icon;

        if (!item) return null;

        return (
          <div
            key={movement.id}
            className={`border-l-4 ${typeInfo.borderColor} ${typeInfo.bgColor} p-3 rounded-r transition-all hover:shadow-sm`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`${typeInfo.color} text-xs`}>
                        {typeInfo.label}
                      </Badge>
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {movement.type === 'consumption' || movement.type === 'loan' ? '-' : '+'}
                      {movement.quantity}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(movement.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {user && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{user.name}</span>
                    </div>
                  )}
                  
                  {movement.workOrder && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span className="truncate">OS: {movement.workOrder}</span>
                    </div>
                  )}

                  {movement.borrowerUnitId && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">
                        → {getUnitById(movement.borrowerUnitId)?.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {movement.notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {replaceUnitIdsWithNames(movement.notes, units)}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}