'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MapChanges } from '@gigawattmap/types';
import { ChevronDown, ChevronUp, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { TickerPanel } from '@/components/ticker-panel/ticker-panel';
import { AnnouncementsFeed } from '@/components/announcements-feed/announcements-feed';
import { useMapStore } from '@/lib/store/map-store';
import { LayerControls } from './layer-controls';
import { RecentChanges } from './recent-changes';
import type { AiCampusCollection } from './layers/datacenters-layer';

type Props = {
  data: AiCampusCollection | null;
  changes: MapChanges | null;
  changesUnavailable: boolean;
  detail: ReactNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCloseDetail: () => void;
};
const TABS = ['Companies', 'Activity', 'Layers'] as const;
type Tab = (typeof TABS)[number];
type Size = 'collapsed' | 'preview' | 'expanded';

export function ResearchPanel({
  data,
  changes,
  changesUnavailable,
  detail,
  selectedId,
  onSelect,
  onCloseDetail,
}: Props): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('Companies');
  const [size, setSize] = useState<Size>('preview');
  const reopenRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (size === 'collapsed') reopenRef.current?.focus();
  }, [size]);
  const previousSize = useRef<Size>('preview');
  const previousId = useRef<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const basemap = useMapStore((s) => s.basemap);
  const setBasemap = useMapStore((s) => s.setBasemap);
  useEffect(() => {
    if (selectedId && !previousId.current) {
      previousSize.current = size;
      setSize('expanded');
    } else if (!selectedId && previousId.current) {
      setSize(previousSize.current === 'collapsed' ? 'preview' : previousSize.current);
      tabRefs.current[TABS.indexOf(tab)]?.focus();
    }
    previousId.current = selectedId;
  }, [selectedId, size, tab]);
  const showTab = (next: Tab): void => {
    setTab(next);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
      setSize('expanded');
    else if (size === 'collapsed') setSize('preview');
    if (selectedId) onCloseDetail();
  };
  return (
    <aside className="research-panel" data-size={size} aria-label="Research panel">
      <header className="research-panel-header">
        <button
          ref={reopenRef}
          className="research-panel-opener"
          aria-label="Open research panel"
          onClick={() => setSize('preview')}
        >
          <PanelRightOpen size={18} />
          <span>Research</span>
        </button>
        <div className="research-panel-heading">
          <span className="workspace-eyebrow">RESEARCH DESK</span>
          <p className="mt-1 text-sm font-medium">AI infrastructure, in context.</p>
        </div>
        <div className="research-panel-actions">
          <button
            className="sheet-expand"
            onClick={() => setSize(size === 'expanded' ? 'preview' : 'expanded')}
            aria-label={size === 'expanded' ? 'Preview research panel' : 'Expand research panel'}
          >
            {size === 'expanded' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={() => setSize(size === 'collapsed' ? 'preview' : 'collapsed')}
            aria-label={size === 'collapsed' ? 'Open research panel' : 'Collapse research panel'}
          >
            <PanelRightClose size={16} />
          </button>
        </div>
      </header>
      <div className="research-panel-body">
        <div role="tablist" aria-label="Research views" className="research-tabs">
          {TABS.map((item, index) => (
            <button
              key={item}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              id={`research-tab-${item}`}
              aria-selected={tab === item && !selectedId}
              aria-controls={`research-view-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onClick={() => showTab(item)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 2
                      : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                showTab(TABS[next]!);
                tabRefs.current[next]?.focus();
              }}
            >
              {item}
            </button>
          ))}
        </div>
        {detail && <div className="min-h-0 flex-1 overflow-hidden">{detail}</div>}
        <div className={detail ? 'hidden' : 'min-h-0 flex-1 overflow-hidden'}>
          {TABS.map((item) => (
            <div
              key={item}
              role="tabpanel"
              id={`research-view-${item}`}
              aria-labelledby={`research-tab-${item}`}
              className={tab === item ? 'h-full overflow-y-auto' : 'hidden'}
              tabIndex={0}
            >
              {item === 'Companies' && (
                <TickerPanel
                  facilities={data}
                  onSelection={() => {
                    if (
                      typeof window !== 'undefined' &&
                      window.matchMedia('(max-width: 767px)').matches
                    )
                      setSize('preview');
                  }}
                />
              )}
              {item === 'Activity' && (
                <>
                  <RecentChanges
                    history={changes}
                    loading={!data}
                    unavailable={changesUnavailable}
                    onSelect={onSelect}
                  />
                  <AnnouncementsFeed datacenters={data} onSelectDatacenter={onSelect} />
                </>
              )}
              {item === 'Layers' && (
                <>
                  <div className="px-4 pt-5">
                    <h3 className="text-sm font-medium">Map appearance</h3>
                    <p className="my-2 text-xs leading-relaxed text-text-muted">
                      A quiet basemap keeps the infrastructure in focus.
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="workspace-button"
                        aria-pressed={basemap === 'dark'}
                        onClick={() => setBasemap('dark')}
                      >
                        Dark map
                      </button>
                      <button
                        className="workspace-button"
                        aria-pressed={basemap === 'light'}
                        onClick={() => setBasemap('light')}
                      >
                        Light map
                      </button>
                    </div>
                  </div>
                  <LayerControls />
                  <div className="m-4 rounded-lg border border-white/10 p-3">
                    <h3 className="mb-3 text-xs font-medium">Facility legend</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs text-text-muted">
                      {[
                        ['Hyperscale', 'var(--dc-hyperscale)'],
                        ['Colocation', 'var(--dc-colo)'],
                        ['Neocloud', 'var(--dc-neocloud)'],
                        ['Enterprise', 'var(--dc-enterprise)'],
                      ].map(([label, color]) => (
                        <span key={label} className="flex items-center gap-2">
                          <i className="h-2 w-2 rounded-full" style={{ background: color }} />
                          {label}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-text-muted">
                      Cluster labels count facilities. Marker size reflects estimated capacity where
                      available.
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
