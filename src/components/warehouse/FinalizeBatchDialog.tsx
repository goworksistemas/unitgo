import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle } from 'lucide-react';

interface FinalizeBatchDialogProps {
  selectedBatchToFinalize: string | null;
  onOpenChange: () => void;
  onConfirm: () => void;
}

export function FinalizeBatchDialog({
  selectedBatchToFinalize, onOpenChange, onConfirm,
}: FinalizeBatchDialogProps) {
  return (
    <AlertDialog open={!!selectedBatchToFinalize} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base sm:text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Registrar Conclusão de Entrega
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            O controlador já confirmou o recebimento deste lote. Deseja registrar a conclusão no sistema do almoxarifado?
            <br /><br />
            Esta ação marcará o lote como finalizado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            Registrar Conclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
