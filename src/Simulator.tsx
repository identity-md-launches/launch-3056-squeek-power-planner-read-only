import { useEffect, useMemo, useRef, useState } from 'react';
import { getAddress } from 'viem';
import { type Account, type Economy, type Plan, type Token, project, emptyPlan, format, share, daily, currentRate, mergeProblem, basePower, amountFromInput, fullAmount } from './model';
import { type ExitQuote, type Prepared, quoteExit, prepare, readableError } from './chain';
import { Copy, Icon, Notice, Source, WheelArt } from './ui';
import { TokenImage } from './App';
export function Simulator({ focusToken, account, economy, plan, setPlan, onLoadMore, moreBusy }: { focusToken?: Token | null; account: Account | null; economy: Economy | null; plan: Plan; setPlan: React.Dispatch<React.SetStateAction<Plan>>; onLoadMore: () => void; moreBusy: boolean }) {
  const [editor, setEditor] = useState<'deposit' | 'merge' | 'stake' | 'unstake'>(focusToken?.custody === 'staking' ? 'merge' : 'deposit');
  const [survivor, setSurvivor] = useState('');
  const [donor, setDonor] = useState('');
  const [visible, setVisible] = useState(8);
  const [quote, setQuote] = useState<ExitQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const sequence = useRef(0);
  const signature = JSON.stringify(plan) + (account?.address ?? '') + (account?.source.block ?? '');
  useEffect(() => { sequence.current++; setPrepared(null); setPrepareError(''); setConfirmed(false); }, [signature]);
  useEffect(() => { setQuote(null); setQuoteError(''); }, [plan.amount, plan.action, account?.address]);
  useEffect(() => { setSurvivor(focusToken?.custody === 'staking' ? focusToken.id : ''); setDonor(''); setVisible(8); }, [account?.address, focusToken]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const result = useMemo(() => {
    if (!account || !economy) return { value: null, error: 'Load a wallet and network snapshot to compare a plan.' };
    try { return { value: project(account, economy, plan), error: '' }; } catch(e) { return { value: null, error: readableError(e) }; }
  }, [account, economy, plan]);
  const rate = economy ? currentRate(economy.streamRate, economy.streamEndsAt, economy.source.at, economy.remaining) : null;
  const a = account?.tokens.find(t => t.id === survivor), b = account?.tokens.find(t => t.id === donor);
  const problem = account ? mergeProblem(a, b, account.height, account.mergesOpen, account.maximumLevel, plan.deposits) : 'Load a wallet first.';
  const tokens = account?.tokens.filter(t => t.custody === 'wallet') ?? [];
  const hasPlan = !!(plan.deposits.length || plan.merge || plan.action !== 'none');
  const nextIsMerge = !plan.deposits.length && !!plan.merge;
  const nextIsUnstake = !plan.deposits.length && !plan.merge && plan.action === 'unstake';
  const needsConfirmation = nextIsMerge || nextIsUnstake;
  const quoteFresh = !!quote && now - quote.quotedAt <= 120_000;
  const preparedFresh = !!prepared && now - prepared.createdAt <= 120_000;
  async function getQuote() {
    if (!account) return;
    let amount: bigint;
    try { amount = amountFromInput(plan.amount); } catch(e) { setQuoteError(readableError(e)); return; }
    const seq = sequence.current; setQuoting(true); setQuoteError(''); setQuote(null); setConfirmed(false);
    try { const next = await quoteExit(getAddress(account.address), amount); if (seq === sequence.current) { setQuote(next); setNow(Date.now()); } }
    catch(e) { if (seq === sequence.current) setQuoteError(readableError(e)); } finally { setQuoting(false); }
  }
  async function getCall() {
    if (!account || !hasPlan || !result.value || (needsConfirmation && !confirmed) || (nextIsUnstake && !quoteFresh)) return;
    const seq = sequence.current; setPreparing(true); setPrepared(null); setPrepareError('');
    try { const call = await prepare(getAddress(account.address), plan, quote ?? undefined); if (seq === sequence.current) { setPrepared(call); setNow(Date.now()); } }
    catch(e) { if (seq === sequence.current) setPrepareError(readableError(e)); } finally { setPreparing(false); }
  }
  if (!account) return <div className="simulator-empty"><WheelArt/><div><h2>Start with a wallet</h2><p className="muted">Load an address above. Then select Squeeks or enter a SQK amount to compare your current position with a plan.</p><a className="button" href="#/wallet">Go to wallet<Icon name="arrow" size={16}/></a></div></div>;
  const r = result.value;
  const afterDaily = r ? daily(r.power, r.total, rate) : null;
  const beforeDaily = r ? daily(r.before, r.oldTotal, rate) : null;
  const rows = [
    { label: 'Account power', before: r ? format(r.before) : 'Unavailable', after: r ? format(r.power) : 'Unavailable' },
    { label: 'Share of total power', before: r ? share(r.before, r.oldTotal) : 'Unavailable', after: r ? share(r.power, r.total) : 'Unavailable' },
    { label: 'SQK per day', before: format(beforeDaily), after: format(afterDaily) },
  ];
  return <><div className="sr-only" role="status">{r ? `With plan: ${format(r.power)} account power, ${share(r.power, r.total)} share, ${format(afterDaily)} SQK per day. Calculated from the displayed snapshots.` : result.error}</div><div className="simulation-layout"><section className="plan-editor"><div className="section-heading"><h2>Build your plan</h2><button className="text-button" disabled={!hasPlan} onClick={() => setPlan(emptyPlan())}>Reset plan</button></div><div className="action-picker" aria-label="Choose a planning action">{(['deposit', 'merge', 'stake', 'unstake'] as const).map(action => <button key={action} aria-pressed={editor === action} onClick={() => setEditor(action)}><Icon name={action === 'deposit' ? 'plus' : action === 'merge' ? 'merge' : action === 'stake' ? 'power' : 'wallet'} size={19}/>{action[0].toUpperCase() + action.slice(1)}</button>)}</div>
      {editor === 'deposit' && <div className="editor-content"><h3>Deposit these Squeeks</h3><p className="muted small">Each deposited Squeek adds power and boosts your staked SQK.</p>{account.paused !== false && <Notice tone="warning">{account.paused ? 'Staking intake is paused.' : 'Staking intake status is unavailable.'}</Notice>}
        <div className="deposit-list">{tokens.slice(0, visible).map(t => <label className="deposit-row" key={t.id}><input type="checkbox" checked={plan.deposits.includes(t.id)} disabled={account.paused !== false || t.basePower === null} onChange={e => setPlan(p => ({ ...p, deposits: e.target.checked ? [...p.deposits, t.id] : p.deposits.filter(id => id !== t.id) }))}/><div className="mini-image"><TokenImage compact id={t.id}/></div><span><strong>Squeek #{t.id}</strong><span className="muted small">Level {t.level} · In wallet</span></span><span className="deposit-power">+{format(t.basePower, 0)}<span className="muted small">base power</span></span></label>)}</div>
        {tokens.length === 0 && <p className="muted">{account.cursor ? 'No wallet-held Squeeks on this page. Load more to continue.' : 'No wallet-held Squeeks to deposit.'}</p>}
        {(tokens.length > visible || account.cursor) && <button className="button" disabled={moreBusy} onClick={() => tokens.length > visible ? setVisible(v => v + 8) : onLoadMore()}>{moreBusy ? 'Loading…' : 'Load more Squeeks'}</button>}
        <Source source={account.source}/>
      </div>}
      {editor === 'merge' && <div className="editor-content"><h3>Choose who stays</h3><p className="muted small">The survivor keeps its image. The donor is burned permanently.</p><div className="merge-fields"><div><label htmlFor="merge-survivor">Survivor</label><select id="merge-survivor" value={survivor} onChange={e => setSurvivor(e.target.value)}><option value="">Select Squeek</option>{account.tokens.map(t => <option key={t.id} value={t.id}>#{t.id} · Level {t.level} · {t.custody === 'staking' ? 'Deposited' : 'Wallet'}</option>)}</select></div><Icon name="merge"/><div><label htmlFor="merge-donor">Donor</label><select id="merge-donor" value={donor} onChange={e => setDonor(e.target.value)}><option value="">Select Squeek</option>{account.tokens.filter(t => t.id !== survivor).map(t => <option key={t.id} value={t.id}>#{t.id} · Level {t.level} · {t.custody === 'staking' ? 'Deposited' : 'Wallet'}</option>)}</select></div></div>
        {a && b && <div className="merge-preview"><div className="mini-image"><TokenImage compact id={a.id}/></div><Icon name="plus"/><div className="mini-image"><TokenImage compact id={b.id}/></div><Icon name="arrow"/><span>#{a.id}<strong>Level {a.level + 1}</strong></span></div>}
        {problem && <Notice tone={a && b ? 'warning' : 'neutral'}>{problem}</Notice>}
        {!problem && a && b && <Notice tone="warning">#{a.id} survives at level {a.level + 1} with {format(basePower(a.level + 1), 0)} base power. #{b.id} is burned permanently.</Notice>}
        <label className="check-line"><input type="checkbox" disabled={!!problem} checked={plan.merge?.survivor === survivor && plan.merge?.donor === donor} onChange={e => setPlan(p => ({ ...p, merge: e.target.checked ? { survivor, donor } : null }))}/>Include this merge in the plan</label>
        {plan.merge && <button className="text-button" onClick={() => setPlan(p => ({ ...p, merge: null }))}>Remove planned merge #{plan.merge.survivor} + #{plan.merge.donor}</button>}
        <div className="small muted">Completed height: {format(account.height, 0)}. {a && `#${a.id} next merge: ${format(a.nextMergeHeight, 0)}.`} {b && `#${b.id} next merge: ${format(b.nextMergeHeight, 0)}.`}</div><Source source={account.source}/>
        {account.cursor && <button className="button" disabled={moreBusy} onClick={onLoadMore}>{moreBusy ? 'Loading…' : 'Load more Squeeks'}</button>}
      </div>}
      {(editor === 'stake' || editor === 'unstake') && <div className="editor-content"><h3>{editor === 'stake' ? 'Add SQK to your stake' : 'Preview a SQK exit'}</h3><p className="small muted">{editor === 'stake' ? 'Your deposited Squeeks boost the power of every staked SQK.' : 'Only mature SQK can leave. The exit fee is burned.'}</p><div className="stake-balances"><span>Currently staked<strong>{format(account.principal)} $SQK</strong></span><span>Available to unstake<strong>{format(account.mature)} $SQK</strong></span></div><Source source={account.source}/><label className="amount-label" htmlFor="sqk-amount">Amount in SQK</label><div className="amount-input"><input id="sqk-amount" name="amount" inputMode="decimal" placeholder="0.00" autoComplete="off" value={plan.amount} onChange={e => setPlan(p => ({ ...p, amount: e.target.value, action: editor }))}/><span>$SQK</span>{editor === 'unstake' && account.mature !== null && <button className="text-button" onClick={() => setPlan(p => ({ ...p, action: 'unstake', amount: fullAmount(account.mature!) }))}>Max</button>}</div><label className="check-line"><input type="checkbox" checked={plan.action === editor} onChange={e => setPlan(p => ({ ...p, action: e.target.checked ? editor : 'none' }))}/>{editor === 'stake' ? 'Include this stake' : 'Include this unstake'} in the plan</label>
        {editor === 'stake' && <p className="small muted">New principal earns immediately and matures at the next SqueekCore round.</p>}
        {editor === 'unstake' && <><button className="button" onClick={getQuote} disabled={quoting || plan.action !== 'unstake' || !plan.amount}>{quoting ? 'Reading exit fee…' : 'Quote exit fee'}<Icon name="arrow" size={16}/></button><p className="source">Reads SqueekStaking.quoteUnstake on Sepolia.</p>{quoteError && <Notice tone="error">{quoteError}</Notice>}{quote && <div className="exit-quote"><div className="section-heading"><h3>Quoted exit</h3><span className="small">{quoteFresh ? 'Quote ready' : 'Quote expired'}</span></div><dl><div><dt>Fee burned</dt><dd>{format(quote.fee, 18, 6)} $SQK</dd></div><div><dt>You receive</dt><dd>{format(quote.net, 18, 6)} $SQK</dd></div></dl><Source source={quote.source}/><p className="small muted">The fee can change with other exits. Refresh the quote after two minutes.</p></div>}</>}
      </div>}
    </section><section className="comparison"><div className="section-heading"><h2>Your plan’s impact</h2><Icon name="sliders"/></div><p className="muted small">All other accounts stay unchanged.</p><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th scope="col">Metric</th><th scope="col">Current</th><th scope="col">With plan</th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.before}</td><td>{row.after}</td></tr>)}</tbody></table></div>
      {r && <div className="power-difference"><Icon name="power" size={24}/><div><strong>{r.power - r.before >= 0n ? '+' : ''}{format(r.power - r.before)}</strong><span className="muted small">change in account power</span></div></div>}
      {result.error && <Notice tone="warning">{result.error}</Notice>}
      <div className="plan-sources"><span className="small muted">Calculated from these snapshots and your inputs:</span><Source source={account.source} derived/><Source source={economy?.source} derived/></div>
      {rate === 0n && <Notice>The funding stream is idle at this snapshot. More power changes your share, but the current daily rate is zero.</Notice>}
      <p className="small muted">Daily projection extends the current stream rate. Without new funding, the stream ends. Future funding and other stakers can change the outcome.</p>
      <details className="breakdown"><summary>See the power calculation<Icon name="chevron" size={16}/></summary><dl><div><dt>Squeek power with plan</dt><dd>{r ? format(r.p) : 'Unavailable'}</dd></div><div><dt>SQK power with plan</dt><dd>{r ? format(r.q) : 'Unavailable'}</dd></div><div><dt>New total network power</dt><dd>{r ? format(r.total) : 'Unavailable'}</dd></div><div><dt>SQK per base power (c)</dt><dd>{format(economy?.sqkPerPower ?? null)}</dd></div><div><dt>Reference power</dt><dd>{format(economy?.referencePower ?? null)}</dd></div></dl></details>
    </section></div>
    <section className="unsigned"><div className="section-heading"><div><h2>Take the next step yourself</h2><p className="muted">Prepare a call to review in your own wallet.</p></div><span className="read-only"><Icon name="shield" size={15}/>Unsigned only</span></div>
      {hasPlan ? <ol className="plan-steps">{plan.deposits.map(id => <li key={id}>Deposit Squeek #{id}</li>)}{plan.merge && <li>Keep #{plan.merge.survivor}; permanently burn #{plan.merge.donor}</li>}{plan.action !== 'none' && <li>{plan.action === 'stake' ? 'Stake' : 'Unstake'} {plan.amount || '(enter amount)'} $SQK</li>}</ol> : <p className="muted small">Add an action above to prepare an unsigned call.</p>}
      {hasPlan && <p className="small muted">Calls are prepared one step at a time, in the order above. Execute the copied step in your own wallet, then refresh and update the remaining plan.</p>}
      {nextIsMerge && <label className="check-line warning-text"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I understand that #{plan.merge!.donor} will be burned permanently and #{plan.merge!.survivor} will survive.</label>}
      {nextIsUnstake && <>{!quoteFresh && <Notice tone="warning">Open Unstake and get a fresh exit quote before preparing the call.</Notice>}{quoteFresh && quote && <label className="check-line warning-text"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I accept burning up to {fullAmount(quote.fee)} $SQK from this exit.<Source source={quote.source}/></label>}</>}
      <button className="button primary" onClick={getCall} disabled={!hasPlan || !r || preparing || (needsConfirmation && !confirmed) || (nextIsUnstake && !quoteFresh)}><Icon name="shield" size={18}/>{preparing ? 'Verifying and simulating…' : 'Prepare next unsigned call'}</button>
      {preparing && <p className="small muted" role="status">Checking deployment, ownership and simulation at one Sepolia block.</p>}
      {prepareError && <Notice tone="error">{prepareError} No call was prepared. Refresh the state before retrying.</Notice>}
      {prepared && <div className="prepared"><div className="section-heading"><h3>{prepared.label}</h3><span className="verified"><Icon name="check" size={16}/>{preparedFresh ? 'Simulation passed' : 'Refresh before copying'}</span></div><p>{prepared.note}</p><Source source={prepared.source}/>{prepared.fee !== undefined && <p className="warning-text">Fee burned: {fullAmount(prepared.fee)} $SQK. Net returned: {fullAmount(prepared.net!)} $SQK.</p>}{prepared.deadline && <p className="small muted">Deadline: {new Date(Number(prepared.deadline) * 1000).toISOString()} (Unix {prepared.deadline}).</p>}{!preparedFresh && <Notice tone="warning">This simulation is over two minutes old. Prepare again before copying.</Notice>}<Copy text={JSON.stringify(prepared.bundle, null, 2)} disabled={!preparedFresh}/><pre tabIndex={0} aria-label="Unsigned call JSON"><code>{JSON.stringify(prepared.bundle, null, 2)}</code></pre></div>}
    </section></>;
}
