import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import LightweightChart from "@/charts/LightweightChart";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Cpu, 
  Wallet, 
  RefreshCw,
  Plus,
  Play
} from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading, logout, requireAuth } = useAuth();
  
  // States
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    capital: 10000.0,
    winRate: 0.0,
    openTradesCount: 0,
    totalProfit: 0.0,
    activeStrategyName: "None Active"
  });
  const [openTrades, setOpenTrades] = useState<any[]>([]);
  const [recentSignals, setRecentSignals] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);

  // Webhook Sender Modal
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState("BTCUSDT");
  const [alertPrice, setAlertPrice] = useState("61200");
  const [alertSignal, setAlertSignal] = useState("LONG");
  const [alertRsi, setAlertRsi] = useState("64");
  const [alertMacd, setAlertMacd] = useState("bullish crossover");
  const [alertVolume, setAlertVolume] = useState("1200000");

  const [alertSending, setAlertSending] = useState(false);
  const [alertResponse, setAlertResponse] = useState<any | null>(null);

  useEffect(() => {
    requireAuth();
  }, [user, authLoading, requireAuth]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch open trades
      const tradesData = await api.get<any[]>("/trades", { status: "OPEN" });
      setOpenTrades(tradesData);

      // Fetch signals
      const signalsData = await api.get<any[]>("/signals", { limit: "6" });
      setRecentSignals(signalsData);

      // Fetch strategies
      const strategiesData = await api.get<any[]>("/strategies");
      const activeStrat = strategiesData.find((s: any) => s.is_active);
      
      // Fetch analytics
      const analyticsData = await api.get<any>("/analytics");
      
      setStats({
        capital: 10000.0 + (analyticsData.equity_curve?.[analyticsData.equity_curve.length - 1]?.value - 10000.0 || 0.0),
        winRate: analyticsData.win_rate,
        openTradesCount: tradesData.length,
        totalProfit: analyticsData.equity_curve?.[analyticsData.equity_curve.length - 1]?.value - 10000.0 || 0.0,
        activeStrategyName: activeStrat ? activeStrat.name : "System Rule Baseline"
      });

      // Set last AI analysis
      if (signalsData.length > 0) {
        // Fetch analyses for recent signal
        const lastSignal = signalsData[0];
        setAiAnalysis({
          symbol: lastSignal.symbol,
          decision: lastSignal.signal_type === "BUY" || lastSignal.signal_type === "LONG" ? "BUY" : lastSignal.signal_type === "SELL" || lastSignal.signal_type === "SHORT" ? "SELL" : "HOLD",
          confidence: 82, // fallback
          entry: lastSignal.price,
          stop_loss: lastSignal.price * 0.985,
          take_profit: lastSignal.price * 1.03,
          reasoning: "Indicators demonstrate bullish momentum support. RSI above 60 with positive MACD convergence. Strong volume confirm directional momentum breakout."
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard parameters", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const handleSendMockAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertSending(true);
    setAlertResponse(null);

    const payload = {
      symbol: alertSymbol,
      timeframe: "1H",
      price: parseFloat(alertPrice),
      signal: alertSignal,
      rsi: parseFloat(alertRsi),
      macd: alertMacd,
      volume: parseFloat(alertVolume),
      timestamp: new Date().toISOString()
    };

    try {
      const res = await api.post<any>("/webhook", payload);
      setAlertResponse(res);
      // reload dashboard parameters
      await loadDashboardData();
      setTimeout(() => {
        setIsAlertModalOpen(false);
        setAlertResponse(null);
      }, 2000);
    } catch (err: any) {
      alert("Failed to submit signal alert: " + err.message);
    } finally {
      setAlertSending(false);
    }
  };

  const handleClosePosition = async (tradeId: number, exitPrice: number) => {
    if (!confirm("Close open position?")) return;
    try {
      await api.post(`/trades/${tradeId}/close`, { exit_price: exitPrice });
      await loadDashboardData();
    } catch (err: any) {
      alert("Error closing position: " + err.message);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center text-sm text-trading-textSecondary font-mono">
        Securing handshake session...
      </div>
    );
  }

  // Map charts markers
  const chartSignals = recentSignals.map(s => ({
    time: s.timestamp,
    type: s.signal_type === "BUY" || s.signal_type === "LONG" ? "BUY" as const : s.signal_type === "SELL" || s.signal_type === "SHORT" ? "SELL" as const : "HOLD" as const,
    price: s.price
  }));

  return (
    <div className="flex bg-[#0B0E11] min-h-screen font-sans text-white">
      <Sidebar user={user} onLogout={logout} />
      
      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Navbar title="Trading Terminal" />
        
        <main className="p-8 space-y-6">
          {/* Header Action Row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Active Portfolio</h2>
              <p className="text-xs text-trading-textSecondary mt-0.5">Real-time indicators, trades logging, and AI recommendations feed.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={loadDashboardData} className="px-3">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Sync System
              </Button>
              <Button variant="primary" onClick={() => setIsAlertModalOpen(true)}>
                <Plus className="w-4 h-4 text-black stroke-[3px]" />
                Trigger TV Alert
              </Button>
            </div>
          </div>

          {/* Key Stat Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="green-glow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-trading-textSecondary uppercase tracking-wider">Net Portfolio Asset</span>
                <Wallet className="text-trading-green w-5 h-5" />
              </div>
              <div className="text-2xl font-bold font-outfit mt-2">${stats.capital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-trading-green font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                +${stats.totalProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })} PnL
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-trading-textSecondary uppercase tracking-wider">Trading System</span>
                <Layers className="text-trading-green w-5 h-5" />
              </div>
              <div className="text-lg font-bold font-outfit truncate mt-2">{stats.activeStrategyName}</div>
              <div className="text-xs text-trading-textSecondary mt-1">Automatic webhook executing</div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-trading-textSecondary uppercase tracking-wider">Success Win Rate</span>
                <TrendingUp className="text-trading-green w-5 h-5" />
              </div>
              <div className="text-2xl font-bold font-outfit mt-2">{stats.winRate.toFixed(1)}%</div>
              <div className="text-xs text-trading-textSecondary mt-1">Based on closed trade records</div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-trading-textSecondary uppercase tracking-wider">Active Executions</span>
                <Cpu className="text-trading-green w-5 h-5" />
              </div>
              <div className="text-2xl font-bold font-outfit mt-2">{stats.openTradesCount}</div>
              <div className="text-xs text-trading-textSecondary mt-1">Positions opened by signals</div>
            </Card>
          </div>

          {/* Interactive Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LightweightChart 
                symbol={recentSignals[0]?.symbol || "BTCUSDT"} 
                signals={chartSignals} 
              />
            </div>
            
            {/* AI Assistant recommendations column */}
            <div>
              <Card 
                title="AI RECOMMENDATIONS FEED" 
                description="Live OpenAI indicators parsing and target mapping output"
                className="h-full"
              >
                {aiAnalysis ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-trading-textSecondary font-mono uppercase tracking-wider">ASSET: {aiAnalysis.symbol}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                        aiAnalysis.decision === "BUY" ? "bg-trading-green/10 text-trading-green border border-trading-green/20" :
                        aiAnalysis.decision === "SELL" ? "bg-trading-red/10 text-trading-red border border-trading-red/20" :
                        "bg-trading-border text-trading-textSecondary"
                      }`}>
                        RECOMMENDED: {aiAnalysis.decision}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs text-trading-textSecondary font-semibold">Engine confidence index:</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 bg-trading-border h-2 rounded-full overflow-hidden">
                          <div className="bg-trading-green h-full" style={{ width: `${aiAnalysis.confidence}%` }}></div>
                        </div>
                        <span className="text-sm font-mono font-bold text-white">{aiAnalysis.confidence}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#0B0E11] p-3 rounded-lg border border-trading-border font-mono">
                      <div>
                        <div className="text-[10px] text-trading-textSecondary">ENTRY</div>
                        <div className="text-xs text-white font-semibold mt-0.5">${aiAnalysis.entry.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-trading-red font-semibold">STOP LOSS</div>
                        <div className="text-xs text-trading-red font-semibold mt-0.5">${aiAnalysis.stop_loss.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-trading-green font-semibold">TAKE PROFIT</div>
                        <div className="text-xs text-trading-green font-semibold mt-0.5">${aiAnalysis.take_profit.toLocaleString()}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-trading-textSecondary font-semibold">AI Technical Reasoning:</div>
                      <div className="text-xs text-white leading-relaxed mt-1.5 p-3 bg-[#0B0E11] border border-trading-border rounded-lg">
                        {aiAnalysis.reasoning}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-xs text-trading-textSecondary font-mono">
                    Awaiting TradingView signal to trigger AI analysis
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Open positions and recent alerts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Open Trades Panel */}
            <div className="lg:col-span-2">
              <Card title="OPEN POSITIONS" description="Live simulation trades based on alerts validation">
                {openTrades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-trading-border/80 text-trading-textSecondary font-semibold">
                          <th className="pb-3">Symbol</th>
                          <th className="pb-3">Direction</th>
                          <th className="pb-3">Quantity</th>
                          <th className="pb-3">Entry Price</th>
                          <th className="pb-3">Current Price</th>
                          <th className="pb-3">PnL</th>
                          <th className="pb-3 text-right">Close Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openTrades.map((t) => {
                          const isLong = t.direction === "LONG";
                          // mock current price as slightly offset to show real-time simulated PnL
                          const currentMockPrice = isLong 
                            ? t.entry_price * (1 + (Math.random() - 0.45) * 0.015) 
                            : t.entry_price * (1 - (Math.random() - 0.45) * 0.015);
                          const pnl = isLong 
                            ? (currentMockPrice - t.entry_price) * t.quantity 
                            : (t.entry_price - currentMockPrice) * t.quantity;

                          return (
                            <tr key={t.id} className="border-b border-trading-border/50 hover:bg-trading-border/10 font-mono text-white transition-all">
                              <td className="py-3.5 font-bold">{t.symbol}</td>
                              <td className="py-3.5">
                                <span className={`px-1.5 py-0.5 rounded font-bold ${isLong ? "bg-trading-green/10 text-trading-green" : "bg-trading-red/10 text-trading-red"}`}>
                                  {t.direction}
                                </span>
                              </td>
                              <td className="py-3.5">{t.quantity}</td>
                              <td className="py-3.5">${t.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                              <td className="py-3.5">${currentMockPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                              <td className={`py-3.5 font-bold ${pnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                                {pnl >= 0 ? "+" : ""}${pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 text-right">
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleClosePosition(t.id, currentMockPrice)}
                                  className="text-xs px-2.5 py-1"
                                >
                                  Close
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-trading-textSecondary font-mono">
                    No active positions opened. Trigger a TradingView signal.
                  </div>
                )}
              </Card>
            </div>

            {/* Recent Signals alerts list */}
            <div>
              <Card title="RECENT ALERTS FEED" description="Incoming webhook signals list from TV">
                {recentSignals.length > 0 ? (
                  <div className="space-y-3">
                    {recentSignals.slice(0, 5).map((sig) => {
                      const isLong = sig.signal_type === "BUY" || sig.signal_type === "LONG";
                      return (
                        <div key={sig.id} className="p-3 bg-[#0B0E11] rounded-lg border border-trading-border/60 hover:border-trading-border flex items-center justify-between transition-all">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{sig.symbol}</span>
                              <span className="text-[10px] bg-trading-border text-trading-textSecondary px-1 rounded font-mono">{sig.timeframe}</span>
                            </div>
                            <div className="text-[10px] text-trading-textSecondary mt-1">Price: ${sig.price.toLocaleString()} | RSI: {sig.rsi || "N/A"}</div>
                          </div>
                          
                          <div className="text-right">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold font-mono ${
                              isLong ? "bg-trading-green/10 text-trading-green" : "bg-trading-red/10 text-trading-red"
                            }`}>
                              {sig.signal_type}
                            </span>
                            <div className="text-[9px] text-trading-textSecondary font-mono mt-1">
                              {new Date(sig.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-trading-textSecondary font-mono">
                    Awaiting alerts webhook payloads.
                  </div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* TradingView Webhook alert sender modal */}
      <Modal isOpen={isAlertModalOpen} onClose={() => setIsAlertModalOpen(false)} title="TRIGGER SIMULATED TRADINGVIEW SIGNAL">
        <form onSubmit={handleSendMockAlert} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Asset Symbol</label>
              <select 
                value={alertSymbol} 
                onChange={(e) => {
                  const val = e.target.value;
                  setAlertSymbol(val);
                  let price = "100";
                  if (val.includes("BTC")) price = "61200";
                  else if (val.includes("ETH")) price = "3380";
                  else if (val.includes("SOL")) price = "145";
                  else if (val.includes("XAUUSD")) price = "2330";
                  else if (val.includes("USOIL")) price = "80";
                  else if (val.includes("EURUSD")) price = "1.08";
                  else if (val.includes("GBPUSD")) price = "1.27";
                  setAlertPrice(price);
                }}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
              >
                <option value="BTCUSDT">BTCUSDT (Crypto)</option>
                <option value="ETHUSDT">ETHUSDT (Crypto)</option>
                <option value="SOLUSDT">SOLUSDT (Crypto)</option>
                <option value="XAUUSD">XAUUSD (Gold/Commodity)</option>
                <option value="USOIL">USOIL (Crude Oil/Commodity)</option>
                <option value="EURUSD">EURUSD (EUR/USD Forex)</option>
                <option value="GBPUSD">GBPUSD (GBP/USD Forex)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Alert Trigger Signal</label>
              <select 
                value={alertSignal} 
                onChange={(e) => setAlertSignal(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
              >
                <option value="LONG">LONG (BUY)</option>
                <option value="SHORT">SHORT (SELL)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Price</label>
              <input
                type="number"
                value={alertPrice}
                onChange={(e) => setAlertPrice(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">RSI (14)</label>
              <input
                type="number"
                value={alertRsi}
                onChange={(e) => setAlertRsi(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Volume</label>
              <input
                type="number"
                value={alertVolume}
                onChange={(e) => setAlertVolume(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">MACD status</label>
            <input
              type="text"
              value={alertMacd}
              onChange={(e) => setAlertMacd(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
            />
          </div>

          <Button type="submit" disabled={alertSending} className="w-full py-2.5 mt-4">
            <Play className="w-3.5 h-3.5 text-black stroke-[3px]" />
            {alertSending ? "Transmitting payload..." : "Emit Webhook Signal"}
          </Button>

          {alertResponse && (
            <div className="p-3 bg-trading-green/10 border border-trading-green/20 rounded-lg text-[10px] font-mono text-trading-green">
              Transmitted! Status: {alertResponse.status}. Trade: {alertResponse.trade_execution.status} (ID: {alertResponse.trade_execution.trade_id || "None"})
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
