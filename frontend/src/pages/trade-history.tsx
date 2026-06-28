import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { Search, RefreshCw, Wallet, CheckCircle, XCircle } from "lucide-react";

export default function TradeHistory() {
  const { user, loading: authLoading, logout, requireAuth } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchSymbol, setSearchSymbol] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [totalPnL, setTotalPnL] = useState(0.0);

  useEffect(() => {
    requireAuth();
  }, [user, authLoading, requireAuth]);

  const loadTrades = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.get<any[]>("/trades", { limit: "200" });
      setTrades(data);
      setFilteredTrades(data);
    } catch (err) {
      console.error("Error loading trades", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTrades();
    }
  }, [user]);

  // Apply filters and calculate total PnL
  useEffect(() => {
    let result = [...trades];

    // Symbol Search
    if (searchSymbol) {
      result = result.filter(t => t.symbol.toLowerCase().includes(searchSymbol.toLowerCase()));
    }

    // Status Filter
    if (filterStatus !== "ALL") {
      result = result.filter(t => t.status === filterStatus);
    }

    setFilteredTrades(result);

    // Sum PnL of filtered CLOSED trades
    const pnlSum = result
      .filter(t => t.status === "CLOSED")
      .reduce((sum, t) => sum + (t.pnl || 0.0), 0.0);
    setTotalPnL(pnlSum);
  }, [searchSymbol, filterStatus, trades]);

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
        <Navbar title="Executed Trades Registry" />
        
        <main className="p-8 space-y-6">
          {/* Header Action Row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Trade History</h2>
              <p className="text-xs text-trading-textSecondary mt-0.5">Logs of active positions and historically closed simulation transactions.</p>
            </div>
            
            <Button variant="outline" onClick={loadTrades} className="px-3">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Sync Trades
            </Button>
          </div>

          {/* Filtering Tools Row with PnL stat panel */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 bg-trading-cardBg p-4 rounded-xl border border-trading-border/80">
              {/* Search Symbol */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-trading-textSecondary">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  placeholder="Search symbol (e.g. SOLUSDT)..."
                  className="w-full pl-9 pr-4 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white placeholder-trading-textSecondary/50 focus:outline-none focus:border-trading-green transition-all"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
                >
                  <option value="ALL">All Trade Statuses</option>
                  <option value="OPEN">OPEN Positions Only</option>
                  <option value="CLOSED">CLOSED History Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end px-2 text-xs text-trading-textSecondary font-mono">
                Showing: <span className="text-white font-bold ml-1">{filteredTrades.length} trades</span>
              </div>
            </div>

            {/* Aggregated PnL Display */}
            <div className="glass-panel p-4 rounded-xl border border-trading-border flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider">Closed Trades Net PnL</div>
                <div className={`text-xl font-bold font-mono mt-1 ${totalPnL >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                  {totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <Wallet className={`w-8 h-8 ${totalPnL >= 0 ? "text-trading-green" : "text-trading-red"}`} />
            </div>
          </div>

          {/* Trades Table */}
          <Card>
            {loading ? (
              <div className="py-12 text-center text-xs text-trading-textSecondary font-mono">
                Loading database trade records...
              </div>
            ) : filteredTrades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-trading-border/80 text-trading-textSecondary font-semibold">
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Direction</th>
                      <th className="pb-3">Quantity</th>
                      <th className="pb-3">Entry Price</th>
                      <th className="pb-3">Exit Price</th>
                      <th className="pb-3">Net PnL</th>
                      <th className="pb-3">Win/Loss</th>
                      <th className="pb-3 text-right">Timestamps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((t) => {
                      const isLong = t.direction === "LONG";
                      const isClosed = t.status === "CLOSED";

                      return (
                        <tr key={t.id} className="border-b border-trading-border/40 hover:bg-trading-border/10 font-mono text-white transition-all">
                          <td className="py-3.5 font-bold">{t.symbol}</td>
                          <td className="py-3.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${isLong ? "bg-trading-green/10 text-trading-green" : "bg-trading-red/10 text-trading-red"}`}>
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-3.5">{t.quantity}</td>
                          <td className="py-3.5">${t.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          <td className="py-3.5">
                            {isClosed && t.exit_price 
                              ? `$${t.exit_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}` 
                              : <span className="text-trading-textSecondary text-[10px]">OPEN POSITION</span>
                            }
                          </td>
                          <td className={`py-3.5 font-bold ${
                            !isClosed ? "text-white" : t.pnl >= 0 ? "text-trading-green" : "text-trading-red"
                          }`}>
                            {!isClosed ? "N/A" : `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-3.5">
                            {!isClosed ? (
                              <span className="text-trading-textSecondary bg-trading-border px-1.5 py-0.5 rounded text-[10px]">ACTIVE</span>
                            ) : t.win_loss ? (
                              <div className="flex items-center gap-1 text-trading-green font-bold text-[10px]">
                                <CheckCircle className="w-3.5 h-3.5" />
                                WIN
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-trading-red font-bold text-[10px]">
                                <XCircle className="w-3.5 h-3.5" />
                                LOSS
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 text-right text-trading-textSecondary text-[10px] leading-tight">
                            <div>In: {new Date(t.entry_time).toLocaleString()}</div>
                            {isClosed && t.exit_time && <div className="mt-0.5">Out: {new Date(t.exit_time).toLocaleString()}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-trading-textSecondary font-mono">
                No trades records logged matching query filter.
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
