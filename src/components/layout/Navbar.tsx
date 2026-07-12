import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/backtest/new", label: "New Backtest" },
  { href: "/compare", label: "Compare" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-wide text-text">
          Portfolio Backtest
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
