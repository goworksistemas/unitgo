import React from 'react';
import { Item, UnitStock } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Package, AlertTriangle, MapPin } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useApp } from '../../contexts/AppContext';

interface ItemCardProps {
  item: Item;
  stock?: UnitStock;
  onClick: () => void;
}

export function ItemCard({ item, stock, onClick }: ItemCardProps) {
  const { getCategoryById } = useApp();
  const category = getCategoryById(item.categoryId);
  
  const isBelowMinimum = stock && stock.quantity < stock.minimumQuantity;
  const isOutOfStock = stock && stock.quantity === 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {item.imageUrl ? (
              <ImageWithFallback
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-foreground mb-1 truncate">{item.name}</h3>
            <p className="text-foreground text-sm mb-2 line-clamp-2">{item.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {category && (
                <Badge variant="outline" className="text-xs">
                  {category.name}
                </Badge>
              )}
              {item.isConsumable && (
                <Badge variant="secondary" className="text-xs">
                  Consumível
                </Badge>
              )}
              {item.serialNumber && (
                <Badge variant="secondary" className="text-xs">
                  Serial: {item.serialNumber}
                </Badge>
              )}
            </div>

            {stock && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    Disponível: 
                  </span>
                  <span className={`${
                    isOutOfStock ? 'text-red-600' : 
                    isBelowMinimum ? 'text-orange-600' : 
                    'text-green-600'
                  }`}>
                    {stock.quantity} {item.unitOfMeasure}
                  </span>
                  {isBelowMinimum && !isOutOfStock && (
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  )}
                </div>
                {stock.location && (
                  <div className="flex items-center gap-1 text-xs text-foreground">
                    <MapPin className="w-3 h-3" />
                    {stock.location}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
