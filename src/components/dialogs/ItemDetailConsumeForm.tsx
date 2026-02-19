import { Item, UnitStock } from '../../types';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { AlertTriangle } from 'lucide-react';

interface ItemDetailConsumeFormProps {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  observations: string;
  onObservationsChange: (obs: string) => void;
  serviceOrder: string;
  onServiceOrderChange: (so: string) => void;
  stock: UnitStock;
  item: Item;
  currentUserRole: string | undefined;
  willBeBelowMinimum: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ItemDetailConsumeForm({
  quantity, onQuantityChange, observations, onObservationsChange,
  serviceOrder, onServiceOrderChange, stock, item,
  currentUserRole, willBeBelowMinimum, onSubmit, onCancel,
}: ItemDetailConsumeFormProps) {
  return (
    <div className="space-y-4 bg-muted p-4 rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-slate-900 text-sm sm:text-base">
          {currentUserRole === 'executor' ? 'Consumir Item para Serviço' : (item.isConsumable ? 'Consumir Item' : 'Usar Item (Definitivo)')}
        </h4>
        <Button variant="ghost" size="sm" onClick={onCancel} className="flex-shrink-0">
          Cancelar
        </Button>
      </div>

      <div className="space-y-3">
        {currentUserRole === 'executor' && (
          <div>
            <Label htmlFor="service-order">
              Ordem de Serviço / Tipo de Serviço <span className="text-red-500">*</span>
            </Label>
            <Input
              id="service-order"
              placeholder="Ex: OS-12345 ou Manutenção Elétrica Sala 301"
              value={serviceOrder}
              onChange={(e) => onServiceOrderChange(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Informe a OS ou descrição do serviço que está realizando
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="consume-quantity">Quantidade</Label>
          <Input
            id="consume-quantity"
            type="number"
            min={1}
            max={stock.quantity}
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          />
        </div>

        <div>
          <Label htmlFor="consume-observations">
            Observações {currentUserRole === 'executor' ? '(Opcional)' : ''}
          </Label>
          <Textarea
            id="consume-observations"
            placeholder={currentUserRole === 'executor' 
              ? "Detalhes adicionais sobre o serviço..." 
              : "Motivo ou observações sobre o uso..."}
            value={observations}
            onChange={(e) => onObservationsChange(e.target.value)}
            rows={3}
          />
        </div>

        {willBeBelowMinimum && (
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Esta ação deixará o estoque abaixo do mínimo</span>
          </div>
        )}

        <Button onClick={onSubmit} className="w-full">
          Confirmar Consumo
        </Button>
      </div>
    </div>
  );
}
