import { Item, UnitStock } from '../../types';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';

interface ItemDetailAddStockFormProps {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  documentNumber: string;
  onDocumentNumberChange: (doc: string) => void;
  observations: string;
  onObservationsChange: (obs: string) => void;
  stock: UnitStock;
  item: Item;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ItemDetailAddStockForm({
  quantity, onQuantityChange, documentNumber, onDocumentNumberChange,
  observations, onObservationsChange, stock, item, onSubmit, onCancel,
}: ItemDetailAddStockFormProps) {
  return (
    <div className="space-y-4 bg-muted p-4 rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-slate-900 text-sm sm:text-base">Adicionar ao Estoque</h4>
        <Button variant="ghost" size="sm" onClick={onCancel} className="flex-shrink-0">
          Cancelar
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="add-quantity">Quantidade a Adicionar</Label>
          <Input
            id="add-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <Label htmlFor="document-number">Número do Documento (Nota/OS)</Label>
          <Input
            id="document-number"
            placeholder="Ex: NF-123456"
            value={documentNumber}
            onChange={(e) => onDocumentNumberChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="add-observations">Observações</Label>
          <Textarea
            id="add-observations"
            placeholder="Motivo da entrada, fornecedor, etc..."
            value={observations}
            onChange={(e) => onObservationsChange(e.target.value)}
            rows={3}
          />
        </div>
        <div className="bg-green-50 p-3 rounded text-sm text-green-800">
          Novo saldo: {stock.quantity + quantity} {item.unitOfMeasure}
        </div>
        <Button onClick={onSubmit} className="w-full">
          Confirmar Entrada
        </Button>
      </div>
    </div>
  );
}

interface ItemDetailRemoveStockFormProps {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  observations: string;
  onObservationsChange: (obs: string) => void;
  stock: UnitStock;
  item: Item;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ItemDetailRemoveStockForm({
  quantity, onQuantityChange, observations, onObservationsChange,
  stock, item, onSubmit, onCancel,
}: ItemDetailRemoveStockFormProps) {
  return (
    <div className="space-y-4 bg-muted p-4 rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-slate-900 text-sm sm:text-base">Remover do Estoque</h4>
        <Button variant="ghost" size="sm" onClick={onCancel} className="flex-shrink-0">
          Cancelar
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="remove-quantity">Quantidade a Remover</Label>
          <Input
            id="remove-quantity"
            type="number"
            min={1}
            max={stock.quantity}
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <Label htmlFor="remove-observations">Justificativa (Obrigatória)</Label>
          <Textarea
            id="remove-observations"
            placeholder="Ex: Item danificado, descarte, correção de inventário..."
            value={observations}
            onChange={(e) => onObservationsChange(e.target.value)}
            rows={3}
            required
          />
        </div>
        <div className="bg-orange-50 p-3 rounded text-sm text-orange-800">
          Novo saldo: {stock.quantity - quantity} {item.unitOfMeasure}
        </div>
        <Button onClick={onSubmit} className="w-full" variant="destructive">
          Confirmar Remoção
        </Button>
      </div>
    </div>
  );
}
