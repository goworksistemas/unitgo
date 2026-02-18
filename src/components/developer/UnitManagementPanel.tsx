import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { DeveloperState } from './types';
import { FloorPicker } from './FloorPicker';

type Props = Pick<DeveloperState,
  | 'units'
  | 'isAddUnitDialogOpen' | 'setIsAddUnitDialogOpen'
  | 'unitForm' | 'setUnitForm'
  | 'handleAddUnit' | 'handleEditUnit' | 'handleDeleteUnit'
  | 'handleInitSchema' | 'getWarehouseUnitId'
>;

export function UnitManagementPanel({
  units,
  isAddUnitDialogOpen, setIsAddUnitDialogOpen,
  unitForm, setUnitForm,
  handleAddUnit, handleEditUnit, handleDeleteUnit,
  handleInitSchema, getWarehouseUnitId,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestão de Unidades</h2>
          <p className="text-sm text-muted-foreground">Crie, edite ou remova unidades do sistema</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInitSchema}
            className="gap-2 w-full sm:w-auto"
          >
            🔧 Atualizar Schema DB
          </Button>
          <Dialog open={isAddUnitDialogOpen} onOpenChange={setIsAddUnitDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90">
                <PlusCircle className="w-4 h-4" />
                Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Nova Unidade</DialogTitle>
                <DialogDescription>Preencha os dados da nova unidade</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="unitName">Nome da Unidade *</Label>
                  <Input
                    id="unitName"
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                    placeholder="Ex: Paulista 500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitAddress">Endereço *</Label>
                  <Input
                    id="unitAddress"
                    value={unitForm.address}
                    onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })}
                    placeholder="Ex: Av. Paulista, 500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitStatus">Status</Label>
                  <Select
                    value={unitForm.status}
                    onValueChange={(value) => setUnitForm({ ...unitForm, status: value as 'active' | 'inactive' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="inactive">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FloorPicker unitForm={unitForm} setUnitForm={setUnitForm} idPrefix="add-" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddUnitDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddUnit} className="bg-primary hover:bg-primary/90">Criar Unidade</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-accent/50">
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell>{unit.name}</TableCell>
                <TableCell className="text-muted-foreground">{unit.address}</TableCell>
                <TableCell>
                  <Badge variant={unit.status === 'active' ? 'default' : 'secondary'}>
                    {unit.status === 'active' ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUnit(unit)}
                      className="h-8 w-8 text-slate-500 hover:text-slate-900"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {unit.id !== getWarehouseUnitId() && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUnit(unit.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
