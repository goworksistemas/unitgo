import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { UnitFormState } from './types';

const ALL_FLOORS = [
  '3º Subsolo', '2º Subsolo', '1º Subsolo', 'Térreo',
  '1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar',
  '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar',
  '11º Andar', '12º Andar', '13º Andar', '14º Andar', '15º Andar',
  '16º Andar', '17º Andar', '18º Andar', '19º Andar', '20º Andar',
  '21º Andar', '22º Andar', '23º Andar', '24º Andar', '25º Andar',
  '26º Andar', '27º Andar', '28º Andar', '29º Andar', 'Cobertura',
];

interface FloorPickerProps {
  unitForm: UnitFormState;
  setUnitForm: (f: UnitFormState) => void;
  idPrefix?: string;
  columns?: string;
}

export function FloorPicker({ unitForm, setUnitForm, idPrefix = '', columns = 'grid-cols-2 sm:grid-cols-3' }: FloorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Andares Disponíveis ({unitForm.floors.length} selecionados)</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUnitForm({ ...unitForm, floors: [...ALL_FLOORS] })}
          >
            Selecionar Todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUnitForm({ ...unitForm, floors: [] })}
          >
            Limpar
          </Button>
        </div>
      </div>
      <div className={`grid ${columns} gap-3 p-4 border rounded-lg bg-muted max-h-72 overflow-y-auto`}>
        {ALL_FLOORS.map((floor) => {
          const isChecked = Array.isArray(unitForm.floors) && unitForm.floors.includes(floor);
          return (
            <div key={floor} className="flex items-center space-x-2">
              <Checkbox
                id={`${idPrefix}floor-${floor}`}
                checked={isChecked}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setUnitForm({
                      ...unitForm,
                      floors: [...unitForm.floors, floor].sort((a, b) => ALL_FLOORS.indexOf(a) - ALL_FLOORS.indexOf(b))
                    });
                  } else {
                    setUnitForm({
                      ...unitForm,
                      floors: unitForm.floors.filter((f) => f !== floor)
                    });
                  }
                }}
              />
              <label
                htmlFor={`${idPrefix}floor-${floor}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {floor}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
