import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Unit, UserRole } from '@/types';
import type { UserFormState } from './types';
import { RoleSpecificFields } from './RoleSpecificFields';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'Identificação' },
  { id: 2, label: 'Perfil e acesso' },
] as const;

interface CreateUserWizardProps {
  dialogOpen: boolean;
  userForm: UserFormState;
  setUserForm: (f: UserFormState) => void;
  units: Unit[];
  onCancel: () => void;
  onSubmit: () => void;
  idPrefix?: string;
}

export function CreateUserWizard({
  dialogOpen,
  userForm,
  setUserForm,
  units,
  onCancel,
  onSubmit,
  idPrefix = 'add-',
}: CreateUserWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (dialogOpen) setStep(1);
  }, [dialogOpen]);

  const goNext = () => {
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password) {
      toast.error('Preencha nome, email e senha');
      return;
    }
    if (userForm.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setStep(2);
  };

  const needsPrimaryUnit =
    userForm.role !== 'designer' &&
    userForm.role !== 'admin' &&
    userForm.role !== 'developer' &&
    userForm.role !== 'purchases_admin';

  return (
    <div className="space-y-6">
      <nav aria-label="Etapas do cadastro" className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  step === s.id
                    ? 'bg-primary text-primary-foreground'
                    : step > s.id
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {s.id}
              </span>
              <span
                className={cn(
                  'hidden text-sm font-medium sm:inline truncate',
                  step === s.id ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 min-w-[1rem]',
                  step > s.id ? 'bg-primary/40' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </nav>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dados usados para login e identificação no sistema.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}name`}>Nome completo *</Label>
              <Input
                id={`${idPrefix}name`}
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Ex.: Maria Silva"
                autoComplete="name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}jobTitle`}>Cargo</Label>
              <Input
                id={`${idPrefix}jobTitle`}
                value={userForm.jobTitle}
                onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })}
                placeholder="Opcional — ex.: Analista de compras"
                autoComplete="organization-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}email`}>E-mail *</Label>
              <Input
                id={`${idPrefix}email`}
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="nome@empresa.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}password`}>Senha inicial *</Label>
              <Input
                id={`${idPrefix}password`}
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Defina o perfil e, quando necessário, unidades e opções específicas.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}role`}>Perfil *</Label>
              <Select
                value={userForm.role}
                onValueChange={(value) => setUserForm({ ...userForm, role: value as UserRole })}
              >
                <SelectTrigger id={`${idPrefix}role`}>
                  <SelectValue placeholder="Selecione o perfil" />
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
                  <SelectItem value="purchases_admin">Admin Compras</SelectItem>
                  <SelectItem value="executor">Executor</SelectItem>
                  <SelectItem value="driver">Motorista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsPrimaryUnit && (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}primaryUnit`}>Unidade primária *</Label>
                <Select
                  value={userForm.primaryUnitId}
                  onValueChange={(value) => setUserForm({ ...userForm, primaryUnitId: value })}
                >
                  <SelectTrigger id={`${idPrefix}primaryUnit`}>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Opções do perfil
              </p>
              <RoleSpecificFields userForm={userForm} setUserForm={setUserForm} units={units} idPrefix={idPrefix} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between sm:items-center">
        {step === 1 ? (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" onClick={goNext} className="gap-1 sm:min-w-[8rem]">
              Continuar
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button type="button" onClick={onSubmit} className="bg-primary hover:bg-primary/90 sm:min-w-[8rem]">
              Criar usuário
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
