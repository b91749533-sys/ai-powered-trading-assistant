import { useEffect, useRef, useState } from "react";

interface LightweightChartProps {
  symbol: string;
  signals?: Array<{
    time: string;
    type: "BUY" | "SELL" | "HOLD";
    price: number;
  }>;
}

export default function LightweightChart({ symbol, signals = [] }: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !chartContainerRef.current) return;

    let chart: any;
    let candlestickSeries: any;
    let handleResize: (() => void) | null = null;

    const loadChart = async () => {
      try {
        const { createChart } = await import("lightweight-charts");
        
        if (!chartContainerRef.current) return;
        chartContainerRef.current.innerHTML = "";

        chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 350,
          layout: {
            background: { color: "#151A21" },
            textColor: "#8491A5",
          },
          grid: {
            vertLines: { color: "rgba(32, 38, 50, 0.3)" },
            horzLines: { color: "rgba(32, 38, 50, 0.3)" },
          },
          rightPriceScale: {
            borderColor: "rgba(32, 38, 50, 0.6)",
          },
          timeScale: {
            borderColor: "rgba(32, 38, 50, 0.6)",
            timeVisible: true,
          },
        });

        candlestickSeries = chart.addCandlestickSeries({
          upColor: "#00c805",
          downColor: "#ff3b30",
          borderDownColor: "#ff3b30",
          borderUpColor: "#00c805",
          wickDownColor: "#ff3b30",
          wickUpColor: "#00c805",
        });

        // Generate beautiful mock price data for the chart
        const data = generateMockData();
        candlestickSeries.setData(data);

        // Apply custom signal markers
        const markers = signals.map((s) => {
          // find nearest match in generated time index
          const sTime = new Date(s.time).getTime() / 1000;
          // find closest data point in our series
          const closestPoint = data.reduce((prev, curr) => {
            return Math.abs((curr.time as number) - sTime) < Math.abs((prev.time as number) - sTime) ? curr : prev;
          });

          return {
            time: closestPoint.time,
            position: s.type === "BUY" ? "belowBar" : "aboveBar",
            color: s.type === "BUY" ? "#00c805" : "#ff3b30",
            shape: s.type === "BUY" ? "arrowUp" : "arrowDown",
            text: s.type,
          };
        });

        // Sort markers strictly ascending by time to prevent assertion failures in lightweight-charts
        markers.sort((a, b) => (a.time as number) - (b.time as number));

        candlestickSeries.setMarkers(markers);

        // Handle resize
        handleResize = () => {
          if (chart && chartContainerRef.current) {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
          }
        };

        window.addEventListener("resize", handleResize);
        setChartLoaded(true);
      } catch (err) {
        console.error("Failed to load lightweight-charts", err);
      }
    };

    loadChart();

    return () => {
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (chart) {
        try {
          chart.remove();
        } catch (e) {
          // Ignore double removal or DOM child removal errors during hot-reload
        }
      }
    };
  }, [symbol, signals]);

  const generateMockData = () => {
    const dataList = [];
    let price = symbol.includes("BTC") ? 95000 : symbol.includes("ETH") ? 3200 : 250;
    const now = Math.floor(Date.now() / 1000);
    const hour = 3600;

    // Generate 100 hourly candlesticks
    for (let i = 100; i >= 0; i--) {
      const time = now - i * hour;
      const change = (Math.random() - 0.48) * (price * 0.015);
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * (price * 0.005);
      const low = Math.min(open, close) - Math.random() * (price * 0.005);
      
      dataList.push({
        time,
        open: round(open),
        high: round(high),
        low: round(low),
        close: round(close)
      });
      price = close;
    }
    return dataList;
  };

  const round = (num: number) => Math.round(num * 100) / 100;

  return (
    <div className="w-full bg-[#151A21] rounded-xl border border-trading-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold">{symbol}</span>
          <span className="text-xs bg-trading-border text-trading-textSecondary px-1.5 py-0.5 rounded font-mono">1H Timeframe</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-trading-green">
            <span className="w-1.5 h-1.5 rounded-full bg-trading-green" />
            BUY Signals
          </div>
          <div className="flex items-center gap-1.5 text-xs text-trading-red">
            <span className="w-1.5 h-1.5 rounded-full bg-trading-red" />
            SELL Signals
          </div>
        </div>
      </div>
      <div className="w-full h-[350px] relative">
        {!chartLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-trading-textSecondary">
            Loading charts module...
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
