import { Armchair, Calendar, AlertTriangle, Boxes } from 'lucide-react';

interface ControllerKPIsProps {
  totalMaterials?: number;
  totalFurniture: number;
  activeLoans: number;
  overdueLoans: number;
  belowMinimum?: number;
}

export function ControllerKPIs({ totalMaterials = 0, totalFurniture, activeLoans, overdueLoans, belowMinimum = 0 }: ControllerKPIsProps) {
  return (
    <div className="flex divide-x divide-border border-b border-border flex-wrap">
      <div className="flex items-center gap-2.5 px-5 py-2.5 flex-1 min-w-[100px]">
        <div className="w-[26px] h-[26px] rounded-md p-1.5 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Materiais</p>
          <p className="text-lg font-medium tracking-tight text-foreground">{totalMaterials}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-5 py-2.5 flex-1 min-w-[100px]">
        <div className="w-[26px] h-[26px] rounded-md p-1.5 bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
          <Armchair className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Móveis</p>
          <p className="text-lg font-medium tracking-tight text-foreground">{totalFurniture}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-5 py-2.5 flex-1 min-w-[100px]">
        <div className="w-[26px] h-[26px] rounded-md p-1.5 bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Empréstimos</p>
          <p className="text-lg font-medium tracking-tight text-foreground">{activeLoans}</p>
        </div>
      </div>
      {belowMinimum > 0 && (
        <div className="flex items-center gap-2.5 px-5 py-2.5 flex-1 min-w-[100px]">
          <div className="w-[26px] h-[26px] rounded-md p-1.5 bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Abaixo do mínimo</p>
            <p className="text-lg font-medium tracking-tight text-yellow-700 dark:text-yellow-400">{belowMinimum}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2.5 px-5 py-2.5 flex-1 min-w-[100px]">
        <div className="w-[26px] h-[26px] rounded-md p-1.5 bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Atrasados</p>
          <p className="text-lg font-medium tracking-tight text-red-700 dark:text-red-400">{overdueLoans}</p>
        </div>
      </div>
    </div>
  );
}
