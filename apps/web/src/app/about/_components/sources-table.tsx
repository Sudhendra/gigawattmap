/**
 * Full data-source inventory for the `/about` page, grouped by the same
 * categories used in `SPEC.md §3`. Every source that contributes a
 * feature the reader can see on the map must appear here; omitting one
 * breaks the ODbL / CC-BY attribution requirement.
 */
type Source = {
  name: string;
  coverage: string;
  license: string;
  cadence: string;
  href: string;
};

type SourceGroup = {
  heading: string;
  sources: Source[];
};

const GROUPS: SourceGroup[] = [
  {
    heading: 'Datacenter geometry',
    sources: [
      {
        name: 'OpenStreetMap (building=data_center)',
        coverage: 'Global, ~20k features',
        license: 'ODbL 1.0',
        cadence: 'Weekly',
        href: 'https://www.openstreetmap.org/',
      },
      {
        name: 'IM3 / PNNL Datacenter Atlas',
        coverage: 'US, peer-reviewed',
        license: 'ODbL 1.0',
        cadence: 'Annual',
        href: 'https://im3.pnnl.gov/',
      },
      {
        name: 'NewCloudAtlas',
        coverage: 'Neocloud / GPU operators',
        license: 'ODbL 1.0',
        cadence: 'Rolling',
        href: 'https://newcloudatlas.com/',
      },
      {
        name: 'Hand-curated AI campuses',
        coverage: 'Named flagship builds',
        license: 'CC BY-SA 4.0',
        cadence: 'On announcement',
        href: 'https://github.com/gigawattmap/data',
      },
    ],
  },
  {
    heading: 'Power infrastructure',
    sources: [
      {
        name: 'Global Energy Monitor (GEM / GIPT)',
        coverage: 'Global plants ≥20 MW',
        license: 'CC BY 4.0',
        cadence: 'Semi-annual',
        href: 'https://globalenergymonitor.org/',
      },
      {
        name: 'WRI Global Power Plant Database',
        coverage: 'Global, 35k plants',
        license: 'CC BY 4.0',
        cadence: 'Irregular (v1.3 2021)',
        href: 'https://datasets.wri.org/dataset/globalpowerplantdatabase',
      },
      {
        name: 'EIA Form 860',
        coverage: 'US generators',
        license: 'Public domain',
        cadence: 'Annual',
        href: 'https://www.eia.gov/electricity/data/eia860/',
      },
      {
        name: 'Catalyst Cooperative PUDL',
        coverage: 'US utility + generator data',
        license: 'CC BY 4.0',
        cadence: 'Monthly',
        href: 'https://catalyst.coop/pudl/',
      },
      {
        name: 'OSM power=substation / power=line',
        coverage: 'Global, voltage-tagged',
        license: 'ODbL 1.0',
        cadence: 'Weekly',
        href: 'https://www.openstreetmap.org/',
      },
      {
        name: 'GEM Gas Finance Tracker',
        coverage: 'New gas builds, financing',
        license: 'CC BY 4.0',
        cadence: 'Quarterly',
        href: 'https://globalenergymonitor.org/projects/global-gas-plant-tracker/',
      },
    ],
  },
  {
    heading: 'Submarine cables & interconnect',
    sources: [
      {
        name: 'TeleGeography submarine cable map',
        coverage: 'Global, landing points',
        license: 'CC BY-NC-SA 3.0',
        cadence: 'Rolling',
        href: 'https://www.submarinecablemap.com/',
      },
      {
        name: 'OSM telecom=exchange',
        coverage: 'IXPs, carrier hotels',
        license: 'ODbL 1.0',
        cadence: 'Weekly',
        href: 'https://www.openstreetmap.org/',
      },
      {
        name: 'PeeringDB',
        coverage: 'IXPs, facilities, ASNs',
        license: 'CC BY 4.0',
        cadence: 'Daily',
        href: 'https://www.peeringdb.com/',
      },
    ],
  },
  {
    heading: 'Cloud provider regions',
    sources: [
      {
        name: 'AWS / Azure / GCP / Oracle / Alibaba / IBM / DigitalOcean / Vultr / Akamai',
        coverage: 'Hand-curated from vendor docs',
        license: 'Per-vendor ToS',
        cadence: 'Monthly',
        href: 'https://aws.amazon.com/about-aws/global-infrastructure/',
      },
    ],
  },
  {
    heading: 'Opposition & environmental risk',
    sources: [
      {
        name: 'Data Center Watch',
        coverage: 'US opposition incidents',
        license: 'Editorial / fair use',
        cadence: 'Rolling',
        href: 'https://datacenterwatch.org/',
      },
      {
        name: 'datacentertracker.org',
        coverage: 'US permits, litigation',
        license: 'Editorial / fair use',
        cadence: 'Rolling',
        href: 'https://datacentertracker.org/',
      },
      {
        name: 'FracTracker',
        coverage: 'Fossil-fuel proximity',
        license: 'CC BY-NC-SA 4.0',
        cadence: 'Rolling',
        href: 'https://www.fractracker.org/',
      },
      {
        name: 'WRI Aqueduct Water Risk Atlas',
        coverage: 'Global water stress',
        license: 'CC BY 4.0',
        cadence: 'Irregular',
        href: 'https://www.wri.org/aqueduct',
      },
      {
        name: 'EPA FRS / ECHO',
        coverage: 'US regulated facilities',
        license: 'Public domain',
        cadence: 'Weekly',
        href: 'https://www.epa.gov/frs',
      },
    ],
  },
  {
    heading: 'Financial exposure',
    sources: [
      {
        name: 'SEC EDGAR (10-K, 10-Q, 8-K)',
        coverage: 'US-listed operators',
        license: 'Public domain',
        cadence: 'On filing',
        href: 'https://www.sec.gov/edgar',
      },
      {
        name: 'Finnhub (free tier)',
        coverage: 'Global quotes',
        license: 'API ToS',
        cadence: 'Real-time (delayed)',
        href: 'https://finnhub.io/',
      },
      {
        name: 'Yahoo Finance (unofficial)',
        coverage: 'Global quotes, fundamentals',
        license: 'API ToS',
        cadence: 'Real-time (delayed)',
        href: 'https://finance.yahoo.com/',
      },
      {
        name: 'Alpha Vantage',
        coverage: 'Equities, FX',
        license: 'API ToS',
        cadence: 'Daily',
        href: 'https://www.alphavantage.co/',
      },
    ],
  },
  {
    heading: 'Announcements & news',
    sources: [
      {
        name: 'Datacenter Dynamics (DCD)',
        coverage: 'Global industry news',
        license: 'Editorial / fair use',
        cadence: 'Daily',
        href: 'https://www.datacenterdynamics.com/',
      },
      {
        name: 'Data Center Frontier',
        coverage: 'US industry news',
        license: 'Editorial / fair use',
        cadence: 'Daily',
        href: 'https://www.datacenterfrontier.com/',
      },
      {
        name: 'Reuters / Bloomberg / FT / WSJ',
        coverage: 'Financial coverage',
        license: 'Editorial / fair use',
        cadence: 'Daily',
        href: 'https://www.reuters.com/',
      },
    ],
  },
];

export function SourcesTable(): React.ReactElement {
  return (
    <div className="not-prose space-y-8">
      {GROUPS.map((group) => (
        <section key={group.heading} aria-labelledby={`src-${slug(group.heading)}`}>
          <h3
            id={`src-${slug(group.heading)}`}
            className="mb-3 font-sans text-sm font-semibold uppercase tracking-wider text-text-muted"
          >
            {group.heading}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-bg-elevated text-xs uppercase tracking-wider text-text-subtle">
                  <th scope="col" className="py-2 pr-4 font-sans font-medium">
                    Source
                  </th>
                  <th scope="col" className="py-2 pr-4 font-sans font-medium">
                    Coverage
                  </th>
                  <th scope="col" className="py-2 pr-4 font-sans font-medium">
                    License
                  </th>
                  <th scope="col" className="py-2 font-sans font-medium">
                    Refresh
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.sources.map((s) => (
                  <tr key={s.name} className="border-b border-bg-elevated/50 align-top">
                    <td className="py-3 pr-4">
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-text-primary underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary"
                      >
                        {s.name}
                      </a>
                    </td>
                    <td className="py-3 pr-4 font-serif text-text-primary">{s.coverage}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-text-muted">{s.license}</td>
                    <td className="py-3 font-mono text-xs text-text-muted">{s.cadence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
