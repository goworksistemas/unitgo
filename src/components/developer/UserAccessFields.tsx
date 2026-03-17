import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AVAILABLE_TABS, TAB_LABEL_MAP } from '@/constants/availableTabs';
import type { AccessGroup } from '@/types';

interface UserAccessFieldsProps {
  groupIds?: string[];
  extraTabs?: string[];
  onGroupIdsChange: (ids: string[]) => void;
  onExtraTabsChange: (ids: string[]) => void;
  groups: AccessGroup[];
  idPrefix?: string;
}

export function UserAccessFields({
  groupIds = [],
  extraTabs = [],
  onGroupIdsChange,
  onExtraTabsChange,
  groups,
  idPrefix = '',
}: UserAccessFieldsProps) {
  const safeGroupIds = Array.isArray(groupIds) ? groupIds : [];
  const safeExtraTabs = Array.isArray(extraTabs) ? extraTabs : [];

  const handleToggleGroup = (groupId: string) => {
    if (safeGroupIds.includes(groupId)) {
      onGroupIdsChange(safeGroupIds.filter((id) => id !== groupId));
    } else {
      onGroupIdsChange([...safeGroupIds, groupId]);
    }
  };

  const handleToggleExtraTab = (tabId: string) => {
    if (safeExtraTabs.includes(tabId)) {
      onExtraTabsChange(safeExtraTabs.filter((id) => id !== tabId));
    } else {
      onExtraTabsChange([...safeExtraTabs, tabId]);
    }
  };

  const handleToggleExtraCategory = (category: typeof AVAILABLE_TABS[0]) => {
    const catIds = category.tabs.map((t) => t.id);
    const allSelected = catIds.every((id) => safeExtraTabs.includes(id));
    if (allSelected) {
      onExtraTabsChange(safeExtraTabs.filter((t) => !catIds.includes(t)));
    } else {
      onExtraTabsChange([...new Set([...safeExtraTabs, ...catIds])]);
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t">
      <div className="space-y-2">
        <Label>Grupos de acesso</Label>
        <p className="text-xs text-muted-foreground">
          O usuário terá acesso às abas definidas em cada grupo selecionado. Pode selecionar mais de um grupo.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {groups.map((g) => (
            <label
              key={g.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50"
            >
              <Checkbox
                id={`${idPrefix}group-${g.id}`}
                checked={safeGroupIds.includes(g.id)}
                onCheckedChange={() => handleToggleGroup(g.id)}
              />
              <span className="text-sm font-medium">{g.nome}</span>
              <span className="text-xs text-muted-foreground">({g.tabs.length} abas)</span>
            </label>
          ))}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado. Crie grupos em Grupos de Acesso.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Abas extras (acesso adicional)</Label>
        <p className="text-xs text-muted-foreground">
          Conceda acesso a abas específicas além dos grupos. Útil para dar permissão pontual sem criar grupo.
        </p>
        <Accordion type="multiple" className="w-full">
          {AVAILABLE_TABS.map((category) => (
            <AccordionItem key={category.label} value={category.label}>
              <AccordionTrigger className="py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={category.tabs.every((t) => safeExtraTabs.includes(t.id))}
                    onCheckedChange={() => handleToggleExtraCategory(category)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {category.label}
                    {safeExtraTabs.filter((t) => category.tabs.some((c) => c.id === t)).length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({safeExtraTabs.filter((t) => category.tabs.some((c) => c.id === t)).length} selecionadas)
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-6 space-y-2">
                {category.tabs.map((tab) => (
                  <label key={tab.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      id={`${idPrefix}extra-${tab.id}`}
                      checked={safeExtraTabs.includes(tab.id)}
                      onCheckedChange={() => handleToggleExtraTab(tab.id)}
                    />
                    <span className="text-sm">{TAB_LABEL_MAP.get(tab.id) ?? tab.label}</span>
                  </label>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
