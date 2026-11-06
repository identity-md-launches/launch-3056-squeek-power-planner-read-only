import { createPublicClient, http, getAddress, keccak256, parseAbi, encodeFunctionData, type Abi, type Address, type Hex } from 'viem';
import { sepolia } from 'viem/chains';
import coreAbi from './abi/SqueekCore.json';
import nftAbi from './abi/SqueekNFT.json';
import tokenAbi from './abi/SqueekToken.json';
import miningAbi from './abi/SqueekMining.json';
import stakingAbi from './abi/SqueekStaking.json';
import deployment from './deployment.json';
import { type Plan, type Provenance, type Token, amountFromInput, mergeProblem } from './model';
export const CHAIN_ID = 11155111;
export const RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
export const contracts = {
  core: getAddress('0xFD6C166D4B8E2962E65746a13e5a0797CD4dE0c4'),
  nft: getAddress('0xC4C7982657f00509548F3a3a41db7FA439a6856B'),
  token: getAddress('0xd78a3956cF63164d1Fa1C622ad3c66623162Fa1e'),
  mining: getAddress('0x2dCcB11fcC2dEfdd188555e45aCb52231e82e218'),
  staking: getAddress('0x50fd1780526C3186A0c037c7622203bC4fb611ca'),
};
const abis = { core: coreAbi, nft: nftAbi, token: tokenAbi, mining: miningAbi, staking: stakingAbi } as Record<keyof typeof contracts, Abi>;
export const client = createPublicClient({ chain: sepolia, transport: http(RPC, { batch: { batchSize: 30, wait: 30 }, timeout: 15_000, retryCount: 0 }) });
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
// Proxy-only view signatures are published in the official Quickstart verification example.
// https://docs.squeekchain.com/developers/quickstart/#verify-the-deployment
const auxiliary = parseAbi(['function owner() view returns (address)', 'function deploymentIdentity() view returns (address implementation, address admin)']);
const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
export async function read<T>(kind: keyof typeof contracts, fn: string, args: readonly unknown[], blockNumber: bigint): Promise<T> {
  return await client.readContract({ address: contracts[kind], abi: abis[kind], functionName: fn, args, blockNumber }) as T;
}
export type RewardState = { funded: bigint; remaining: bigint; totalNftPower: bigint; totalSqkPower: bigint; streamRate: bigint; streamEndsAt: bigint; lastAccruedAt: bigint };
export async function verifiedBlock() {
  if (await client.getChainId() !== CHAIN_ID) throw new Error('RPC chain mismatch. No call was prepared.');
  // A confirmed height avoids inconsistent latest heads across a public RPC pool.
  const head = await client.getBlockNumber({ cacheTime: 0 });
  if (head < 12n) throw new Error('Sepolia has no confirmed read block.');
  const block = await client.getBlock({ blockNumber: head - 12n });
  if (block.number === null || !block.hash) throw new Error('The confirmed Sepolia block is unavailable.');
  const at = block.number;
  const timelock = deployment.operational.governanceTimelock.address;
  await Promise.all((['core', 'mining', 'staking'] as const).map(async (kind) => {
    const name = { core: 'SqueekCore', mining: 'SqueekMining', staking: 'SqueekStaking' }[kind] as 'SqueekCore' | 'SqueekMining' | 'SqueekStaking';
    const expected = deployment.contracts[name];
    const [impl, admin, reported, layout] = await Promise.all([
      client.getStorageAt({ address: contracts[kind], slot: implSlot, blockNumber: at }),
      client.getStorageAt({ address: contracts[kind], slot: adminSlot, blockNumber: at }),
      read<string>(kind, 'implementationCodeAddress', [], at),
      read<string>(kind, 'implementationStorageLayoutDigest', [], at),
    ]);
    if (!impl || !admin || !same('0x' + impl.slice(-40), expected.implementation) || !same('0x' + admin.slice(-40), expected.proxyAdmin) || !same(reported, expected.implementation) || !same(layout, expected.storageLayoutDigest)) throw new Error(`${name} no longer matches the pinned deployment. No call was prepared.`);
    const [code, owner] = await Promise.all([
      client.getCode({ address: getAddress(expected.implementation), blockNumber: at }),
      client.readContract({ address: getAddress(expected.proxyAdmin), abi: auxiliary, functionName: 'owner', blockNumber: at }),
    ]);
    if (!code || !same(keccak256(code), expected.implementationRuntimeHash) || !same(owner, timelock)) throw new Error(`${name} identity verification failed. No call was prepared.`);
    if (kind !== 'core') {
      const [i, a] = await client.readContract({ address: contracts[kind], abi: auxiliary, functionName: 'deploymentIdentity', blockNumber: at });
      if (!same(i, expected.implementation) || !same(a, expected.proxyAdmin)) throw new Error(`${name} proxy identity mismatch.`);
    }
  }));
  const [nftCore, nftGov, authority, tokenMining, cap, supply, minted, preminted, burned, bindings, mining, stakingBindings, rewards] = await Promise.all([
    read<string>('nft', 'sqkCore', [], at), read<string>('nft', 'governance', [], at),
    read<string>('token', 'miningBindingAuthority', [], at), read<string>('token', 'mining', [], at),
    ...(['cap', 'totalSupply', 'totalMinted', 'totalPreminted', 'totalBurned'] as const).map(fn => read<bigint>('token', fn, [], at)),
    read<{ core: string; token: string; staking: string; governance: string; premint: bigint }>('mining', 'bindings', [], at),
    read<{ bootstrapped: boolean; active: boolean; minted: bigint }>('mining', 'state', [], at),
    Promise.all(['mining', 'token', 'core', 'governance', 'genesis'].map(fn => read<string>('staking', fn, [], at))),
    read<RewardState>('staking', 'rewardState', [], at),
  ]) as [string, string, string, string, bigint, bigint, bigint, bigint, bigint, { core: string; token: string; staking: string; governance: string; premint: bigint }, { bootstrapped: boolean; active: boolean; minted: bigint }, string[], RewardState];
  const expectedBindings = [contracts.mining, contracts.token, contracts.core, timelock, contracts.nft];
  if (!same(nftCore, contracts.core) || !same(nftGov, timelock) || !same(authority, timelock) || !same(tokenMining, contracts.mining) ||
      !same(bindings.core, contracts.core) || !same(bindings.token, contracts.token) || !same(bindings.staking, contracts.staking) || !same(bindings.governance, timelock) || bindings.premint !== preminted ||
      stakingBindings.some((v, i) => !same(v, expectedBindings[i])) || !mining.bootstrapped || !mining.active || minted !== supply + burned || minted > cap || minted !== preminted + mining.minted || rewards.funded !== mining.minted) throw new Error('Deployment bindings or supply reconciliation failed. No call was prepared.');
  await Promise.all((['nft', 'token'] as const).map(async kind => {
    const code = await client.getCode({ address: contracts[kind], blockNumber: at });
    const expected = kind === 'nft' ? deployment.contracts.SqueekNFT : deployment.contracts.SqueekToken;
    if (!code || !same(keccak256(code), expected.runtimeHash)) throw new Error(`${kind} runtime differs from the published deployment.`);
  }));
  const source: Provenance = { kind: 'Contract', endpoint: RPC, at: new Date(Number(block.timestamp) * 1000).toISOString(), block: at.toString(), hash: block.hash };
  return { block, at, rewards, source };
}
async function recheck(at: bigint, hash: Hex) { if ((await client.getBlock({ blockNumber: at })).hash !== hash) throw new Error('Sepolia reorganized during the read. Refresh before preparing a call.'); }
export async function quoteExit(address: Address, amount: bigint) {
  const context = await verifiedBlock();
  const [fee, net] = await read<[bigint, bigint]>('staking', 'quoteUnstake', [address, amount], context.at);
  await recheck(context.at, context.block.hash);
  return { fee, net, source: context.source, amount, address, quotedAt: Date.now() };
}
export type ExitQuote = Awaited<ReturnType<typeof quoteExit>>;
export type Prepared = { label: string; note: string; source: Provenance; createdAt: number; fee?: bigint; net?: bigint; deadline?: string; bundle: { version: string; chainId: string; from: Address; atomicRequired: boolean; calls: { to: Address; data: Hex; value: string }[] } };
export async function prepare(address: Address, plan: Plan, acceptedQuote?: ExitQuote): Promise<Prepared> {
  const ctx = await verifiedBlock();
  const { at } = ctx;
  let kind: keyof typeof contracts = 'staking', fn: string, args: readonly unknown[], label: string, note = 'Simulation passed at the displayed Sepolia block. Re-simulate in your wallet before submitting.';
  let fee: bigint | undefined, net: bigint | undefined, deadline: string | undefined;
  if (plan.deposits.length) {
    // Owner-initiated ERC-721 safe transfer credits the owner without granting collection-wide approval.
    const id = BigInt(plan.deposits[0]);
    const [owner, paused] = await Promise.all([read<string>('nft', 'ownerOf', [id], at), read<boolean>('staking', 'paused', [], at)]);
    if (!same(owner, address)) throw new Error(`You no longer own Squeek #${id}. Refresh your wallet.`);
    if (paused) throw new Error('Staking intake is paused.');
    kind = 'nft'; fn = 'safeTransferFrom'; args = [address, contracts.staking, id]; label = `Deposit Squeek #${id}`;
    note = 'This safe transfer deposits and credits the owner. Copy this call, execute it in your wallet, then refresh before preparing the next step.';
  } else if (plan.merge) {
    const ids = [plan.merge.survivor, plan.merge.donor];
    const [open, max, core, paused] = await Promise.all([read<boolean>('nft', 'mergesOpen', [], at), read<number>('nft', 'MAXIMUM_LEVEL', [], at), read<{ blockHeight: bigint }>('core', 'state', [], at), read<boolean>('staking', 'paused', [], at)]);
    const tokens: Token[] = await Promise.all(ids.map(async id => {
      const [owner, level, next] = await Promise.all([read<string>('nft', 'ownerOf', [BigInt(id)], at), read<number>('nft', 'level', [BigInt(id)], at), read<bigint>('nft', 'nextMergeHeight', [BigInt(id)], at)]);
      const deposited = same(owner, contracts.staking);
      const holder = deposited ? await read<string>('staking', 'depositor', [contracts.nft, BigInt(id)], at) : owner;
      if (!same(holder, address)) throw new Error(`You do not own or deposit Squeek #${id}. Refresh the wallet.`);
      return { id, level, nextMergeHeight: next, custody: deposited ? 'staking' : 'wallet', basePower: null };
    }));
    const problem = mergeProblem(tokens[0], tokens[1], core.blockHeight, open, max);
    if (problem) throw new Error(problem);
    const deposited = tokens[0].custody === 'staking';
    if (deposited && paused) throw new Error('Deposited merges are paused.');
    kind = deposited ? 'staking' : 'nft'; fn = deposited ? 'mergeDeposited' : 'merge';
    args = deposited ? [contracts.nft, ...ids.map(BigInt)] : ids.map(BigInt);
    label = `Merge #${ids[0]} + #${ids[1]}`;
    note = `Squeek #${ids[0]} survives at level ${tokens[0].level + 1}. Squeek #${ids[1]} is burned permanently. The simulation passed; re-simulate in your wallet before submitting.`;
  } else if (plan.action === 'stake') {
    const amount = amountFromInput(plan.amount);
    const [balance, allowance, paused] = await Promise.all([read<bigint>('token', 'balanceOf', [address], at), read<bigint>('token', 'allowance', [address, contracts.staking], at), read<boolean>('staking', 'paused', [], at)]);
    if (paused) throw new Error('Staking intake is paused.');
    if (balance < amount) throw new Error('The wallet does not hold enough SQK for this stake.');
    if (allowance < amount) {
      kind = 'token'; fn = 'approve'; args = [contracts.staking, amount]; label = 'Approve the exact SQK amount';
      note = 'Approval is required first. This call only authorizes the entered amount. After it confirms in your wallet, refresh and prepare again to get the stake call.';
    } else { fn = 'stake'; args = [amount]; label = 'Stake SQK'; }
  } else if (plan.action === 'unstake') {
    const amount = amountFromInput(plan.amount);
    if (!acceptedQuote || acceptedQuote.amount !== amount || !same(acceptedQuote.address, address) || Date.now() - acceptedQuote.quotedAt > 120_000) throw new Error('Get a fresh exit quote and confirm the burn first.');
    const [principal, fresh] = await read<[bigint, bigint, bigint]>('staking', 'stakeOf', [address], at);
    if (amount > principal - fresh) throw new Error('This amount exceeds your current mature stake.');
    [fee, net] = await read<[bigint, bigint]>('staking', 'quoteUnstake', [address, amount], at);
    if (fee > acceptedQuote.fee) throw new Error('The exit fee rose. Get a new quote and review it before preparing again.');
    deadline = (ctx.block.timestamp + 600n).toString();
    fn = 'unstake'; args = [amount, acceptedQuote.fee, BigInt(deadline)]; label = 'Unstake SQK';
    note = 'The quoted fee is burned. The call caps the fee at the accepted quote and expires ten minutes after the read block. Re-quote if the call expires.';
  } else throw new Error('Add a deposit, eligible merge or SQK change to your plan first.');
  await client.simulateContract({ address: contracts[kind], abi: abis[kind], functionName: fn, args, account: address, blockNumber: at });
  const data = encodeFunctionData({ abi: abis[kind], functionName: fn, args });
  await recheck(at, ctx.block.hash);
  return { label, note, source: ctx.source, createdAt: Date.now(), fee, net, deadline, bundle: { version: '2.0.0', chainId: '0xaa36a7', from: address, atomicRequired: true, calls: [{ to: contracts[kind], data, value: '0x0' }] } };
}
export function readableError(e: unknown) {
  const error = e as { shortMessage?: string; message?: string; cause?: { data?: { errorName?: string } } };
  if (/Failed to fetch|fetch failed|NetworkError|Load failed/i.test(error.message ?? '')) return 'Data unavailable. Check your connection and refresh.';
  const decoded = error.cause?.data?.errorName;
  if (decoded) return `Contract simulation reverted: ${decoded}. Refresh state before trying again.`;
  return (error.shortMessage || error.message || 'The read failed. Check your connection and try again.').slice(0, 350);
}
