from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String, index=True, nullable=False)
    timeframe: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    signal_type: Mapped[str] = mapped_column(String, nullable=False)  # BUY, SELL, HOLD, LONG, SHORT
    rsi: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    macd: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    indicator_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # custom indicators
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    analyses: Mapped[List["Analysis"]] = relationship("Analysis", back_populates="signal", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    signal_id: Mapped[int] = mapped_column(Integer, ForeignKey("signals.id", ondelete="CASCADE"), nullable=False)
    decision: Mapped[str] = mapped_column(String, nullable=False)  # BUY, SELL, HOLD
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    entry: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    stop_loss: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    take_profit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    signal: Mapped["Signal"] = relationship("Signal", back_populates="analyses")
    trades: Mapped[List["Trade"]] = relationship("Trade", back_populates="analysis")


class Strategy(Base):
    __tablename__ = "strategies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    parameters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # custom constraints, etc.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    trades: Mapped[List["Trade"]] = relationship("Trade", back_populates="strategy")
    metrics: Mapped[List["PerformanceMetrics"]] = relationship("PerformanceMetrics", back_populates="strategy", cascade="all, delete-orphan")


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    analysis_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True)
    strategy_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("strategies.id", ondelete="SET NULL"), nullable=True)
    symbol: Mapped[str] = mapped_column(String, index=True, nullable=False)
    direction: Mapped[str] = mapped_column(String, nullable=False)  # LONG, SHORT
    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    exit_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    pnl: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    win_loss: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    status: Mapped[str] = mapped_column(String, default="OPEN")  # OPEN, CLOSED
    entry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    exit_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    analysis: Mapped[Optional["Analysis"]] = relationship("Analysis", back_populates="trades")
    strategy: Mapped[Optional["Strategy"]] = relationship("Strategy", back_populates="trades")


class PerformanceMetrics(Base):
    __tablename__ = "performance_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    strategy_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("strategies.id", ondelete="CASCADE"), nullable=True)
    win_rate: Mapped[float] = mapped_column(Float, nullable=False)  # e.g. 65.5 for 65.5%
    average_return: Mapped[float] = mapped_column(Float, nullable=False)  # percentage avg return
    profit_factor: Mapped[float] = mapped_column(Float, nullable=False)
    sharpe_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    max_drawdown: Mapped[float] = mapped_column(Float, nullable=False)  # e.g. 12.4 for 12.4%
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    strategy: Mapped[Optional["Strategy"]] = relationship("Strategy", back_populates="metrics")
