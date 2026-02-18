import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Armchair, Clock, ArrowRightLeft, AlertTriangle, Package, Users, TrendingUp, Layers } from 'lucide-react';
import type { User, FurnitureRequestToDesigner, FurnitureTransfer } from '@/types';

interface OverviewPanelProps {
  stats: {
    totalFurniture: number;
    furnitureInWarehouse: number;
    pendingDesignerRequests: number;
    approvedDesignerRequests: number;
    pendingTransfers: number;
    approvedTransfers: number;
    pendingRemovalRequests: number;
    approvedStorageRequests: number;
  };
  designers: User[];
  totalRequests: number;
  totalTransfers: number;
}

export function OverviewPanel({ stats, designers, totalRequests, totalTransfers }: OverviewPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Móveis</CardTitle>
            <Armchair className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFurniture}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.furnitureInWarehouse} no almoxarifado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDesignerRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.approvedDesignerRequests} aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transferências</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTransfers}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.approvedTransfers} em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remoções Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRemovalRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.approvedStorageRequests} aguardando armazenagem</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Equipe de Design</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {designers.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-medium">{d.name.charAt(0).toUpperCase()}</div>
                    <div><p className="font-medium text-sm">{d.name}</p><p className="text-xs text-muted-foreground">{d.email}</p></div>
                  </div>
                  <Badge variant="secondary">{d.role}</Badge>
                </div>
              ))}
              {designers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum designer cadastrado</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-secondary" />Resumo do Sistema</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { icon: Armchair, label: 'Móveis Cadastrados', value: stats.totalFurniture },
                { icon: Package, label: 'Móveis no Almoxarifado', value: stats.furnitureInWarehouse },
                { icon: TrendingUp, label: 'Solicitações Totais', value: totalRequests },
                { icon: ArrowRightLeft, label: 'Transferências Totais', value: totalTransfers },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{label}</span></div>
                  <span className="font-bold text-lg">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
