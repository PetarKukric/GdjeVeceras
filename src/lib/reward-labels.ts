/** Ko izdaje nagradu kad nije vezana za lokal (dijeli se klijent/server, bez Prisme) */
export const REWARD_PROVIDERS = ['GV', 'PANTHER_TIKE'];
export const PROVIDER_LABEL: Record<string, string> = { GV: 'GdjeVečeras merch', PANTHER_TIKE: 'Panther Tike' };

export function rewardIssuer(reward: { venue?: { name: string } | null; provider?: string | null }): string {
  return reward.venue?.name || PROVIDER_LABEL[reward.provider || 'GV'] || PROVIDER_LABEL.GV;
}
