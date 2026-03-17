import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Unit, UserRole } from '@/types';
import type { UserFormState } from './types';
import { RoleSpecificFields } from './RoleSpecificFields';

interface UserFormFieldsProps {
  userForm: UserFormState;
  setUserForm: (f: UserFormState) => void;
  units: Unit[];
  showPassword?: boolean;
  idPrefix?: string;
}

export function UserFormFields({ userForm, setUserForm, units, showPassword = false, idPrefix = '' }: UserFormFieldsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}name`} className="text-xs font-medium">Nome *</Label>
        <Input
          id={`${idPrefix}name`}
          value={userForm.name}
          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
          placeholder="Nome completo"
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}jobTitle`} className="text-xs font-medium">Cargo</Label>
        <Input
          id={`${idPrefix}jobTitle`}
          value={userForm.jobTitle}
          onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })}
          placeholder="Ex: Gerente de Operações"
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}email`} className="text-xs font-medium">Email *</Label>
        <Input
          id={`${idPrefix}email`}
          type="email"
          value={userForm.email}
          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
          placeholder="email@gowork.com"
          className="h-9"
        />
      </div>
      {showPassword && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}password`} className="text-xs font-medium">Senha *</Label>
          <Input
            id={`${idPrefix}password`}
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            placeholder="Mínimo 6 caracteres"
            className="h-9"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}role`} className="text-xs font-medium">Perfil *</Label>
        <Select
          value={userForm.role}
          onValueChange={(value) => setUserForm({ ...userForm, role: value as UserRole })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="controller">Controlador</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="warehouse">Almoxarifado</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
            <SelectItem value="developer">Desenvolvedor</SelectItem>
            <SelectItem value="requester">Solicitante</SelectItem>
            <SelectItem value="buyer">Comprador</SelectItem>
            <SelectItem value="financial">Financeiro</SelectItem>
            <SelectItem value="executor">Executor</SelectItem>
            <SelectItem value="driver">Motorista</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {userForm.role !== 'designer' && userForm.role !== 'admin' && userForm.role !== 'developer' && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}primaryUnit`} className="text-xs font-medium">Unidade Primária *</Label>
          <Select
            value={userForm.primaryUnitId}
            onValueChange={(value) => setUserForm({ ...userForm, primaryUnitId: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="col-span-2 sm:col-span-3">
        <RoleSpecificFields userForm={userForm} setUserForm={setUserForm} units={units} idPrefix={idPrefix} />
      </div>
    </div>
  );
}
