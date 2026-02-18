import { Item, UnitStock, User } from '../../types';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { AlertTriangle, FileText } from 'lucide-react';

interface ItemDetailLoanFormProps {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  loanDays: number;
  onLoanDaysChange: (days: number) => void;
  observations: string;
  onObservationsChange: (obs: string) => void;
  selectedUserId: string;
  onSelectedUserIdChange: (id: string) => void;
  unitUsers: User[];
  stock: UnitStock;
  item: Item;
  willBeBelowMinimum: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ItemDetailLoanForm({
  quantity, onQuantityChange, loanDays, onLoanDaysChange,
  observations, onObservationsChange, selectedUserId, onSelectedUserIdChange,
  unitUsers, stock, item, willBeBelowMinimum, onSubmit, onCancel,
}: ItemDetailLoanFormProps) {
  return (
    <div className="space-y-4 bg-muted p-4 rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-slate-900 text-sm sm:text-base">Emprestar para Usuário</h4>
        <Button variant="ghost" size="sm" onClick={onCancel} className="flex-shrink-0">
          Cancelar
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="responsible-user">Responsável pelo Empréstimo</Label>
          <Select value={selectedUserId} onValueChange={onSelectedUserIdChange}>
            <SelectTrigger id="responsible-user">
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {unitUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} - {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="loan-user-quantity">Quantidade</Label>
          <Input
            id="loan-user-quantity"
            type="number"
            min={1}
            max={stock.quantity}
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          />
        </div>

        <div>
          <Label htmlFor="loan-user-days">Prazo (dias)</Label>
          <Input
            id="loan-user-days"
            type="number"
            min={1}
            value={loanDays}
            onChange={(e) => onLoanDaysChange(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Devolução prevista: {new Date(Date.now() + loanDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div>
          <Label htmlFor="loan-user-observations">Observações</Label>
          <Textarea
            id="loan-user-observations"
            placeholder="Motivo do empréstimo..."
            value={observations}
            onChange={(e) => onObservationsChange(e.target.value)}
            rows={3}
          />
        </div>

        {item.requiresResponsibilityTerm && (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded text-sm">
            <FileText className="w-4 h-4" />
            <span>Este item requer termo de responsabilidade</span>
          </div>
        )}

        {willBeBelowMinimum && (
          <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Esta ação deixará o estoque abaixo do mínimo</span>
          </div>
        )}

        <Button onClick={onSubmit} className="w-full">
          Confirmar Empréstimo
        </Button>
      </div>
    </div>
  );
}
