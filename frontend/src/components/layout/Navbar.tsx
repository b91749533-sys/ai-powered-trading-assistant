import { Bell, ShieldAlert, Cpu } from "lucide-react";

interface NavbarProps {
  title: string;
}

export default function Navbar({ title }: NavbarProps) {
  return (
    <header className="h-16 px-8 bg-trading-cardBg border-b border-trading-border flex items-center justify-between">
      <h1 className="text-xl font-semibold tracking-tight text-white font-outfit">
        {title}
      </h1>

      {/* Badges and tools */}
      <div className="flex items-center gap-6">
        {/* Core System Status */}
        <div className="flex items-center gap-2 bg-[#0B0E11] px-3 py-1.5 rounded-lg border border-trading-border/80">
          <Cpu className="text-trading-green w-4 h-4" />
          <span className="text-xs text-trading-textSecondary font-medium">AI Engine:</span>
          <span className="text-xs text-white font-semibold font-mono bg-trading-green/10 text-trading-green px-1.5 py-0.5 rounded">ONLINE</span>
        </div>

        {/* Webhook Status */}
        <div className="flex items-center gap-2 bg-[#0B0E11] px-3 py-1.5 rounded-lg border border-trading-border/80">
          <ShieldAlert className="text-trading-green w-4 h-4" />
          <span className="text-xs text-trading-textSecondary font-medium">Webhook URL:</span>
          <span className="text-xs text-white font-mono bg-trading-border px-1.5 py-0.5 rounded">/api/v1/webhook</span>
        </div>

        {/* Notifications mock button */}
        <button className="relative p-2 text-trading-textSecondary hover:text-white rounded-lg transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-trading-green"></span>
        </button>
      </div>
    </header>
  );
}
