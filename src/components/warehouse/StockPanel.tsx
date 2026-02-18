import { WarehouseStockPanel } from '../panels/WarehouseStockPanel';
import { FurnitureStockPanel } from '../panels/FurnitureStockPanel';

interface StockPanelProps {
  onAddFurniture: () => void;
  onAddStock: () => void;
}

export function StockPanel({ onAddFurniture, onAddStock }: StockPanelProps) {
  return (
    <div className="space-y-6">
      <WarehouseStockPanel
        onAddFurniture={onAddFurniture}
        onAddStock={onAddStock}
      />
      <FurnitureStockPanel onAddFurniture={onAddFurniture} />
    </div>
  );
}
