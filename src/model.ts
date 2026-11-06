export const WAD = 10n ** 18n;
export const CAP = 2_100_000_000n * WAD;
export const MAX_POWER = 1n << 128n;
export type Provenance = { kind: 'API' | 'Contract'; endpoint: string; at: string; block?: string; hash?: string };
export type Token = { id: string; custody: 'wallet' | 'staking'; level: number; nextMergeHeight: bigint; basePower: bigint | null };
export type Account = {
  address: string; nftPower: bigint | null; sqkPower: bigint | null; principal: bigint | null;
  mature: bigint | null; fresh: bigint | null; freshUntilRound: bigint | null; claimable: bigint | null;
  tokens: Token[]; cursor: string | null; walletCount: bigint | null; depositedCount: bigint | null;
  height: bigint | null; mergesOpen: boolean | null; maximumLevel: number | null; paused: boolean | null; source: Provenance;
};
export type Economy = {
  minted: bigint | null; cap: bigint | null; totalStaked: bigint | null; nftPower: bigint | null; sqkPower: bigint | null;
  sqkPerPower: bigint | null; referencePower: bigint | null; streamRate: bigint | null; streamEndsAt: bigint | null;
  remaining: bigint | null; mergesOpen: boolean | null; paused: boolean | null; basePowers: bigint[] | null; source: Provenance;
};
export type Core = { height: bigint | null; difficulty: bigint | null; progress: bigint | null; unitsPerBlock: bigint | null; source: Provenance };
export type Wheel = { state: string | null; freshness: string | null; rpmMilli: number | null; progress: bigint | null; source: Provenance };
export type Plan = { deposits: string[]; merge: { survivor: string; donor: string } | null; action: 'none' | 'stake' | 'unstake'; amount: string };
export const emptyPlan = (): Plan => ({ deposits: [], merge: null, action: 'none', amount: '' });
export function basePower(level: number): bigint {
  if (!Number.isInteger(level) || level < 1 || level > 10) throw new Error('Level must be between 1 and 10.');
  const numerator = 1000n * 22n ** BigInt(level - 1), denominator = 10n ** BigInt(level - 1);
  return (numerator + denominator / 2n) / denominator;
}
export function amountFromInput(input: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(input.trim())) throw new Error('Enter a positive SQK amount with up to 18 decimal places.');
  const [whole, fraction = ''] = input.trim().split('.');
  const value = BigInt(whole) * WAD + BigInt(fraction.padEnd(18, '0'));
  if (value <= 0n) throw new Error('Enter an amount greater than zero.');
  if (value >= MAX_POWER) throw new Error('This amount exceeds the contract’s principal limit.');
  return value;
}
export function quotePower(principal: bigint, nftPower: bigint, c: bigint, reference: bigint) {
  if (c <= 0n || reference <= 0n || principal < 0n || nftPower < 0n) throw new Error('Power inputs are unavailable.');
  return principal * WAD * (reference + nftPower) / (c * reference);
}
export function mergeProblem(a: Token | undefined, b: Token | undefined, height: bigint | null, open: boolean | null, max: number | null, deposits: string[] = []): string | null {
  if (!a || !b) return 'Choose a survivor and a donor.';
  if (a.id === b.id) return 'Choose two different Squeeks.';
  if (open === null || height === null || max === null) return 'Merge eligibility is unavailable. Refresh the wallet.';
  if (!open) return 'Merges are closed by the protocol.';
  if (a.level !== b.level) return 'Both Squeeks must have the same level.';
  if (a.level >= max) return 'These Squeeks are at the maximum level.';
  const remaining = (a.nextMergeHeight > b.nextMergeHeight ? a.nextMergeHeight : b.nextMergeHeight) - height;
  if (remaining > 0n) return `${remaining.toLocaleString()} Squeek blocks left before this pair can merge.`;
  const custody = (t: Token) => deposits.includes(t.id) ? 'staking' : t.custody;
  if (custody(a) !== custody(b)) return 'Both Squeeks must be wallet-held or both deposited. Deposit the wallet-held Squeek first.';
  return null;
}
export function currentRate(rate: bigint | null, ends: bigint | null, at: string, remaining: bigint | null): bigint | null {
  if (rate === null || ends === null || remaining === null) return null;
  const time = Date.parse(at);
  if (!Number.isFinite(time)) return null;
  return remaining === 0n || ends <= BigInt(Math.floor(time / 1000)) ? 0n : rate;
}
export function sum(a: bigint | null, b: bigint | null) { return a === null || b === null ? null : a + b; }
export function share(power: bigint | null, total: bigint | null): string {
  if (power === null || total === null || total < power) return 'Unavailable';
  if (total === 0n) return '0%';
  const scaled = power * 1_000_000n / total;
  if (scaled === 0n && power > 0n) return '<0.0001%';
  return `${Number(scaled) / 10_000}%`;
}
export function daily(power: bigint | null, total: bigint | null, rate: bigint | null) {
  if (power === null || total === null || rate === null || total < power) return null;
  return total === 0n ? 0n : rate * 86_400n * power / total;
}
export function format(value: bigint | null, decimals = 18, digits = 2): string {
  if (value === null) return 'Unavailable';
  const negative = value < 0n, v = negative ? -value : value, scale = 10n ** BigInt(decimals);
  const whole = v / scale, fraction = (v % scale).toString().padStart(decimals, '0').slice(0, digits).replace(/0+$/, '');
  if (v > 0n && whole === 0n && fraction === '') return `${negative ? '−' : ''}<${decimals === 0 || digits === 0 ? '1' : '0.' + '0'.repeat(digits - 1) + '1'}`;
  return `${negative ? '−' : ''}${whole.toLocaleString('en-US')}${fraction ? '.' + fraction : ''}`;
}
export function fullAmount(value: bigint) { const fraction = (value % WAD).toString().padStart(18, '0').replace(/0+$/, ''); return `${value / WAD}${fraction ? '.' + fraction : ''}`; }
export function project(account: Account, economy: Economy, plan: Plan) {
  const { nftPower, sqkPower, principal } = account;
  if (nftPower === null || sqkPower === null || principal === null || economy.sqkPerPower === null || economy.referencePower === null) throw new Error('Power or staking inputs are unavailable. Refresh and try again.');
  let p = nftPower, s = principal;
  const deposits = [...new Set(plan.deposits)];
  if (deposits.length > 100) throw new Error('Plan at most 100 deposits at a time.');
  if ((deposits.length || plan.action === 'stake') && account.paused !== false) throw new Error(account.paused ? 'Staking intake is paused.' : 'Staking intake status is unavailable.');
  for (const id of deposits) {
    const token = account.tokens.find(t => t.id === id);
    if (!token || token.custody !== 'wallet' || token.basePower === null) throw new Error(`Squeek #${id} cannot be deposited from this snapshot.`);
    p += token.basePower * WAD;
  }
  if (plan.merge) {
    const a = account.tokens.find(t => t.id === plan.merge!.survivor), b = account.tokens.find(t => t.id === plan.merge!.donor);
    const problem = mergeProblem(a, b, account.height, account.mergesOpen, account.maximumLevel, deposits);
    if (problem) throw new Error(problem);
    if (a!.custody === 'staking' || deposits.includes(a!.id)) {
      if (account.paused !== false) throw new Error('Deposited merges wait while staking intake is paused or unavailable.');
      if (a!.basePower === null || b!.basePower === null) throw new Error('Squeek power is unavailable.');
      p += (basePower(a!.level + 1) - a!.basePower! - b!.basePower!) * WAD;
    }
  }
  const amount = plan.action === 'none' ? 0n : amountFromInput(plan.amount);
  if (plan.action === 'stake') s += amount;
  if (plan.action === 'unstake') {
    if (account.mature === null) throw new Error('Mature principal is unavailable.');
    if (amount > account.mature) throw new Error('This amount exceeds your mature stake. Fresh SQK must mature before unstaking.');
    s -= amount;
  }
  const q = quotePower(s, p, economy.sqkPerPower, economy.referencePower);
  const power = p + q, before = nftPower + sqkPower, oldTotal = sum(economy.nftPower, economy.sqkPower);
  if (power >= MAX_POWER || p >= MAX_POWER || q >= MAX_POWER || s >= MAX_POWER) throw new Error('This plan exceeds the contract’s power or principal limit.');
  if (oldTotal !== null && oldTotal < before) throw new Error('The account and network snapshots differ. Refresh before comparing.');
  const total = oldTotal === null ? null : oldTotal - before + power;
  if (total !== null && total >= MAX_POWER) throw new Error('This plan exceeds the network power limit.');
  return { p, q, principal: s, power, before, total, oldTotal, amount };
}
