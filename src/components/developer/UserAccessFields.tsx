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

export interface UserAccessGroupsProps {
  groupIds: string[];
  onGroupIdsChange: (ids: string[]) => void;
  groups: AccessGroup[];
  idPrefix?: string;
}

export function UserAccessGroups({ groupIds, onGroupIdsChange, groups, idPrefix = '' }: UserAccessGroupsProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Grupos de acesso</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {groups.map((g) => (
          <label
            key={g.id}
            className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              id={`${idPrefix}group-${g.id}`}
              checked={groupIds.includes(g.id)}
              onCheckedChange={() => {
                if (groupIds.includes(g.id)) {
                  onGroupIdsChange(groupIds.filter((id) => id !== g.id));
                } else {
                  onGroupIdsChange([...groupIds, g.id]);
                }
              }}
            />
            <span className="text-xs font-medium truncate">{g.nome}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">({g.tabs.length})</span>
          </label>
        ))}
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground col-span-full">Nenhum grupo cadastrado.</p>
        )}
      </div>
    </div>
  );
}

export interface UserAccessExtraTabsProps {
  extraTabs: string[];
  onExtraTabsChange: (ids: string[]) => void;
  idPrefix?: string;
}

export function UserAccessExtraTabs({ extraTabs, onExtraTabsChange, idPrefix = '' }: UserAccessExtraTabsProps) {
  const handleToggleTab = (tabId: string) => {
    if (extraTabs.includes(tabId)) {
      onExtraTabsChange(extraTabs.filter((id) => id !== tabId));
    } else {
      onExtraTabsChange([...extraTabs, tabId]);
    }
  };

  const handleToggleCategory = (category: typeof AVAILABLE_TABS[0]) => {
    const catIds = category.tabs.map((t) => t.id);
    const allSelected = catIds.every((id) => extraTabs.includes(id));
    if (allSelected) {
      onExtraTabsChange(extraTabs.filter((t) => !catIds.includes(t)));
    } else {
      onExtraTabsChange([...new Set([...extraTabs, ...catIds])]);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Abas extras</Label>
      <Accordion type="multiple" className="w-full">
        {AVAILABLE_TABS.map((category) => (
          <AccordionItem key={category.label} value={category.label}>
            <AccordionTrigger className="py-1.5 text-xs hover:no-underline">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={category.tabs.every((t) => extraTabs.includes(t.id))}
                  onCheckedChange={() => handleToggleCategory(category)}
                  onClick={(e) => e.stopPropagation()}
                />
                {category.label}
                {extraTabs.filter((t) => category.tabs.some((c) => c.id === t)).length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({extraTabs.filter((t) => category.tabs.some((c) => c.id === t)).length} selecionadas)
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-6 space-y-0.5 pb-1.5">
              {category.tabs.map((tab) => (
                <label key={tab.id} className="flex items-center gap-2 cursor-pointer py-0.5 text-xs">
                  <Checkbox
                    id={`${idPrefix}extra-${tab.id}`}
                    checked={extraTabs.includes(tab.id)}
                    onCheckedChange={() => handleToggleTab(tab.id)}
                  />
                  <span className="text-sm">{TAB_LABEL_MAP.get(tab.id) ?? tab.label}</span>
                </label>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

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
    <div className="space-y-4">
      <UserAccessGroups
        groupIds={safeGroupIds}
        onGroupIdsChange={onGroupIdsChange}
        groups={groups}
        idPrefix={idPrefix}
      />
      <UserAccessExtraTabs
        extraTabs={safeExtraTabs}
        onExtraTabsChange={onExtraTabsChange}
        idPrefix={idPrefix}
      />
    </div>
  );
}
