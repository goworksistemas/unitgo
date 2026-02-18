import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DeveloperState } from './types';
import { ItemFormBody } from './ItemFormBody';

type Props = Pick<DeveloperState,
  | 'isEditItemDialogOpen' | 'setIsEditItemDialogOpen'
  | 'itemForm' | 'setItemForm' | 'categories'
  | 'isUploadingImage'
  | 'handleUpdateItem' | 'handleImageUpload'
>;

export function EditItemDialog({
  isEditItemDialogOpen, setIsEditItemDialogOpen,
  itemForm, setItemForm, categories,
  isUploadingImage,
  handleUpdateItem, handleImageUpload,
}: Props) {
  return (
    <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
          <DialogDescription>Atualize os dados do item</DialogDescription>
        </DialogHeader>
        <ItemFormBody
          itemForm={itemForm}
          setItemForm={setItemForm}
          categories={categories}
          isUploadingImage={isUploadingImage}
          handleImageUpload={handleImageUpload}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdateItem}>Salvar Alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
