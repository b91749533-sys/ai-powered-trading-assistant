from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.core.database import get_db
from app.models.trading import Trade
from app.api.deps import get_current_user
import math

router = APIRouter()


@router.get("/")
async def get_trading_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Retrieve aggregated live performance analytics from trade history.
    """
    # Fetch all closed trades to compute statistics
    query = select(Trade).where(Trade.status == "CLOSED").order_by(Trade.exit_time)
    result = await db.execute(query)
    trades = list(result.scalars().all())

    # Default metrics when no trade exists
    if not trades:
        return {
            "win_rate": 0.0,
            "average_return": 0.0,
            "profit_factor": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "total_trades": 0,
            "win_trades": 0,
            "loss_trades": 0,
            "equity_curve": [{"time": "Start", "value": 10000.0}],
            "monthly_performance": {}
        }

    total_trades = len(trades)
    wins = [t for t in trades if t.win_loss]
    losses = [t for t in trades if not t.win_loss]

    win_rate = (len(wins) / total_trades) * 100.0 if total_trades > 0 else 0.0
    
    sum_gains = sum(t.pnl for t in wins) if wins else 0.0
    sum_losses = abs(sum(t.pnl for t in losses)) if losses else 0.0
    profit_factor = (sum_gains / sum_losses) if sum_losses > 0 else (sum_gains if sum_gains > 0 else 1.0)

    # Returns calculation
    returns = []
    capital = 10000.0
    equity_curve = [{"time": "Start", "value": capital}]
    peak_capital = capital
    max_drawdown = 0.0

    monthly_perf: Dict[str, float] = {}

    for t in trades:
        pnl = t.pnl or 0.0
        capital += pnl
        equity_curve.append({
            "time": t.exit_time.strftime("%Y-%m-%d %H:%M") if t.exit_time else t.created_at.strftime("%Y-%m-%d %H:%M"),
            "value": capital
        })

        # Track returns
        cost = t.entry_price * t.quantity
        pct_return = (pnl / cost) * 100.0 if cost > 0 else 0.0
        returns.append(pct_return)

        # Drawdown calculation
        if capital > peak_capital:
            peak_capital = capital
        dd = ((peak_capital - capital) / peak_capital) * 100.0 if peak_capital > 0 else 0.0
        if dd > max_drawdown:
            max_drawdown = dd

        # Monthly performance mapping (grouping by Year-Month)
        month_key = t.exit_time.strftime("%Y-%m") if t.exit_time else t.created_at.strftime("%Y-%m")
        monthly_perf[month_key] = monthly_perf.get(month_key, 0.0) + pnl

    avg_return = sum(returns) / len(returns) if returns else 0.0

    # Sharpe ratio
    if len(returns) > 1:
        mean_ret = avg_return
        variance = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
        std_dev = math.sqrt(variance)
        sharpe_ratio = (mean_ret / std_dev) if std_dev > 0 else 0.0
    else:
        sharpe_ratio = 0.0

    return {
        "win_rate": round(win_rate, 2),
        "average_return": round(avg_return, 2),
        "profit_factor": round(profit_factor, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "max_drawdown": round(max_drawdown, 2),
        "total_trades": total_trades,
        "win_trades": len(wins),
        "loss_trades": len(losses),
        "equity_curve": equity_curve,
        "monthly_performance": monthly_perf
    }
