import { Item, UnitStock, Category } from '../../types';
import { Badge } from '../ui/badge';
import { Package, AlertTriangle, MapPin, Calendar } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ItemDetailHeaderProps {
  item: Item;
  stock: UnitStock | undefined;
  category: Category | undefined;
  isBelowMinimum: boolean;
  isOutOfStock: boolean;
}

export function ItemDetailHeader({ item, stock, category, isBelowMinimum, isOutOfStock }: ItemDetailHeaderProps) {
  return (
    <>
      <div className="flex gap-3 sm:gap-4">
        <div className="w-20 h-20 sm:w-32 sm:h-32 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.imageUrl ? (
            <ImageWithFallback
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">{item.name}</h2>
          <p className="text-slate-600 mb-2 sm:mb-3 text-xs sm:text-sm">{item.description}</p>
          
          <div className="flex flex-wrap gap-2">
            {category && <Badge variant="outline">{category.name}</Badge>}
            {item.isConsumable && <Badge variant="secondary">Consumível</Badge>}
            {item.requiresResponsibilityTerm && <Badge variant="secondary">Requer Termo</Badge>}
            {item.serialNumber && <Badge>Serial: {item.serialNumber}</Badge>}
          </div>
        </div>
      </div>

      {stock && (
        <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3">
          <h3 className="text-slate-900 text-sm sm:text-base">Estoque na Unidade</h3>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm text-slate-600 mb-1">Quantidade Disponível</p>
              <p className={`text-xl sm:text-2xl ${
                isOutOfStock ? 'text-red-600' : 
                isBelowMinimum ? 'text-orange-600' : 
                'text-green-600'
              }`}>
                {stock.quantity} {item.unitOfMeasure}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-600 mb-1">Estoque Mínimo</p>
              <p className="text-xl sm:text-2xl text-slate-900">{stock.minimumQuantity} {item.unitOfMeasure}</p>
            </div>
          </div>

          {stock.location && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{stock.location}</span>
            </div>
          )}

          {isBelowMinimum && (
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Estoque abaixo do mínimo recomendado</span>
            </div>
          )}
        </div>
      )}

      {!item.isConsumable && item.defaultLoanDays > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm text-blue-900">Prazo padrão de empréstimo</p>
              <p className="text-xs sm:text-sm text-blue-700">{item.defaultLoanDays} dias</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
