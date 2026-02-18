import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Shield, 
  UserCog, 
  Package, 
  Truck, 
  Palette, 
  Code, 
  User,
  ArrowLeft,
  Eye
} from 'lucide-react';
import type { UserRole } from '../../types';

interface DeveloperModeSelectorProps {
  currentViewRole: UserRole | null;
  onSelectRole: (role: UserRole | null) => void;
}

const roleConfig: Partial<Record<UserRole, { label: string; icon: React.ReactNode; color: string; description: string }>> = {
  controller: {
    label: 'Controlador',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-purple-500',
    description: 'Controle total de estoque e movimentações'
  },
  admin: {
    label: 'Administrador',
    icon: <UserCog className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Gestão administrativa das unidades'
  },
  warehouse: {
    label: 'Almoxarifado',
    icon: <Package className="w-4 h-4" />,
    color: 'bg-green-500',
    description: 'Gestão de produtos e solicitações'
  },
  driver: {
    label: 'Motorista',
    icon: <Truck className="w-4 h-4" />,
    color: 'bg-yellow-500',
    description: 'Entregas e confirmações'
  },
  designer: {
    label: 'Designer',
    icon: <Palette className="w-4 h-4" />,
    color: 'bg-pink-500',
    description: 'Gestão de móveis e design'
  },
  developer: {
    label: 'Developer',
    icon: <Code className="w-4 h-4" />,
    color: 'bg-slate-700',
    description: 'Configurações e gestão do sistema'
  },
  requester: {
    label: 'Solicitante',
    icon: <User className="w-4 h-4" />,
    color: 'bg-cyan-500',
    description: 'Fazer solicitações de materiais'
  },
  executor: {
    label: 'Executor',
    icon: <User className="w-4 h-4" />,
    color: 'bg-slate-500',
    description: 'Consumo de itens para serviços'
  },
};

export function DeveloperModeSelector({ currentViewRole, onSelectRole }: DeveloperModeSelectorProps) {
  if (currentViewRole) {
    const config = roleConfig[currentViewRole];
    if (!config) return null;
    return (
      <div className="mb-3">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-500/50 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium">Visualizando como:</span>
              <Badge className={`${config.color} text-white text-xs`}>
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectRole(null)}
              className="h-7 text-xs"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="bg-card rounded-lg border p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-primary" />
            Visualizar Sistema Como:
          </h3>
          <p className="text-xs text-muted-foreground">
            Selecione um perfil para testar as funcionalidades
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([role, config]) => {
            if (role === 'developer' || !config) return null; // Não mostrar o próprio developer
            
            return (
              <button
                key={role}
                onClick={() => onSelectRole(role)}
                className="group bg-muted border border-border rounded-lg p-3 hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`${config.color} text-white p-2 rounded-lg`}>
                    {config.icon}
                  </div>
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {config.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
