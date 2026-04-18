import { estimateMw } from './estimate-mw';

/**
 * Methodology write-up for `/about`. Deliberately terse and specific —
 * investors and journalists read this before citing us. Any change to
 * the Python pipeline's estimation logic must be mirrored here (and in
 * `estimate-mw.ts`) in the same commit.
 */
export function MethodologySection(): React.ReactElement {
  // Worked example: Stargate-class AI campus, 1M sqft.
  const example = estimateMw({
    sqft: 1_000_000,
    isAiCampus: true,
    isModernHyperscaler: true,
    yearBuilt: 2024,
  });

  return (
    <div className="space-y-8">
      <section aria-labelledby="mw-estimation">
        <h3 id="mw-estimation" className="mb-2 font-sans text-lg font-semibold text-text-primary">
          MW estimation
        </h3>
        <p>
          For facilities without a disclosed IT load, we estimate capacity from building footprint
          using a watts-per-square-foot band that depends on the build vintage and operator class:
        </p>
        <ul className="not-prose my-4 space-y-1 font-mono text-sm text-text-muted">
          <li>AI-dedicated campus → <span className="tabular text-text-primary">300–500 W/sqft</span></li>
          <li>Modern hyperscaler (≥2020) → <span className="tabular text-text-primary">200–350 W/sqft</span></li>
          <li>2015–2019 build → <span className="tabular text-text-primary">150–250 W/sqft</span></li>
          <li>Pre-2015 build → <span className="tabular text-text-primary">100–200 W/sqft</span></li>
        </ul>
        <p>
          We multiply the gross footprint by a 60% IT-load fraction (the remainder being cooling,
          electrical, and office), then round to the nearest 0.1 MW. We always surface a range;
          point estimates would imply a precision we do not have.
        </p>
        <div className="not-prose my-4 rounded border border-bg-elevated bg-bg-panel p-4 font-mono text-sm">
          <div className="mb-2 text-xs uppercase tracking-wider text-text-subtle">
            Worked example
          </div>
          <div className="text-text-muted">
            1,000,000 sqft AI campus, built 2024
          </div>
          <div className="mt-2 text-text-primary">
            1,000,000 × 0.60 × (300–500 W/sqft) ÷ 1,000,000 ={' '}
            <span className="tabular text-accent-focus">
              {example.low.toFixed(1)}–{example.high.toFixed(1)} MW
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="confidence-tiers">
        <h3 id="confidence-tiers" className="mb-2 font-sans text-lg font-semibold text-text-primary">
          Confidence tiers
        </h3>
        <p>
          Every datacenter carries one of four confidence labels. We show this in the intelligence
          card so a reader can tell a regulator-filed number from our best guess:
        </p>
        <ul className="not-prose my-4 space-y-2 text-sm">
          <li>
            <span className="font-mono text-status-operational">verified</span>{' '}
            <span className="font-serif text-text-muted">
              — operator-disclosed or regulator-filed MW, location matches.
            </span>
          </li>
          <li>
            <span className="font-mono text-dc-colo">osm_only</span>{' '}
            <span className="font-serif text-text-muted">
              — OpenStreetMap footprint, no operator confirmation; MW estimated from sqft.
            </span>
          </li>
          <li>
            <span className="font-mono text-status-announced">press_release</span>{' '}
            <span className="font-serif text-text-muted">
              — operator announced but not yet built or permitted; MW from the release.
            </span>
          </li>
          <li>
            <span className="font-mono text-text-subtle">estimated</span>{' '}
            <span className="font-serif text-text-muted">
              — no primary source; MW inferred from peer facilities of similar scale.
            </span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="substation-join">
        <h3 id="substation-join" className="mb-2 font-sans text-lg font-semibold text-text-primary">
          Substation proximity join
        </h3>
        <p>
          To associate a datacenter with the grid node feeding it, we find the nearest transmission
          substation within a 10 km radius, ranked first by voltage class (500 kV &gt; 345 kV &gt; 230 kV
          &gt; 138 kV &gt; lower) and then by distance. Substations further than 10 km are not joined;
          we prefer &ldquo;unknown&rdquo; to a false link. The join is a hint, not a delivery claim —
          actual service may come from a different feeder owned by a different utility.
        </p>
      </section>

      <section aria-labelledby="ticker-mapping">
        <h3 id="ticker-mapping" className="mb-2 font-sans text-lg font-semibold text-text-primary">
          Operator → ticker mapping
        </h3>
        <p>
          We map an operator to a public ticker only when the relationship is unambiguous: the
          operator is the listed parent, or a wholly-owned subsidiary whose capex rolls up cleanly.
          Joint ventures, private subsidiaries of public parents, and minority-invested neoclouds
          are left unmapped rather than guessed. The mapping table is hand-maintained and reviewed
          on every earnings season.
        </p>
      </section>
    </div>
  );
}
