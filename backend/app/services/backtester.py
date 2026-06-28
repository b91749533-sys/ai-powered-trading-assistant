from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
from app.models.trading import Signal


class BacktesterService:
    @staticmethod
    def run_backtest(
        signals: List[Signal],
        initial_capital: float = 10000.0,
        strategy_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Simulate trading on historical signals.
        """
        if not signals:
            return {
                "win_rate": 0.0,
                "average_return": 0.0,
                "profit_factor": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown": 0.0,
                "trades": [],
                "equity_curve": [{"time": datetime.now(timezone.utc).isoformat(), "value": initial_capital}]
            }

        if strategy_params is None:
            strategy_params = {}

        # Default rules:
        # RSI threshold for buys: default < 45
        # RSI threshold for sells: default > 55
        rsi_buy_threshold = float(strategy_params.get("rsi_buy_threshold", 45.0))
        rsi_sell_threshold = float(strategy_params.get("rsi_sell_threshold", 55.0))
        stop_loss_pct = float(strategy_params.get("stop_loss_pct", 1.5)) / 100.0
        take_profit_pct = float(strategy_params.get("take_profit_pct", 3.0)) / 100.0

        # Sort signals ascending by timestamp to process chronologically
        sorted_signals = sorted(signals, key=lambda x: x.timestamp)

        capital = initial_capital
        equity_curve = [{"time": sorted_signals[0].timestamp.isoformat(), "value": capital}]
        
        open_position: Optional[Dict[str, Any]] = None
        closed_trades: List[Dict[str, Any]] = []
        peak_capital = initial_capital
        max_drawdown = 0.0

        for signal in sorted_signals:
            price = signal.price
            sig_time = signal.timestamp
            rsi_val = signal.rsi if signal.rsi is not None else 50.0

            # 1. Manage open positions (Check stop loss / take profit)
            if open_position:
                direction = open_position["direction"]
                entry_price = open_position["entry_price"]
                qty = open_position["quantity"]
                sl = open_position["stop_loss"]
                tp = open_position["take_profit"]

                is_closed = False
                exit_price = price
                close_reason = ""

                if direction == "LONG":
                    if price <= sl:
                        is_closed = True
                        exit_price = sl
                        close_reason = "Stop Loss"
                    elif price >= tp:
                        is_closed = True
                        exit_price = tp
                        close_reason = "Take Profit"
                    elif rsi_val >= rsi_sell_threshold or signal.signal_type in ["SHORT", "SELL"]:
                        is_closed = True
                        exit_price = price
                        close_reason = "Sell Signal"
                else: # SHORT
                    if price >= sl:
                        is_closed = True
                        exit_price = sl
                        close_reason = "Stop Loss"
                    elif price <= tp:
                        is_closed = True
                        exit_price = tp
                        close_reason = "Take Profit"
                    elif rsi_val <= rsi_buy_threshold or signal.signal_type in ["LONG", "BUY"]:
                        is_closed = True
                        exit_price = price
                        close_reason = "Buy Signal"

                if is_closed:
                    if direction == "LONG":
                        pnl = (exit_price - entry_price) * qty
                    else:
                        pnl = (entry_price - exit_price) * qty

                    capital += pnl
                    closed_trades.append({
                        "symbol": open_position["symbol"],
                        "direction": direction,
                        "entry_price": entry_price,
                        "exit_price": exit_price,
                        "quantity": qty,
                        "pnl": pnl,
                        "win": pnl > 0,
                        "entry_time": open_position["entry_time"].isoformat(),
                        "exit_time": sig_time.isoformat(),
                        "reason": close_reason
                    })
                    
                    # Update peak and drawdown
                    if capital > peak_capital:
                        peak_capital = capital
                    dd = ((peak_capital - capital) / peak_capital) * 100.0
                    if dd > max_drawdown:
                        max_drawdown = dd

                    equity_curve.append({"time": sig_time.isoformat(), "value": capital})
                    open_position = None

            # 2. Check for opening new positions
            if not open_position:
                # LONG setup
                if (signal.signal_type in ["LONG", "BUY"] or rsi_val < rsi_buy_threshold):
                    # Risk 1% of capital on trade
                    risk_amount = capital * 0.01
                    sl_price = price * (1.0 - stop_loss_pct)
                    tp_price = price * (1.0 + take_profit_pct)
                    
                    qty = risk_amount / (price * stop_loss_pct) if price * stop_loss_pct > 0 else 1
                    qty = round(qty, 4)
                    
                    open_position = {
                        "symbol": signal.symbol,
                        "direction": "LONG",
                        "entry_price": price,
                        "quantity": qty,
                        "stop_loss": sl_price,
                        "take_profit": tp_price,
                        "entry_time": sig_time
                    }
                # SHORT setup
                elif (signal.signal_type in ["SHORT", "SELL"] or rsi_val > rsi_sell_threshold):
                    risk_amount = capital * 0.01
                    sl_price = price * (1.0 + stop_loss_pct)
                    tp_price = price * (1.0 - take_profit_pct)
                    
                    qty = risk_amount / (price * stop_loss_pct) if price * stop_loss_pct > 0 else 1
                    qty = round(qty, 4)
                    
                    open_position = {
                        "symbol": signal.symbol,
                        "direction": "SHORT",
                        "entry_price": price,
                        "quantity": qty,
                        "stop_loss": sl_price,
                        "take_profit": tp_price,
                        "entry_time": sig_time
                    }

        # Close out any remaining open position at the end of backtest at last price
        if open_position:
            last_sig = sorted_signals[-1]
            direction = open_position["direction"]
            entry_price = open_position["entry_price"]
            qty = open_position["quantity"]
            exit_price = last_sig.price
            
            if direction == "LONG":
                pnl = (exit_price - entry_price) * qty
            else:
                pnl = (entry_price - exit_price) * qty

            capital += pnl
            closed_trades.append({
                "symbol": open_position["symbol"],
                "direction": direction,
                "entry_price": entry_price,
                "exit_price": exit_price,
                "quantity": qty,
                "pnl": pnl,
                "win": pnl > 0,
                "entry_time": open_position["entry_time"].isoformat(),
                "exit_time": last_sig.timestamp.isoformat(),
                "reason": "End of Backtest"
            })
            if capital > peak_capital:
                peak_capital = capital
            dd = ((peak_capital - capital) / peak_capital) * 100.0
            if dd > max_drawdown:
                max_drawdown = dd
            equity_curve.append({"time": last_sig.timestamp.isoformat(), "value": capital})

        # 3. Calculate Performance Aggregates
        total_trades = len(closed_trades)
        wins = [t for t in closed_trades if t["win"]]
        losses = [t for t in closed_trades if not t["win"]]

        win_rate = (len(wins) / total_trades * 100.0) if total_trades > 0 else 0.0
        
        sum_gains = sum(t["pnl"] for t in wins)
        sum_losses = abs(sum(t["pnl"] for t in losses))
        profit_factor = (sum_gains / sum_losses) if sum_losses > 0 else (sum_gains if sum_gains > 0 else 1.0)

        # Average trade return
        returns = []
        for t in closed_trades:
            pct_ret = (t["pnl"] / (t["entry_price"] * t["quantity"])) * 100.0
            returns.append(pct_ret)
        
        avg_return = sum(returns) / len(returns) if returns else 0.0

        # Sharpe ratio calculation (simplified daily/trade-level metrics)
        if len(returns) > 1:
            mean_ret = avg_return
            variance = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
            std_dev = math.sqrt(variance)
            # Sharpe = mean / std_dev. (Multiply by sqrt(252) to annualize, but keep trade-level for baseline)
            sharpe_ratio = (mean_ret / std_dev) if std_dev > 0 else 0.0
        else:
            sharpe_ratio = 0.0

        return {
            "win_rate": round(win_rate, 2),
            "average_return": round(avg_return, 2),
            "profit_factor": round(profit_factor, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "max_drawdown": round(max_drawdown, 2),
            "trades": closed_trades,
            "equity_curve": equity_curve
        }
