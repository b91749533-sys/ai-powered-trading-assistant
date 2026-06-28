from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SignalCreate(BaseModel):
    symbol: str
    timeframe: str
    price: float
    signal: str = Field(description="Signal type: BUY/SELL/HOLD or LONG/SHORT", serialization_alias="signal_type")
    rsi: Optional[float] = None
    macd: Optional[str] = None
    volume: Optional[float] = None
    indicator_values: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None


class SignalResponse(BaseModel):
    id: int
    symbol: str
    timeframe: str
    price: float
    signal_type: str
    rsi: Optional[float] = None
    macd: Optional[str] = None
    volume: Optional[float] = None
    indicator_values: Optional[Dict[str, Any]] = None
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    id: int
    signal_id: int
    decision: str
    confidence: float
    entry: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    reasoning: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TradeCreate(BaseModel):
    analysis_id: Optional[int] = None
    strategy_id: Optional[int] = None
    symbol: str
    direction: str  # LONG, SHORT
    entry_price: float
    quantity: float = 1.0
    status: str = "OPEN"
    entry_time: Optional[datetime] = None


class TradeUpdate(BaseModel):
    exit_price: Optional[float] = None
    status: Optional[str] = None  # CLOSED
    exit_time: Optional[datetime] = None


class TradeResponse(BaseModel):
    id: int
    analysis_id: Optional[int] = None
    strategy_id: Optional[int] = None
    symbol: str
    direction: str
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    pnl: Optional[float] = None
    win_loss: Optional[bool] = None
    status: str
    entry_time: datetime
    exit_time: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    parameters: Optional[Dict[str, Any]] = None


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    parameters: Optional[Dict[str, Any]] = None


class StrategyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    parameters: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PerformanceMetricsResponse(BaseModel):
    id: int
    strategy_id: Optional[int] = None
    win_rate: float
    average_return: float
    profit_factor: float
    sharpe_ratio: float
    max_drawdown: float
    created_at: datetime

    class Config:
        from_attributes = True


class BacktestRequest(BaseModel):
    strategy_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    initial_capital: float = 10000.0
