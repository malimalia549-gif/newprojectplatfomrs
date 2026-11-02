import Link from "next/link";
import { ELYSIUM } from "@/lib/util";
import { Logo } from "@/components/nav";

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-grid">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-xs leading-[1.85] text-[#64755a]">A better path from launch to liquidity. One platform for tokens, HyperCore spot and HIP-3 perpetuals.</p>
          <div className="mt-5 flex items-center gap-2 text-[10px] text-[#627756]"><span className="h-1.5 w-1.5 rounded-full bg-[#83b56a]" />Elysium-inspired · local sandbox</div>
        </div>
        <div>
          <div className="footer-label">Platform</div>
          <ul>{[["Launchpad", "/launch"], ["Create a token", "/create"], ["Trade & Swap", "/trade"], ["STOKE token", "/stoke"], ["Economics", "/economics"]].map(([label, href]) => <li key={href}><Link href={href} className="footer-link">{label}</Link></li>)}</ul>
        </div>
        <div>
          <div className="footer-label">Resources</div>
          <ul>{[["Portfolio", "/dashboard"], ["Documentation", "/docs"], ["Payments", "/docs#payments"], ["Mainnet checklist", "/docs#mainnet"], ["Tentang & audit", "/about"]].map(([label, href]) => <li key={href}><Link href={href} className="footer-link">{label}</Link></li>)}</ul>
        </div>
        <div>
          <div className="footer-label">Network</div>
          <ul>
            <li className="footer-link">Elysium · {ELYSIUM.chainId}</li>
            <li className="footer-link">Native gas · HYPE</li>
            <li><a href={ELYSIUM.explorer} className="footer-link" target="_blank" rel="noreferrer">Explorer ↗</a></li>
            <li><a href={ELYSIUM.faucet} className="footer-link" target="_blank" rel="noreferrer">Official faucet ↗</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Forge. All rights reserved.</span>
        <span>Sandbox only · Simulated funds · No financial advice</span>
      </div>
    </footer>
  );
}
