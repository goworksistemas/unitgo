import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Unit } from '@/types';
import type { UserFormState } from './types';

interface RoleSpecificFieldsProps {
  userForm: UserFormState;
  setUserForm: (f: UserFormState) => void;
  units: Unit[];
  idPrefix?: string;
}

export function RoleSpecificFields({ userForm, setUserForm, units, idPrefix = '' }: RoleSpecificFieldsProps) {
  return (
    <>
      {userForm.role === 'controller' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Unidades Adicionais ({userForm.additionalUnitIds.length} selecionadas)</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const allUnitIds = units.filter(u => u.id !== userForm.primaryUnitId).map(u => u.id);
                  setUserForm({ ...userForm, additionalUnitIds: allUnitIds });
                }}
              >
                Selecionar Todas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUserForm({ ...userForm, additionalUnitIds: [] })}
              >
                Limpar
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted max-h-52 overflow-y-auto">
            {units.filter(u => u.id !== userForm.primaryUnitId).map((unit) => (
              <div key={unit.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`${idPrefix}unit-${unit.id}`}
                  checked={userForm.additionalUnitIds.includes(unit.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setUserForm({ ...userForm, additionalUnitIds: [...userForm.additionalUnitIds, unit.id] });
                    } else {
                      setUserForm({ ...userForm, additionalUnitIds: userForm.additionalUnitIds.filter(id => id !== unit.id) });
                    }
                  }}
                />
                <label
                  htmlFor={`${idPrefix}unit-${unit.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {unit.name}
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            💡 O controlador poderá alternar entre a unidade primária e as unidades adicionais
          </p>
        </div>
      )}

      {userForm.role === 'warehouse' && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}warehouseType`}>Tipo de Almoxarifado</Label>
          <Select
            value={userForm.warehouseType}
            onValueChange={(value) => setUserForm({ ...userForm, warehouseType: value as 'storage' | 'delivery' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="storage">Estoque</SelectItem>
              <SelectItem value="delivery">Motorista/Entrega</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {userForm.role === 'admin' && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}adminType`}>Tipo de Administrador *</Label>
          <Select
            value={userForm.adminType}
            onValueChange={(value) => setUserForm({ ...userForm, adminType: value as 'units' | 'warehouse' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de admin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="units">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Admin Controlador</span>
                  <span className="text-xs text-slate-500">Gestão de estoque e materiais</span>
                </div>
              </SelectItem>
              <SelectItem value="warehouse">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Admin Designer</span>
                  <span className="text-xs text-slate-500">Gestão de móveis e design</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            💡 Admin Controlador pode visualizar como Controlador. Admin Designer pode visualizar como Designer.
          </p>
        </div>
      )}
    </>
  );
}
