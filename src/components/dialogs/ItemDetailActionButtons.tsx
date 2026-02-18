import { Item, UnitStock } from '../../types';
import { Button } from '../ui/button';
import { ShoppingCart, Plus, Minus, UserPlus } from 'lucide-react';

export type ItemActionType = 'none' | 'consume' | 'add' | 'remove' | 'loanToUser';

interface ItemDetailActionButtonsProps {
  item: Item;
  stock: UnitStock;
  isController: boolean;
  currentUserRole: string | undefined;
  onActionSelect: (action: ItemActionType) => void;
}

export function ItemDetailActionButtons({
  item, stock, isController, currentUserRole, onActionSelect,
}: ItemDetailActionButtonsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {currentUserRole === 'executor' && stock.quantity > 0 && (
        <Button
          onClick={() => onActionSelect('consume')}
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-center">Consumir para Serviço</span>
        </Button>
      )}

      {isController && (
        <>
          <Button
            onClick={() => onActionSelect('add')}
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="text-center">Adicionar Estoque</span>
          </Button>
          <Button
            onClick={() => onActionSelect('remove')}
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
          >
            <Minus className="w-5 h-5" />
            <span className="text-center">Remover Estoque</span>
          </Button>
          {!item.isConsumable && stock.quantity > 0 && (
            <Button
              onClick={() => onActionSelect('loanToUser')}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-center">Emprestar p/ Usuário</span>
            </Button>
          )}
          {stock.quantity > 0 && (
            <Button
              onClick={() => onActionSelect('consume')}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-center">Registrar Consumo</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
