import type { FurnitureRemovalRequest, Item, Unit, User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Armchair } from 'lucide-react';
import { FurnitureCard } from './FurnitureCard';

interface FurniturePickupsCardProps {
  isDeliveryDriver: boolean;
  isStorageWorker: boolean;
  furniturePickups: FurnitureRemovalRequest[];
  furnitureInTransit: FurnitureRemovalRequest[];
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
  onPickup: (id: string) => void;
  onReceive: (id: string) => void;
}

export function FurniturePickupsCard({
  isDeliveryDriver, isStorageWorker,
  furniturePickups, furnitureInTransit,
  getItemById, getUnitById, getUserById, onPickup, onReceive,
}: FurniturePickupsCardProps) {
  if (furniturePickups.length === 0 && furnitureInTransit.length === 0) return null;

  const cardProps = {
    getItemById, getUnitById, getUserById,
    isStorageWorker, isDeliveryDriver,
    onPickup, onReceive,
  };

  const renderList = (items: FurnitureRemovalRequest[], emptyMsg: string) =>
    items.length === 0 ? (
      <div className="text-center py-8 text-gray-500">{emptyMsg}</div>
    ) : (
      <div className="space-y-3">
        {items.map(r => <FurnitureCard key={r.id} request={r} {...cardProps} />)}
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Armchair className="h-5 w-5 text-primary" />
          Coletas de Móveis
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {isDeliveryDriver
            ? 'Móveis para coleta e transporte ao almoxarifado'
            : 'Móveis aguardando armazenagem ou descarte'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={isDeliveryDriver ? 'pickups' : 'transit'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pickups" className="relative">
              <span className="hidden sm:inline">Aguardando Coleta</span>
              <span className="sm:hidden">Coleta</span>
              <span className="ml-1">({furniturePickups.length})</span>
              {furniturePickups.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="transit" className="relative">
              <span className="hidden sm:inline">Em Trânsito</span>
              <span className="sm:hidden">Trânsito</span>
              <span className="ml-1">({furnitureInTransit.length})</span>
              {furnitureInTransit.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pickups" className="space-y-3 mt-4">
            {renderList(furniturePickups, 'Nenhuma coleta pendente')}
          </TabsContent>
          <TabsContent value="transit" className="space-y-3 mt-4">
            {renderList(furnitureInTransit, 'Nenhum móvel em trânsito')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
