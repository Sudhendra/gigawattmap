'use client';

import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';
import { useSearchIndex } from '@/lib/hooks/use-search-index';
import { CommandPalette, type CommandPaletteActions } from './command-palette';

type Props = {
  data: AiCampusCollection | null;
  onOpenChange: (open: boolean) => void;
  actions: CommandPaletteActions;
};
export function MapSearch({ data, onOpenChange, actions }: Props): React.JSX.Element {
  const index = useSearchIndex(data);
  return <CommandPalette open onOpenChange={onOpenChange} index={index} actions={actions} />;
}
