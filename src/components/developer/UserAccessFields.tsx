import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDownIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
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
            <AccordionPrimitive.Header className="flex items-center gap-2 py-1.5">
              <Checkbox
                checked={category.tabs.every((t) => extraTabs.includes(t.id))}
                onCheckedChange={() => handleToggleCategory(category)}
                className="shrink-0"
              />
              <AccordionPrimitive.Trigger
                className={cn(
                  "flex flex-1 items-center justify-between gap-2 rounded-md text-left text-xs font-medium transition-all outline-none hover:no-underline",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "[&[data-state=open]>svg]:rotate-180",
                )}
              >
                <span>
                  {category.label}
                  {extraTabs.filter((t) => category.tabs.some((c) => c.id === t)).length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({extraTabs.filter((t) => category.tabs.some((c) => c.id === t)).length} selecionadas)
                    </span>
                  )}
                </span>
                <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200" />
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
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
