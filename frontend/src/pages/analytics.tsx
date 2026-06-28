import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { 
  BarChart, 
  Bar, 
  Cell,
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  Percent, 
  Activity, 
  ShieldAlert, 
  RefreshCw,
  Award
} from "lucide-react";

export default function Analytics() {
  const { user, loading: authLoading, logout, requireAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({
    win_rate: 0.0,
    average_return: 0.0,
    profit_factor: 1.0,
    sharpe_ratio: 0.0,
    max_drawdown: 0.0,
    total_trades: 0,
    win_trades: 0,
    loss_trades: 0,
    equity_curve: [],
    monthly_performance: {}
  });

  useEffect(() => {
    requireAuth();
  }, [user, authLoading, requireAuth]);

  const loadAnalyticsData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.get<any>("/analytics");
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load metrics analytics data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center text-sm text-trading-textSecondary font-mono">
        Securing handshake session...
      </div>
    );
  }

  // Format monthly returns for Recharts bar chart
  const monthlyData = Object.entries(metrics.monthly_performance || {}).map(([key, val]) => ({
    name: key,
    PnL: val
  }));

  // Format equity curve for Recharts line chart
  const equityData = (metrics.equity_curve || []).map((point: any, index: number) => ({
    name: index === 0 ? "Start" : point.time.split(" ")[0], // date format
    Balance: point.value
  }));

  const stats = [
    { name: "Win Rate Success", value: `${metrics.win_rate}%`, icon: Percent, color: "text-trading-green" },
    { name: "Profit Factor Ratio", value: metrics.profit_factor.toFixed(2), icon: Award, color: "text-trading-green" },
    { name: "Average Return / Trade", value: `${metrics.average_return >= 0 ? "+" : ""}${metrics.average_return}%`, icon: TrendingUp, color: metrics.average_return >= 0 ? "text-trading-green" : "text-trading-red" },
    { name: "Sharpe Ratio Index", value: metrics.sharpe_ratio.toFixed(2), icon: Activity, color: "text-white" },
    { name: "Max Peak Drawdown", value: `${metrics.max_drawdown}%`, icon: ShieldAlert, color: "text-trading-red" },
    { name: "Completed Trades Count", value: metrics.total_trades, icon: Award, color: "text-white" }
  ];

  return (
    <div className="flex bg-[#0B0E11] min-h-screen font-sans text-white">
      <Sidebar user={user} onLogout={logout} />
      
      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Navbar title="Performance Analytics Feed" />
        
        <main className="p-8 space-y-6">
          {/* Header Action Row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">System Performance Metrics</h2>
              <p className="text-xs text-trading-textSecondary mt-0.5">Aggregated statistics calculated chronologically from closed trade history.</p>
            </div>
            
            <Button variant="outline" onClick={loadAnalyticsData} className="px-3">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Recompute Stats
            </Button>
          </div>

          {/* Grid Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.name} className="glass-panel p-4 rounded-xl border border-trading-border flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-trading-textSecondary uppercase tracking-wider">{s.name}</span>
                    <Icon className="w-3.5 h-3.5 text-trading-textSecondary" />
                  </div>
                  <div className={`text-base font-bold font-mono mt-3 ${s.color}`}>
                    {s.value}
                  </div>
                </div>
              );
            })}
          </div>

          {loading ? (
            <div className="py-24 text-center text-xs text-trading-textSecondary font-mono">
              Recompiling portfolio curves...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Equity Curve Chart */}
              <Card title="PORTFOLIO EQUITY CURVE" description="Timeline of asset value growth over closed trade logs">
                <div className="h-[300px] w-full mt-2 font-mono">
                  {equityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(32, 38, 50, 0.2)" />
                        <XAxis dataKey="name" stroke="#8491A5" fontSize={10} tickLine={false} />
                        <YAxis stroke="#8491A5" fontSize={10} domain={["auto", "auto"]} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#151A21", borderColor: "#202632", borderRadius: "8px" }}
                          itemStyle={{ color: "#00c805" }}
                        />
                        <Line type="monotone" dataKey="Balance" stroke="#00c805" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-trading-textSecondary">
                      No trades registered. Curve empty.
                    </div>
                  )}
                </div>
              </Card>

              {/* Monthly Profit Bar Chart */}
              <Card title="MONTHLY BAR DISTRIBUTION" description="Aggregated net return returns grouped by month">
                <div className="h-[300px] w-full mt-2 font-mono">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(32, 38, 50, 0.2)" />
                        <XAxis dataKey="name" stroke="#8491A5" fontSize={10} tickLine={false} />
                        <YAxis stroke="#8491A5" fontSize={10} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#151A21", borderColor: "#202632", borderRadius: "8px" }}
                          itemStyle={{ color: "#fff" }}
                        />
                        <Bar dataKey="PnL" fill="#00c805" radius={[4, 4, 0, 0]}>
                          {monthlyData.map((entry: any, index) => (
                            <Cell key={`cell-${index}`} fill={entry.PnL >= 0 ? "#00c805" : "#ff3b30"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-trading-textSecondary">
                      No trades registered. Distribution empty.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
