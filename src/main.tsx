import React from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wallet';
import App from './App';
import './style.css';
const query = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } } });
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="container"><h1>Planner unavailable</h1><p>The page could not render. Reload to try again.</p><button className="button primary" onClick={() => location.reload()}>Reload planner</button></main> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><WagmiProvider config={config}><QueryClientProvider client={query}><App/></QueryClientProvider></WagmiProvider></ErrorBoundary></React.StrictMode>);
