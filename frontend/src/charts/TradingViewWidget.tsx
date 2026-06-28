import { useEffect, useRef } from "react";

interface TradingViewWidgetProps {
  symbol: string;
}

export default function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        interval: "1h",
        width: "100%",
        isTransparent: true,
        height: 380,
        symbol: symbol.includes(":") ? symbol : `BINANCE:${symbol}`,
        showIntervalTabs: true,
        displayMode: "single",
        locale: "en",
        colorTheme: "dark"
      });
      containerRef.current.appendChild(script);
    }
  }, [symbol]);

  return (
    <div className="w-full bg-[#151A21]/50 rounded-xl overflow-hidden border border-trading-border p-4">
      <div className="text-xs text-trading-textSecondary mb-2 font-mono">
        TRADINGVIEW Technical Summary: {symbol}
      </div>
      <div ref={containerRef} className="tradingview-widget-container" />
    </div>
  );
}
