from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, update, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trading import Signal, Analysis, Strategy, Trade, PerformanceMetrics


class TradingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Signal operations
    async def create_signal(self, signal_data: Dict[str, Any]) -> Signal:
        # Map alert signal input 'signal' to 'signal_type'
        sig_type = signal_data.get("signal", "HOLD")
        timestamp = signal_data.get("timestamp") or datetime.now(timezone.utc)
        
        signal = Signal(
            symbol=signal_data["symbol"],
            timeframe=signal_data["timeframe"],
            price=signal_data["price"],
            signal_type=sig_type,
            rsi=signal_data.get("rsi"),
            macd=signal_data.get("macd"),
            volume=signal_data.get("volume"),
            indicator_values=signal_data.get("indicator_values"),
            timestamp=timestamp
        )
        self.db.add(signal)
        await self.db.flush()
        return signal

    async def get_signals(self, symbol: Optional[str] = None, limit: int = 100) -> List[Signal]:
        query = select(Signal)
        if symbol:
            query = query.where(Signal.symbol == symbol)
        query = query.order_by(desc(Signal.created_at)).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # Analysis operations
    async def create_analysis(self, analysis_data: Dict[str, Any]) -> Analysis:
        analysis = Analysis(
            signal_id=analysis_data["signal_id"],
            decision=analysis_data["decision"],
            confidence=analysis_data["confidence"],
            entry=analysis_data.get("entry"),
            stop_loss=analysis_data.get("stop_loss"),
            take_profit=analysis_data.get("take_profit"),
            reasoning=analysis_data.get("reasoning")
        )
        self.db.add(analysis)
        await self.db.flush()
        return analysis

    async def get_analyses(self, limit: int = 100) -> List[Analysis]:
        query = select(Analysis).order_by(desc(Analysis.created_at)).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # Strategy operations
    async def create_strategy(self, strategy_data: Dict[str, Any]) -> Strategy:
        strategy = Strategy(
            name=strategy_data["name"],
            description=strategy_data.get("description"),
            is_active=strategy_data.get("is_active", True),
            parameters=strategy_data.get("parameters")
        )
        self.db.add(strategy)
        await self.db.flush()
        return strategy

    async def get_strategies(self) -> List[Strategy]:
        query = select(Strategy).order_by(Strategy.id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_strategy_by_id(self, strategy_id: int) -> Optional[Strategy]:
        query = select(Strategy).where(Strategy.id == strategy_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_strategy(self, strategy_id: int, updates: Dict[str, Any]) -> Optional[Strategy]:
        query = select(Strategy).where(Strategy.id == strategy_id)
        result = await self.db.execute(query)
        strategy = result.scalar_one_or_none()
        if strategy:
            for k, v in updates.items():
                if v is not None:
                    setattr(strategy, k, v)
            await self.db.flush()
        return strategy

    # Trade operations
    async def create_trade(self, trade_data: Dict[str, Any]) -> Trade:
        entry_time = trade_data.get("entry_time") or datetime.now(timezone.utc)
        trade = Trade(
            analysis_id=trade_data.get("analysis_id"),
            strategy_id=trade_data.get("strategy_id"),
            symbol=trade_data["symbol"],
            direction=trade_data["direction"],
            entry_price=trade_data["entry_price"],
            quantity=trade_data.get("quantity", 1.0),
            status=trade_data.get("status", "OPEN"),
            entry_time=entry_time
        )
        self.db.add(trade)
        await self.db.flush()
        return trade

    async def get_trades(self, status: Optional[str] = None, limit: int = 100) -> List[Trade]:
        query = select(Trade)
        if status:
            query = query.where(Trade.status == status)
        query = query.order_by(desc(Trade.created_at)).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_trade_by_id(self, trade_id: int) -> Optional[Trade]:
        query = select(Trade).where(Trade.id == trade_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_trade(self, trade_id: int, updates: Dict[str, Any]) -> Optional[Trade]:
        query = select(Trade).where(Trade.id == trade_id)
        result = await self.db.execute(query)
        trade = result.scalar_one_or_none()
        if trade:
            for k, v in updates.items():
                if v is not None:
                    setattr(trade, k, v)
            # recalculate pnl and win/loss if exit_price is provided and trade is closed
            if trade.status == "CLOSED" and trade.exit_price is not None:
                # simple PnL calculation: (exit - entry) * quantity for LONG, (entry - exit) * quantity for SHORT
                if trade.direction == "LONG":
                    trade.pnl = (trade.exit_price - trade.entry_price) * trade.quantity
                else:
                    trade.pnl = (trade.entry_price - trade.exit_price) * trade.quantity
                trade.win_loss = trade.pnl > 0
                if not trade.exit_time:
                    trade.exit_time = datetime.now(timezone.utc)
            await self.db.flush()
        return trade

    # Performance Metrics operations
    async def create_performance_metrics(self, metrics_data: Dict[str, Any]) -> PerformanceMetrics:
        metrics = PerformanceMetrics(
            strategy_id=metrics_data.get("strategy_id"),
            win_rate=metrics_data["win_rate"],
            average_return=metrics_data["average_return"],
            profit_factor=metrics_data["profit_factor"],
            sharpe_ratio=metrics_data["sharpe_ratio"],
            max_drawdown=metrics_data["max_drawdown"]
        )
        self.db.add(metrics)
        await self.db.flush()
        return metrics

    async def get_performance_metrics(self, strategy_id: Optional[int] = None) -> List[PerformanceMetrics]:
        query = select(PerformanceMetrics)
        if strategy_id is not None:
            query = query.where(PerformanceMetrics.strategy_id == strategy_id)
        query = query.order_by(desc(PerformanceMetrics.created_at))
        result = await self.db.execute(query)
        return list(result.scalars().all())
