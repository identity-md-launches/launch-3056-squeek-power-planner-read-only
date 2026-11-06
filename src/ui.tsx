import { useState, type ReactNode } from 'react';
import { type Provenance } from './model';
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
    wallet: <><path d="M20 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15v12H5a2 2 0 0 1-2-2V6M20 11h-6v6h6" /><path d="M16 14h1" /></>,
    power: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8z" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zM8 12l3 3 5-6" /></>,
    sliders: <><path d="M4 7h8m4 0h4M4 17h3m4 0h9" /><circle cx="14" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
    network: <><circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m11 7-5 9m7-9 5 9M7 18h10"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5M5.5 7a7 7 0 0 1 12-2L20 8M4 16l2.5 3a7 7 0 0 0 12-2"/></>,
    merge: <><path d="M5 20v-5c0-4 7-4 7-8V3m7 17v-5c0-4-7-4-7-8M8 7l4-4 4 4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    chevron: <path d="m8 10 4 4 4-4"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.info}</svg>;
}
export function Source({ source, derived = false }: { source?: Provenance | null; derived?: boolean }) {
  if (!source) return <span className="source">Awaiting data</span>;
  const valid = Number.isFinite(Date.parse(source.at));
  const time = valid ? new Date(source.at).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC' : 'Time unavailable';
  return <details className="source-detail"><summary>{derived ? 'Calculated · ' : ''}{source.kind} · {source.block ? `block ${Number(source.block).toLocaleString('en-US')}` : time}</summary><div className="source-expanded"><a href={source.endpoint} target="_blank" rel="noreferrer">{source.kind === 'API' ? new URL(source.endpoint).pathname : 'Sepolia RPC read'} <Icon name="external" size={12}/></a><span>{valid ? new Date(source.at).toISOString() : source.at}</span>{source.hash && <code>{source.hash}</code>}</div></details>;
}
export function Metric({ label, value, unit, hint, source, derived, accent }: { label: string; value: string; unit?: string; hint?: string; source?: Provenance | null; derived?: boolean; accent?: boolean }) {
  return <article className={`metric ${accent ? 'metric-accent' : ''}`}><div className="metric-label">{label}</div><div className={`metric-value ${['Unavailable', 'Not loaded'].includes(value) ? 'unavailable' : ''}`}>{value}{unit && !['Unavailable', 'Not loaded'].includes(value) && <span className="metric-unit">{unit}</span>}</div>{hint && <span className="metric-hint">{hint}</span>}<Source source={source} derived={derived}/></article>;
}
export function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' | 'warning' }) {
  return <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : undefined}><Icon name="info" size={18}/><div>{children}</div></div>;
}
export function Copy({ text, label = 'Copy unsigned call', disabled = false }: { text: string; label?: string; disabled?: boolean }) {
  const [status, setStatus] = useState('');
  async function copy() { try { await navigator.clipboard.writeText(text); setStatus('Copied'); } catch { setStatus('Select and copy the call below. Clipboard access is unavailable.'); } }
  return <div className="copy-control"><button className="button" disabled={disabled} onClick={copy}><Icon name={status === 'Copied' ? 'check' : 'copy'}/>{status === 'Copied' ? 'Copied' : label}</button><span className="source" role="status">{status !== 'Copied' ? status : ''}</span></div>;
}
export function WheelArt({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'wheel-art small' : 'wheel-art'} viewBox="0 0 250 200" fill="none" aria-hidden="true"><circle cx="132" cy="88" r="72" stroke="currentColor" strokeWidth="1.5"/><circle cx="132" cy="88" r="64" stroke="currentColor" strokeWidth="1" strokeDasharray="3 8"/>{[0,45,90,135].map(r=><path key={r} transform={`rotate(${r} 132 88)`} d="M132 16v144" stroke="currentColor" opacity=".2"/>)}<path d="m132 88-36 91m36-91 36 91M78 179h108" stroke="currentColor" strokeWidth="2"/><circle cx="132" cy="88" r="5" fill="currentColor"/><path d="M94 129c-15-14-11-38 6-48 17-10 42-6 51 11 12 1 21 7 21 17 0 12-10 20-21 20h-4l-6 13h-11l-2-12h-15l-6 12H96l1-13z" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2"/><circle cx="147" cy="86" r="9" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2"/><circle cx="154" cy="107" r="2.5" fill="var(--accent)"/><path d="m168 112 8-2m-10 6 9 3M88 108c-14-3-18 8-9 13" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/><path d="M27 63h22M36 75h10M22 89h23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
