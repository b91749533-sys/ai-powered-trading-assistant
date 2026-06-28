import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { Search, SlidersHorizontal, RefreshCw } from "lucide-react";

export default function Signals() {
  const { user, loading: authLoading, logout, requireAuth } = useAuth();
  const [signals, setSignals] = useState<any[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchSymbol, setSearchSymbol] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");

  useEffect(() => {
    requireAuth();
  }, [user, authLoading, requireAuth]);

  const loadSignals = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.get<any[]>("/signals", { limit: "200" });
      setSignals(data);
      setFilteredSignals(data);
    } catch (err) {
      console.error("Error loading signals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSignals();
    }
  }, [user]);

  // Apply filters and sorting local-side
  useEffect(() => {
    let result = [...signals];

    // Symbol Search
    if (searchSymbol) {
      result = result.filter(s => s.symbol.toLowerCase().includes(searchSymbol.toLowerCase()));
    }

    // Type Filter
    if (filterType !== "ALL") {
      result = result.filter(s => {
        const isBuy = s.signal_type === "BUY" || s.signal_type === "LONG";
        const isSell = s.signal_type === "SELL" || s.signal_type === "SHORT";
        if (filterType === "BUY") return isBuy;
        if (filterType === "SELL") return isSell;
        return !isBuy && !isSell;
      });
    }

    // Sort order
    if (sortOrder === "NEWEST") {
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else {
      result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    setFilteredSignals(result);
  }, [searchSymbol, filterType, sortOrder, signals]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center text-sm text-trading-textSecondary font-mono">
        Securing handshake session...
      </div>
    );
  }

  return (
    <div className="flex bg-[#0B0E11] min-h-screen font-sans text-white">
      <Sidebar user={user} onLogout={logout} />
      
      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Navbar title="Alert Feed Logging" />
        
        <main className="p-8 space-y-6">
          {/* Header Action Row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Signals History</h2>
              <p className="text-xs text-trading-textSecondary mt-0.5">Historical list of webhook events captured from TradingView alerts.</p>
            </div>
            
            <Button variant="outline" onClick={loadSignals} className="px-3">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Reload Alerts
            </Button>
          </div>

          {/* Filtering Tools Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-trading-cardBg p-4 rounded-xl border border-trading-border/80">
            {/* Search Symbol */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-trading-textSecondary">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                placeholder="Search symbol (e.g. BTCUSDT)..."
                className="w-full pl-9 pr-4 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white placeholder-trading-textSecondary/50 focus:outline-none focus:border-trading-green transition-all"
              />
            </div>

            {/* Filter Direction */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
              >
                <option value="ALL">All Alerts Direction</option>
                <option value="BUY">BUY / LONG Alerts</option>
                <option value="SELL">SELL / SHORT Alerts</option>
              </select>
            </div>

            {/* Sort order */}
            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
              >
                <option value="NEWEST">Sort: Newest Alerts First</option>
                <option value="OLDEST">Sort: Oldest Alerts First</option>
              </select>
            </div>

            {/* Stat Counters */}
            <div className="flex items-center justify-end px-2 text-xs text-trading-textSecondary font-mono">
              Total Found: <span className="text-white font-bold ml-1">{filteredSignals.length} logs</span>
            </div>
          </div>

          {/* Alerts Table */}
          <Card>
            {loading ? (
              <div className="py-12 text-center text-xs text-trading-textSecondary font-mono">
                Syncing signals feed logs...
              </div>
            ) : filteredSignals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-trading-border/80 text-trading-textSecondary font-semibold">
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Timeframe</th>
                      <th className="pb-3">Trigger Price</th>
                      <th className="pb-3">Alert Direction</th>
                      <th className="pb-3">RSI (14)</th>
                      <th className="pb-3">MACD Status</th>
                      <th className="pb-3">Volume Value</th>
                      <th className="pb-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSignals.map((sig) => {
                      const isLong = sig.signal_type === "BUY" || sig.signal_type === "LONG";
                      return (
                        <tr key={sig.id} className="border-b border-trading-border/40 hover:bg-trading-border/10 font-mono text-white transition-all">
                          <td className="py-3.5 font-bold">{sig.symbol}</td>
                          <td className="py-3.5">
                            <span className="bg-trading-border px-1.5 py-0.5 rounded font-bold font-mono">
                              {sig.timeframe}
                            </span>
                          </td>
                          <td className="py-3.5">${sig.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              isLong ? "bg-trading-green/10 text-trading-green" : "bg-trading-red/10 text-trading-red"
                            }`}>
                              {sig.signal_type}
                            </span>
                          </td>
                          <td className="py-3.5">{sig.rsi ? sig.rsi.toFixed(1) : "N/A"}</td>
                          <td className="py-3.5 text-trading-textSecondary truncate max-w-[120px]">{sig.macd || "N/A"}</td>
                          <td className="py-3.5">{sig.volume ? sig.volume.toLocaleString() : "N/A"}</td>
                          <td className="py-3.5 text-right text-trading-textSecondary">
                            {new Date(sig.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-trading-textSecondary font-mono">
                No signal alerts found matching search parameters.
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
