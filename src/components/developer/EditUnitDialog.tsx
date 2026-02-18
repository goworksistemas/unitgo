import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DeveloperState } from './types';
import { FloorPicker } from './FloorPicker';

type Props = Pick<DeveloperState,
  | 'isEditUnitDialogOpen' | 'setIsEditUnitDialogOpen'
  | 'unitForm' | 'setUnitForm'
  | 'handleUpdateUnit'
>;

export function EditUnitDialog({
  isEditUnitDialogOpen, setIsEditUnitDialogOpen,
  unitForm, setUnitForm,
  handleUpdateUnit,
}: Props) {
  return (
    <Dialog open={isEditUnitDialogOpen} onOpenChange={setIsEditUnitDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Unidade</DialogTitle>
          <DialogDescription>Atualize os dados da unidade</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="editUnitName">Nome da Unidade *</Label>
            <Input
              id="editUnitName"
              value={unitForm.name}
              onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editUnitAddress">Endereço *</Label>
            <Input
              id="editUnitAddress"
              value={unitForm.address}
              onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editUnitStatus">Status</Label>
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
          <FloorPicker unitForm={unitForm} setUnitForm={setUnitForm} idPrefix="edit-" columns="grid-cols-3" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsEditUnitDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdateUnit}>Salvar Alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
