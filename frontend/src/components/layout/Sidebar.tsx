import Link from "next/link";
import { useRouter } from "next/router";
import { 
  LayoutDashboard, 
  BellRing, 
  Activity, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut,
  TrendingUp
} from "lucide-react";
import { UserProfile } from "@/hooks/useAuth";

interface SidebarProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const router = useRouter();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Signals", path: "/signals", icon: BellRing },
    { name: "Trade History", path: "/trade-history", icon: Activity },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Settings", path: "/settings", icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 min-h-screen bg-trading-cardBg border-r border-trading-border flex flex-col justify-between">
      <div>
        {/* Logo / Title */}
        <div className="h-16 px-6 border-b border-trading-border flex items-center gap-2">
          <TrendingUp className="text-trading-green w-6 h-6" />
          <span className="text-xl font-bold tracking-tight font-outfit text-white">
            ANTIGRAVITY
          </span>
          <span className="text-xs bg-trading-green/10 text-trading-green px-1.5 py-0.5 rounded font-mono">
            v1.0
          </span>
        </div>

        {/* User context info */}
        <div className="p-4 border-b border-trading-border/50">
          <div className="text-xs text-trading-textSecondary uppercase font-semibold tracking-wider">
            Connected Account
          </div>
          <div className="text-sm font-medium text-white truncate mt-1">
            {user ? user.email : "Loading..."}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-trading-green animate-pulse"></span>
            <span className="text-xs text-trading-green font-mono">Live Sync Active</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-trading-green/10 text-trading-green border-l-2 border-trading-green" 
                    : "text-trading-textSecondary hover:text-white hover:bg-trading-border/30"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout button */}
      <div className="p-4 border-t border-trading-border/50">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-trading-red bg-trading-red/5 hover:bg-trading-red/10 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
