import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, KeyRound, ShieldAlert, Truck, Package } from 'lucide-react';
import type { User, Unit } from '@/types';
import { getRoleName } from '@/lib/format';

interface UserTableProps {
  users: User[];
  units: Unit[];
  handleEditUser: (user: User) => void | Promise<void>;
  handleDeleteUser: (userId: string) => void;
  handleRequestPasswordChange: (user: User) => void;
  setSelectedUser: (u: User | null) => void;
  setIsResetPasswordDialogOpen: (v: boolean) => void;
}

export function UserTable({
  users, units,
  handleEditUser, handleDeleteUser, handleRequestPasswordChange,
  setSelectedUser, setIsResetPasswordDialogOpen,
}: UserTableProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-accent/50">
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Detalhes</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  {user.jobTitle && <span className="text-xs text-muted-foreground">{user.jobTitle}</span>}
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {user.role === 'warehouse'
                    ? (user.warehouseType === 'delivery' ? 'Motorista' : 'Almoxarife')
                    : getRoleName(user.role)}
                </Badge>
              </TableCell>
              <TableCell>
                <UserDetails user={user} units={units} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}
                    title="Editar usuário" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Redefinir senha"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => { setSelectedUser(user); setIsResetPasswordDialogOpen(true); }}>
                    <KeyRound className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleRequestPasswordChange(user)}
                    title="Solicitar troca de senha no próximo login" className="h-8 w-8 text-amber-600 hover:bg-amber-50">
                    <ShieldAlert className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}
                    title="Excluir usuário" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UserDetails({ user, units }: { user: User; units: Unit[] }) {
  if (user.role === 'controller') {
    return (
      <span className="text-xs">
        Principal: {units.find(u => u.id === user.primaryUnitId)?.name || '-'}
      </span>
    );
  }
  if (user.role === 'admin') {
    return (
      <span className="text-xs">
        Tipo: {user.adminType === 'warehouse' ? 'Almoxarifado' : 'Unidades'}
      </span>
    );
  }
  if (user.role === 'warehouse') {
    return user.warehouseType === 'delivery' ? (
      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit">
        <Truck className="w-3 h-3" /> Motorista
      </span>
    ) : (
      <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full w-fit">
        <Package className="w-3 h-3" /> Almoxarife
      </span>
    );
  }
  return <span>Volante</span>;
}
