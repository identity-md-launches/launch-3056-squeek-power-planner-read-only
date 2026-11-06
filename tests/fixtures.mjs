// Synthetic scenarios for deterministic interaction tests. Never bundled into the site.
export const address = '0xd5dab9f1d15e9d45548078726c54732a5b59eb78';
const wad = n => (BigInt(n) * 10n ** 18n).toString();
const chain = { chainId: '11155111', safeThroughBlock: '12076539', safeBlockTimestamp: '2026-11-06T12:23:00.000Z' };
export const economy = { schemaVersion: 3, status: 'available', chain, supply: { totalMintedBaseUnits: wad(210000001), capBaseUnits: wad(2100000000) }, staking: { paused: false, totalStakedBaseUnits: wad(40000), totalNftPower: wad(9000), totalSqkPower: wad(1000), sqkPerPower: wad(40), referencePower: wad(1000), rewards: { streamRateBaseUnitsPerSecond: wad(10), remainingBaseUnits: wad(12000), streamEndsAt: '1793968980' } }, nft: { mergesOpen: true, maximumLevel: 10, basePower: ['1000', '2200'] } };
export const account = { schemaVersion: 3, status: 'available', chain, account: address, rewards: { claimableBaseUnits: wad(123) }, power: { nftPower: wad(1000), sqkPower: wad(200) }, stake: { principalBaseUnits: wad(4000), freshBaseUnits: wad(1000), matureBaseUnits: wad(3000), freshUntilRound: '389' }, economy: { coreBlockHeight: '1140', mergesOpen: true, stakingPaused: false, maximumLevel: 10 }, tokenCounts: { wallet: '3', staking: '1' }, nextCursor: null, tokens: [{ tokenId: '8990', custody: 'wallet', level: 1, basePower: '1000', nextMergeHeight: '0' }, { tokenId: '8991', custody: 'wallet', level: 1, basePower: '1000', nextMergeHeight: '0' }, { tokenId: '8992', custody: 'wallet', level: 2, basePower: '2200', nextMergeHeight: '3000' }, { tokenId: '8889', custody: 'staking', level: 1, basePower: '1000', nextMergeHeight: '0' }] };
export const core = { schemaVersion: 1, status: 'available', chain, core: { blockHeight: '1140', workPerThousandBlocks: '9002', blockProgress: '662790326' }, configuration: { blockUnitsPerBlock: '1000000000' } };
export const status = { schemaVersion: 1, generatedAt: '2026-11-06T12:25:00.000Z', measurement: { coreStatus: 'IDLE', freshness: 'online', rpmMilli: 0, observedAt: '2026-11-06T12:25:00.000Z' }, builder: { status: 'available', projected: { blockProgress: '662790326' } } };
export const image = { status: 'available', metadata: { imageDataUri: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#3b4933"/><circle cx="50" cy="50" r="28" fill="#c6ef82"/><circle cx="40" cy="45" r="4"/><circle cx="60" cy="45" r="4"/></svg>') } };
export async function mockApi(context, overrides = {}) {
  await context.route('https://api.squeekchain.com/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const key = path.includes('/activity') ? 'activity' : path.includes('/accounts/') ? 'account' : path.includes('/squeeks/') ? 'image' : path.endsWith('/status') ? 'status' : path.endsWith('/core') ? 'core' : 'economy';
    const defaults = { account, economy, core, status, image, activity: { schemaVersion: 3, status: 'available', account: address, activity: [{ id: 'test-activity', kind: 'sqk_staked', amountBaseUnits: wad(4000), source: { blockNumber: '12076500' } }] } };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overrides[key] ?? defaults[key]) });
  });
}
