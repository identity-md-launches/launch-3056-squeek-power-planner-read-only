import { type Account, type Core, type Economy, type Provenance, type Token, type Wheel } from './model';
export const API = 'https://api.squeekchain.com/v1';
export type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Json : null;
export function field(data: unknown, path: string): unknown {
  let current = data;
  for (const key of path.split('.')) {
    const record = obj(current);
    if (!record || record.status === 'unavailable' || record.status === 'unverified' || record.status === 'absent') return null;
    current = record[key];
  }
  return current ?? null;
}
export const integer = (v: unknown): bigint | null => typeof v === 'string' && /^\d+$/.test(v) ? BigInt(v) : null;
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const str = (v: unknown) => typeof v === 'string' ? v : null;
const bool = (v: unknown) => typeof v === 'boolean' ? v : null;
export function provenance(data: unknown, endpoint: string): Provenance {
  return { kind: 'API', endpoint: API + endpoint, block: str(field(data, 'chain.safeThroughBlock')) ?? undefined,
    at: str(field(data, 'chain.safeBlockTimestamp')) ?? str(field(data, 'generatedAt')) ?? new Date().toISOString() };
}
export async function get(path: string, signal?: AbortSignal): Promise<Json> {
  const timeout = AbortSignal.timeout(18_000);
  const response = await fetch(API + path, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, credentials: 'omit', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(response.status === 429 ? 'API rate limit reached. Wait briefly, then refresh.' : `API unavailable (HTTP ${response.status}). Try refreshing.`);
  const data: unknown = await response.json();
  if (!obj(data)) throw new Error('API response is unavailable. Try refreshing.');
  const d = data as Json;
  if (d.status === 'unavailable') throw new Error(`Unavailable: ${str(d.reason)?.replaceAll('_', ' ') ?? 'the API could not read this data'}. Try refreshing.`);
  if (field(d, 'chain.chainId') !== null && field(d, 'chain.chainId') !== '11155111') throw new Error('API returned a different chain. Data unavailable.');
  return d;
}
export function parseEconomy(d: Json): Economy {
  const n = (p: string) => integer(field(d, p));
  const powers = field(d, 'nft.basePower');
  return { minted: n('supply.totalMintedBaseUnits'), cap: n('supply.capBaseUnits'), totalStaked: n('staking.totalStakedBaseUnits'),
    nftPower: n('staking.totalNftPower'), sqkPower: n('staking.totalSqkPower'), sqkPerPower: n('staking.sqkPerPower'), referencePower: n('staking.referencePower'),
    streamRate: n('staking.rewards.streamRateBaseUnitsPerSecond'), streamEndsAt: n('staking.rewards.streamEndsAt'), remaining: n('staking.rewards.remainingBaseUnits'),
    mergesOpen: bool(field(d, 'nft.mergesOpen')), paused: bool(field(d, 'staking.paused')),
    basePowers: Array.isArray(powers) && powers.every(x => integer(x) !== null) ? powers.map(x => integer(x)!) : null, source: provenance(d, '/economy/state') };
}
export function parseCore(d: Json): Core {
  return { height: integer(field(d, 'core.blockHeight')), difficulty: integer(field(d, 'core.workPerThousandBlocks')), progress: integer(field(d, 'core.blockProgress')), unitsPerBlock: integer(field(d, 'configuration.blockUnitsPerBlock')), source: provenance(d, '/core') };
}
export function parseWheel(d: Json): Wheel {
  return { state: str(field(d, 'measurement.coreStatus')), freshness: str(field(d, 'measurement.freshness')), rpmMilli: num(field(d, 'measurement.rpmMilli')), progress: integer(field(d, 'builder.projected.blockProgress')), source: { ...provenance(d, '/status'), at: str(field(d, 'measurement.observedAt')) ?? provenance(d, '/status').at } };
}
export function parseAccount(d: Json, address: string): Account {
  if (d.schemaVersion !== 3 || typeof d.account !== 'string' || d.account.toLowerCase() !== address.toLowerCase() || !Array.isArray(d.tokens)) throw new Error('Unsupported account response. Data unavailable.');
  const n = (p: string) => integer(field(d, p));
  const tokens: Token[] = d.tokens.map(value => {
    const t = obj(value);
    if (!t || typeof t.tokenId !== 'string' || !/^[1-9]\d*$/.test(t.tokenId) || !['wallet', 'staking'].includes(String(t.custody)) || typeof t.level !== 'number' || !Number.isInteger(t.level) || t.level < 1 || t.level > 10 || integer(t.nextMergeHeight) === null) throw new Error('Squeek data is incomplete. Refresh the wallet.');
    return { id: t.tokenId, custody: t.custody as Token['custody'], level: t.level, basePower: integer(t.basePower), nextMergeHeight: integer(t.nextMergeHeight)! };
  });
  return { address, nftPower: n('power.nftPower'), sqkPower: n('power.sqkPower'), principal: n('stake.principalBaseUnits'), mature: n('stake.matureBaseUnits'), fresh: n('stake.freshBaseUnits'), freshUntilRound: n('stake.freshUntilRound'), claimable: n('rewards.claimableBaseUnits'), tokens, cursor: str(d.nextCursor), walletCount: n('tokenCounts.wallet'), depositedCount: n('tokenCounts.staking'), height: n('economy.coreBlockHeight'), mergesOpen: bool(field(d, 'economy.mergesOpen')), maximumLevel: num(field(d, 'economy.maximumLevel')), paused: bool(field(d, 'economy.stakingPaused')), source: provenance(d, `/accounts/${address}`) };
}
export async function loadAccount(address: string, cursor?: string, signal?: AbortSignal) {
  return parseAccount(await get(`/accounts/${address}?limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`, signal), address);
}
export function safeImage(d: Json): string | null {
  const image = field(d, 'metadata.imageDataUri');
  return typeof image === 'string' && /^data:image\/(svg\+xml|png|webp|jpeg)[;,]/i.test(image) && image.length < 2_000_000 ? image : null;
}
