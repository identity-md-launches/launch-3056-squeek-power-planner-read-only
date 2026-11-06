import { useEffect, useRef, useState } from 'react';
import { createConfig, http, useAccount, useConnect, useDisconnect, useSwitchChain, type Connector } from 'wagmi';
import { injected } from 'wagmi/connectors/injected';
import { coinbaseWallet } from 'wagmi/connectors/coinbaseWallet';
import { sepolia } from 'viem/chains';
import { RPC } from './chain';
import { Icon, Notice } from './ui';
export const config = createConfig({ chains: [sepolia], multiInjectedProviderDiscovery: true, connectors: [injected(), coinbaseWallet({ appName: 'Squeek Power Planner', preference: { options: 'all' } })], transports: { [sepolia.id]: http(RPC) } });
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const OPEN_IN = [
  { id: 'metamask', name: 'MetaMask', href: (url: string) => `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, '')}` },
  { id: 'coinbase', name: 'Coinbase Wallet', href: (url: string) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}` },
  { id: 'rabby', name: 'Rabby', href: (url: string) => `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}` },
  { id: 'phantom', name: 'Phantom', href: (url: string) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}` },
];
function WalletMark({ id }: { id: string }) {
  if (id === 'coinbaseWalletSDK' || id === 'coinbase') return <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="7" fill="#2C5FF6"/><circle cx="14" cy="14" r="9" fill="white"/><rect x="10.5" y="10.5" width="7" height="7" rx="1" fill="#2C5FF6"/></svg>;
  return <img width="28" height="28" src={`./wallets/${id}.svg`} alt=""/>;
}
export function ConnectControl() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending, variables, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const named = connectors.some(c => c.type === 'injected' && c.id !== 'injected');
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !named && !('ethereum' in window);
  const listed = [...connectors.filter(c => c.type === 'injected'), ...connectors.filter(c => c.type !== 'injected')].filter(c => !(c.id === 'injected' && named) && !(mobile && c.type === 'injected'));
  useEffect(() => { if (open) dialog.current?.showModal(); else { dialog.current?.close(); } }, [open]);
  useEffect(() => { if (isConnected) setOpen(false); }, [isConnected]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const label = (c: Connector) => c.id === 'injected' ? 'Browser wallet' : c.id === 'coinbaseWalletSDK' && mobile ? 'Coinbase Smart Wallet' : c.name;
  return <><button ref={trigger} className="button connect" onClick={() => { reset(); setOpen(true); }}><Icon name="wallet" size={18}/>{isConnected && address ? chainId !== sepolia.id ? 'Switch to Sepolia' : short(address) : 'Connect'}</button>
    <dialog aria-labelledby="wallet-dialog-title" className="wallet-dialog" ref={dialog} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }} onClose={() => setOpen(false)}>
      <div className="sheet-content"><div className="section-heading"><h2 id="wallet-dialog-title">{isConnected ? 'Connected wallet' : 'Connect a wallet'}</h2><button className="icon-button" aria-label="Close wallet chooser" onClick={close}><Icon name="close"/></button></div>
        <p className="muted">Read your public address. No signature or transaction requests.</p>
        {isConnected && address ? <><code className="full-address">{address}</code>{chainId !== sepolia.id && <><Notice tone="warning">Your wallet is on another network. Planner reads always use Sepolia.</Notice><button className="button primary" disabled={switching} onClick={() => switchChain({ chainId: sepolia.id })}>{switching ? 'Switching…' : 'Switch to Sepolia'}</button></>}<button className="wallet-row" onClick={() => { disconnect(); close(); }}>Disconnect wallet</button></> : <>
          {mobile && OPEN_IN.map(w => <a className="wallet-row" key={w.id} href={w.href(location.href)}><WalletMark id={w.id}/><span>Open in {w.name}</span><Icon name="external" size={16}/></a>)}
          {listed.map(c => <button className="wallet-row" key={c.uid} disabled={isPending} onClick={() => connect({ connector: c })}>{c.icon ? <img src={c.icon} width="28" height="28" alt=""/> : c.id === 'injected' ? <Icon name="wallet" size={28}/> : <WalletMark id={c.id}/>}<span>{label(c)}{isPending && variables?.connector === c ? ' · Opening…' : ''}</span><Icon name="arrow" size={16}/></button>)}
        </>}
        {(error || switchError) && <Notice tone="error">The wallet request was declined or could not open. Try again, or paste your address in the planner.</Notice>}
        <span className="source">Sepolia testnet · Read only</span>
      </div>
    </dialog>
  </>;
}
