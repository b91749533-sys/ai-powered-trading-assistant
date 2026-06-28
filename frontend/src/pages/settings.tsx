import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { 
  Play, 
  Settings as SettingsIcon, 
  Layers, 
  ShieldAlert, 
  RefreshCw,
  Plus,
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

export default function Settings() {
  const { user, loading: authLoading, logout, requireAuth } = useAuth();
  
  // Settings States
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<any[]>([]);
  
  // Risk settings state
  const [portfolioCapital, setPortfolioCapital] = useState("10000");
  const [maxRisk, setMaxRisk] = useState("1.0");
  const [maxDailyLoss, setMaxDailyLoss] = useState("5.0");
  const [minRR, setMinRR] = useState("1.5");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Strategy Form Modal
  const [isStratModalOpen, setIsStratModalOpen] = useState(false);
  const [stratName, setStratName] = useState("");
  const [stratDesc, setStratDesc] = useState("");
  const [stratRsiBuy, setStratRsiBuy] = useState("45");
  const [stratRsiSell, setStratRsiSell] = useState("55");
  const [stratSL, setStratSL] = useState("1.5");
  const [stratTP, setStratTP] = useState("3.0");

  // Backtest Modal
  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);
  const [backtestStratId, setBacktestStratId] = useState<number | null>(null);
  const [backtestCapital, setBacktestCapital] = useState("10000");
  const [backtestRunning, setBacktestRunning] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any | null>(null);

  useEffect(() => {
    requireAuth();
  }, [user, authLoading, requireAuth]);

  const loadSettingsData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const stratData = await api.get<any[]>("/strategies");
      setStrategies(stratData);

      // Extract risk parameters from first active strategy if available
      const activeStrat = stratData.find(s => s.is_active);
      if (activeStrat && activeStrat.parameters) {
        setPortfolioCapital(activeStrat.parameters.portfolio_capital?.toString() || "10000");
        setMaxRisk(activeStrat.parameters.max_risk_per_trade_pct?.toString() || "1.0");
        setMaxDailyLoss(activeStrat.parameters.max_daily_loss_pct?.toString() || "5.0");
        setMinRR(activeStrat.parameters.min_risk_reward_ratio?.toString() || "1.5");
      }
    } catch (err) {
      console.error("Failed to load settings configuration", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSettingsData();
    }
  }, [user]);

  const handleSaveRiskSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strategies.length === 0) {
      // Create a baseline strategy first if none exist
      try {
        const defaultStrat = await api.post<any>("/strategies", {
          name: "System Rules Baseline",
          description: "Global system defaults for alerts execution rules.",
          is_active: true,
          parameters: {
            portfolio_capital: parseFloat(portfolioCapital),
            max_risk_per_trade_pct: parseFloat(maxRisk),
            max_daily_loss_pct: parseFloat(maxDailyLoss),
            min_risk_reward_ratio: parseFloat(minRR)
          }
        });
        setStrategies([defaultStrat]);
      } catch (err: any) {
        alert("Error: " + err.message);
        return;
      }
    } else {
      // Update active strategy parameter options
      const activeStrats = strategies.filter(s => s.is_active);
      const targets = activeStrats.length > 0 ? activeStrats : [strategies[0]];
      for (const strat of targets) {
        try {
          await api.patch(`/strategies/${strat.id}`, {
            parameters: {
              ...strat.parameters,
              portfolio_capital: parseFloat(portfolioCapital),
              max_risk_per_trade_pct: parseFloat(maxRisk),
              max_daily_loss_pct: parseFloat(maxDailyLoss),
              min_risk_reward_ratio: parseFloat(minRR)
            }
          });
        } catch (err: any) {
          alert("Failed to save rules parameters: " + err.message);
          return;
        }
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    await loadSettingsData();
  };

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: stratName,
        description: stratDesc,
        is_active: false,
        parameters: {
          rsi_buy_threshold: parseFloat(stratRsiBuy),
          rsi_sell_threshold: parseFloat(stratRsiSell),
          stop_loss_pct: parseFloat(stratSL),
          take_profit_pct: parseFloat(stratTP),
          portfolio_capital: parseFloat(portfolioCapital),
          max_risk_per_trade_pct: parseFloat(maxRisk),
          max_daily_loss_pct: parseFloat(maxDailyLoss),
          min_risk_reward_ratio: parseFloat(minRR)
        }
      };

      await api.post("/strategies", payload);
      setIsStratModalOpen(false);
      setStratName("");
      setStratDesc("");
      await loadSettingsData();
    } catch (err: any) {
      alert("Failed to create strategy: " + err.message);
    }
  };

  const handleToggleStrategy = async (stratId: number, currentActive: boolean) => {
    try {
      // Deactivate all others first to ensure single active strategy
      if (!currentActive) {
        for (const s of strategies) {
          if (s.is_active && s.id !== stratId) {
            await api.patch(`/strategies/${s.id}`, { is_active: false });
          }
        }
      }

      await api.patch(`/strategies/${stratId}`, { is_active: !currentActive });
      await loadSettingsData();
    } catch (err: any) {
      alert("Failed to toggle strategy: " + err.message);
    }
  };

  const handleTriggerBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backtestStratId) return;

    setBacktestRunning(true);
    setBacktestResult(null);

    try {
      const res = await api.post<any>("/strategies/backtest", {
        strategy_id: backtestStratId,
        initial_capital: parseFloat(backtestCapital)
      });
      setBacktestResult(res);
    } catch (err: any) {
      alert("Backtest failed: " + err.message);
    } finally {
      setBacktestRunning(false);
    }
  };

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
        <Navbar title="Settings & Parameters" />
        
        <main className="p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Risk & Strategy Rules</h2>
            <p className="text-xs text-trading-textSecondary mt-0.5">Manage portfolio variables, automated sizing filters, and simulation strategies.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Management Settings Panel */}
            <div className="lg:col-span-2">
              <Card 
                title="RISK MANAGEMENT FILTERS" 
                description="Global controls applied to entry signals prior to mock executions"
              >
                <form onSubmit={handleSaveRiskSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-trading-textSecondary uppercase tracking-wider mb-2">Simulated Capital ($)</label>
                      <input 
                        type="number"
                        value={portfolioCapital}
                        onChange={(e) => setPortfolioCapital(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-sm text-white focus:outline-none focus:border-trading-green font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-trading-textSecondary uppercase tracking-wider mb-2">Max Risk Per Trade (%)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={maxRisk}
                        onChange={(e) => setMaxRisk(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-sm text-white focus:outline-none focus:border-trading-green font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-trading-textSecondary uppercase tracking-wider mb-2">Max Daily Loss Limit (%)</label>
                      <input 
                        type="number"
                        step="0.5"
                        value={maxDailyLoss}
                        onChange={(e) => setMaxDailyLoss(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-sm text-white focus:outline-none focus:border-trading-green font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-trading-textSecondary uppercase tracking-wider mb-2">Min Risk/Reward Ratio</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={minRR}
                        onChange={(e) => setMinRR(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-sm text-white focus:outline-none focus:border-trading-green font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-trading-border/50">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="text-trading-green w-4 h-4" />
                      <span className="text-xs text-trading-textSecondary">Sizing formula automatically bounds quantities</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {saveSuccess && (
                        <div className="flex items-center gap-1 text-xs text-trading-green font-semibold">
                          <CheckCircle className="w-4 h-4" /> Saved!
                        </div>
                      )}
                      <Button type="submit">Update Rules Params</Button>
                    </div>
                  </div>
                </form>
              </Card>
            </div>

            {/* General API key description */}
            <Card title="AI SERVICE GATEWAY" description="OpenAI API settings and status details">
              <div className="space-y-4">
                <div className="text-xs text-trading-textSecondary">
                  The trading system operates an OpenAI-compatible API connector. Standard configuration keys are loaded from the backend environment files.
                </div>
                <div className="bg-[#0B0E11] p-3 rounded-lg border border-trading-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-trading-textSecondary">Model Target:</span>
                    <span className="text-xs font-bold font-mono text-white">gpt-4o</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-trading-textSecondary">Endpoint URL:</span>
                    <span className="text-xs font-bold font-mono text-white truncate max-w-[150px]">api.openai.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-trading-textSecondary">Key loaded:</span>
                    <span className="text-xs font-bold font-mono text-trading-green">YES (SIMULATED FALLBACK)</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Strategy Management Section */}
          <Card 
            title="STRATEGIES DIRECTORY" 
            description="Manage rules triggers, customize thresholds, and perform historical backtesting simulations"
            extra={
              <Button variant="outline" onClick={() => setIsStratModalOpen(true)} className="py-1 px-3 text-xs">
                <Plus className="w-3.5 h-3.5 text-trading-green stroke-[3px]" />
                New Strategy
              </Button>
            }
          >
            {loading ? (
              <div className="py-8 text-center text-xs text-trading-textSecondary font-mono">
                Syncing strategies index...
              </div>
            ) : strategies.length > 0 ? (
              <div className="space-y-4">
                {strategies.map((strat) => (
                  <div key={strat.id} className="p-4 bg-[#0B0E11] border border-trading-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">{strat.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          strat.is_active ? "bg-trading-green/10 text-trading-green border border-trading-green/20" : "bg-trading-border text-trading-textSecondary"
                        }`}>
                          {strat.is_active ? "ACTIVE ROUTING" : "INACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs text-trading-textSecondary mt-1 leading-relaxed max-w-xl">{strat.description}</p>
                      
                      {/* Strategy params summary */}
                      {strat.parameters && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-trading-textSecondary font-mono">
                          <span>RSI Buy: &lt; {strat.parameters.rsi_buy_threshold || 45}</span>
                          <span>RSI Sell: &gt; {strat.parameters.rsi_sell_threshold || 55}</span>
                          <span>SL: {strat.parameters.stop_loss_pct || 1.5}%</span>
                          <span>TP: {strat.parameters.take_profit_pct || 3.0}%</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setBacktestStratId(strat.id);
                          setIsBacktestModalOpen(true);
                          setBacktestResult(null);
                        }}
                        className="py-1.5 px-3 text-xs"
                      >
                        <Play className="w-3 h-3 text-trading-green fill-trading-green" />
                        Run Backtest
                      </Button>
                      
                      <button
                        onClick={() => handleToggleStrategy(strat.id, strat.is_active)}
                        className="text-trading-textSecondary hover:text-white transition-all focus:outline-none"
                      >
                        {strat.is_active ? (
                          <ToggleRight className="w-10 h-10 text-trading-green" />
                        ) : (
                          <ToggleLeft className="w-10 h-10 text-trading-textSecondary" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-trading-textSecondary font-mono">
                No custom strategies defined. Setup your first alert logic strategy.
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* Strategy Creation Modal */}
      <Modal isOpen={isStratModalOpen} onClose={() => setIsStratModalOpen(false)} title="CREATE CUSTOM ALERTS STRATEGY">
        <form onSubmit={handleCreateStrategy} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Strategy Name</label>
            <input 
              type="text" 
              required
              value={stratName}
              onChange={(e) => setStratName(e.target.value)}
              placeholder="e.g. RSI Momentum Scalper"
              className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={stratDesc}
              onChange={(e) => setStratDesc(e.target.value)}
              placeholder="Provide notes on indicators rules..."
              className="w-full h-20 px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">RSI Buy Trigger (&lt;)</label>
              <input 
                type="number"
                value={stratRsiBuy}
                onChange={(e) => setStratRsiBuy(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">RSI Sell Trigger (&gt;)</label>
              <input 
                type="number"
                value={stratRsiSell}
                onChange={(e) => setStratRsiSell(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Stop Loss (%)</label>
              <input 
                type="number"
                step="0.1"
                value={stratSL}
                onChange={(e) => setStratSL(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Take Profit (%)</label>
              <input 
                type="number"
                step="0.1"
                value={stratTP}
                onChange={(e) => setStratTP(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green font-mono"
              />
            </div>
          </div>

          <Button type="submit" className="w-full py-2.5 mt-4">Save Strategy Logic</Button>
        </form>
      </Modal>

      {/* Backtesting Simulator Modal */}
      <Modal isOpen={isBacktestModalOpen} onClose={() => setIsBacktestModalOpen(false)} title="STRATEGY BACKTEST SIMULATOR">
        <form onSubmit={handleTriggerBacktest} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-trading-textSecondary uppercase tracking-wider mb-1.5">Initial Capital ($)</label>
            <input 
              type="number"
              value={backtestCapital}
              onChange={(e) => setBacktestCapital(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0E11] border border-trading-border rounded-lg text-xs text-white focus:outline-none focus:border-trading-green font-mono"
            />
          </div>

          <Button type="submit" disabled={backtestRunning} className="w-full py-2.5">
            {backtestRunning ? "Simulating transaction ticks..." : "Initialize Backtest"}
          </Button>

          {backtestResult && (
            <div className="space-y-3 pt-4 border-t border-trading-border font-mono text-xs">
              <h4 className="text-white font-bold text-center">Backtest Simulation Summary</h4>
              <div className="grid grid-cols-2 gap-3 bg-[#0B0E11] p-3 rounded-lg border border-trading-border">
                <div>
                  <span className="text-trading-textSecondary text-[10px]">WIN RATE</span>
                  <div className="text-trading-green font-bold mt-0.5">{backtestResult.metrics.win_rate}%</div>
                </div>
                <div>
                  <span className="text-trading-textSecondary text-[10px]">SHARPE RATIO</span>
                  <div className="text-white font-bold mt-0.5">{backtestResult.metrics.sharpe_ratio}</div>
                </div>
                <div>
                  <span className="text-trading-textSecondary text-[10px]">PROFIT FACTOR</span>
                  <div className="text-trading-green font-bold mt-0.5">{backtestResult.metrics.profit_factor}</div>
                </div>
                <div>
                  <span className="text-trading-textSecondary text-[10px]">MAX DRAWDOWN</span>
                  <div className="text-trading-red font-bold mt-0.5">{backtestResult.metrics.max_drawdown}%</div>
                </div>
              </div>
              
              <div className="text-[10px] leading-normal text-trading-textSecondary">
                Simulated trade events: <span className="text-white font-bold">{backtestResult.simulated_trades.length} entries</span> completed based on database alerts timeline.
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
