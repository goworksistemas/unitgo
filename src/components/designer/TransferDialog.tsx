import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import type { Item, Unit } from '@/types';

export interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: string | null;
  viewingUnit: string;
  availableUnits: Unit[];
  selectedUnit: string;
  onSelectedUnitChange: (unitId: string) => void;
  transferObservations: string;
  onObservationsChange: (value: string) => void;
  onConfirm: () => void;
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
}

export function TransferDialog({
  open,
  onOpenChange,
  selectedItem,
  viewingUnit,
  availableUnits,
  selectedUnit,
  onSelectedUnitChange,
  transferObservations,
  onObservationsChange,
  onConfirm,
  getItemById,
  getUnitById,
}: TransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Transferência de Móvel</DialogTitle>
          <DialogDescription>
            Selecione a unidade de destino para este item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selectedItem && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Item selecionado</div>
              <div>{getItemById(selectedItem)?.name}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="from-unit">De (Unidade Origem)</Label>
            <div className="p-3 bg-muted rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {getUnitById(viewingUnit)?.name}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-unit">Para (Unidade Destino)</Label>
            <Select value={selectedUnit} onValueChange={onSelectedUnitChange}>
              <SelectTrigger id="to-unit">
                <SelectValue placeholder="Selecione a unidade de destino" />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={transferObservations}
              onChange={(e) => onObservationsChange(e.target.value)}
              placeholder="Ex: Necessário para novo espaço de trabalho..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={!selectedUnit}>
            Solicitar Transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
