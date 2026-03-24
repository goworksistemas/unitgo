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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Unidades Adicionais ({userForm.additionalUnitIds.length})</Label>
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
          <div className="grid grid-cols-3 gap-2 p-2 border rounded-md bg-muted/50">
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
        </div>
      )}

      {userForm.role === 'warehouse' && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}warehouseType`} className="text-xs font-medium">Tipo de Almoxarifado</Label>
          <Select
            value={userForm.warehouseType}
            onValueChange={(value) => setUserForm({ ...userForm, warehouseType: value as 'storage' | 'delivery' })}
          >
            <SelectTrigger className="h-9">
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
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}adminType`} className="text-xs font-medium">Tipo de Administrador *</Label>
          <Select
            value={userForm.adminType}
            onValueChange={(value) => setUserForm({ ...userForm, adminType: value as 'units' | 'warehouse' })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione o tipo de admin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="units">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Admin Controlador</span>
                  <span className="text-xs text-muted-foreground">Gestão de estoque e materiais</span>
                </div>
              </SelectItem>
              <SelectItem value="warehouse">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Admin Designer</span>
                  <span className="text-xs text-muted-foreground">Gestão de móveis e design</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Admin Controlador enxerga o fluxo como Controlador; Admin Designer, como Designer.
          </p>
        </div>
      )}
    </>
  );
}
