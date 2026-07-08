import { CommandCenter } from '@/components/dashboard/CommandCenter';
import { getScenario, SCENARIO_META } from '@/data/scenarios';
import { scoreStadium } from '@/lib/riskEngine';

export default function HomePage() {
  const scenario = getScenario('normal-flow');

  // getScenario('normal-flow') is guaranteed to exist -- it's a fixed key in
  // the SCENARIOS map, not user input -- so a thrown error here would mean a
  // real programming mistake, not a runtime/user condition to recover from.
  if (!scenario) {
    throw new Error('Default scenario "normal-flow" is missing from the scenario dataset.');
  }

  const zoneRisks = scoreStadium(scenario);

  return (
    <CommandCenter
      initial={{
        scenario,
        zoneRisks,
        scenarios: SCENARIO_META,
      }}
    />
  );
}
