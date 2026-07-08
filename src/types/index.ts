/**
 * Core domain types shared across the risk engine, prompt builder, API routes,
 * and UI. Keeping these in one place is what lets the deterministic logic and
 * the AI-backed logic agree on a single shape of "truth" about the stadium.
 */

export type ZoneId = string;

export interface Zone {
  id: ZoneId;
  label: string;
  gate: string;
  level: 'lower' | 'upper' | 'club';
  capacity: number;
  occupancy: number;
  inflowRatePerMin: number;
  outflowRatePerMin: number;
  nearestExitZoneIds: ZoneId[];
  accessibleRoute: boolean;
}

export interface WeatherContext {
  condition: 'clear' | 'rain' | 'heat' | 'storm-watch';
  temperatureC: number;
}

export type IncidentCategory = 'medical' | 'security' | 'crowd-surge' | 'facility';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentReport {
  id: string;
  zoneId: ZoneId;
  category: IncidentCategory;
  severity: IncidentSeverity;
  reportedAtMinute: number;
  description: string;
}

export type MatchPhase = 'pre-match' | 'in-play' | 'halftime' | 'post-match';

export interface MatchContext {
  stadiumName: string;
  hostCity: string;
  capacity: number;
  matchLabel: string;
  minutesToKickoff: number;
  phase: MatchPhase;
}

export type ScenarioId =
  | 'normal-flow'
  | 'halftime-rush'
  | 'post-match-exodus'
  | 'security-incident';

export interface StadiumState {
  scenarioId: ScenarioId;
  scenarioLabel: string;
  match: MatchContext;
  weather: WeatherContext;
  zones: Zone[];
  incidents: IncidentReport[];
}

export type RiskLevel = 'nominal' | 'elevated' | 'high' | 'critical';

export interface ZoneRisk {
  zoneId: ZoneId;
  occupancyRatio: number;
  riskScore: number;
  riskLevel: RiskLevel;
  contributingFactors: string[];
  /** The single worst active incident in this zone, or null if none. Kept as
   * structured data (not just parsed out of contributingFactors strings) so
   * severity- and category-aware logic downstream doesn't have to string-match. */
  worstIncident: { severity: IncidentSeverity; category: IncidentCategory } | null;
}

export type RecommendationCategory =
  | 'gate-management'
  | 'staffing'
  | 'communication'
  | 'medical'
  | 'security'
  | 'facility'
  | 'transportation';

export interface OperationalRecommendation {
  id: string;
  priority: 1 | 2 | 3;
  action: string;
  rationale: string;
  targetZoneIds: ZoneId[];
  category: RecommendationCategory;
}

export type RecommendationSource = 'gemini' | 'fallback-heuristic';

export interface AdvisorResponse {
  generatedAt: string;
  overallRiskLevel: RiskLevel;
  recommendations: OperationalRecommendation[];
  source: RecommendationSource;
}

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'pt' | 'ar' | 'hi';
export type AnnouncementUrgency = 'routine' | 'important' | 'urgent';

export interface AccessibilityNeed {
  id: 'wheelchair' | 'low-vision' | 'hearing' | 'sensory-friendly' | 'cognitive-support';
  label: string;
}
