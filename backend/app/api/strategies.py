from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.repositories.trading import TradingRepository
from app.schemas.trading import StrategyCreate, StrategyResponse, StrategyUpdate, BacktestRequest
from app.services.backtester import BacktesterService
from app.models.trading import Signal, Strategy
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[StrategyResponse])
async def get_strategies(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Retrieve all custom trading strategies.
    """
    repo = TradingRepository(db)
    strategies = await repo.get_strategies()
    return strategies


@router.post("/", response_model=StrategyResponse)
async def create_strategy(
    strategy_in: StrategyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Create a new trading strategy.
    """
    repo = TradingRepository(db)
    strategy_data = strategy_in.model_dump()
    strategy = await repo.create_strategy(strategy_data)
    await db.commit()
    await db.refresh(strategy)
    return strategy


@router.patch("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    strategy_in: StrategyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Update / toggle strategy active state and configuration parameters.
    """
    repo = TradingRepository(db)
    updates = strategy_in.model_dump(exclude_unset=True)
    strategy = await repo.update_strategy(strategy_id, updates)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found"
        )
    await db.commit()
    await db.refresh(strategy)
    return strategy


@router.post("/backtest")
async def run_strategy_backtest(
    request: BacktestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Run backtest simulation for a strategy based on historical alerts stored in signals table.
    """
    repo = TradingRepository(db)
    strategy = await repo.get_strategy_by_id(request.strategy_id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found"
        )

    # Fetch signals for backtest simulation
    query = select(Signal)
    if request.start_date:
        query = query.where(Signal.timestamp >= request.start_date)
    if request.end_date:
        query = query.where(Signal.timestamp <= request.end_date)
    
    result = await db.execute(query)
    signals = list(result.scalars().all())

    # Run backtester service
    # Merge strategy's parameters with request
    strategy_params = strategy.parameters or {}
    backtest_result = BacktesterService.run_backtest(
        signals=signals,
        initial_capital=request.initial_capital,
        strategy_params=strategy_params
    )

    # Save generated performance metrics to database
    metrics_data = {
        "strategy_id": strategy.id,
        "win_rate": backtest_result["win_rate"],
        "average_return": backtest_result["average_return"],
        "profit_factor": backtest_result["profit_factor"],
        "sharpe_ratio": backtest_result["sharpe_ratio"],
        "max_drawdown": backtest_result["max_drawdown"]
    }
    await repo.create_performance_metrics(metrics_data)
    await db.commit()

    return {
        "strategy_name": strategy.name,
        "metrics": metrics_data,
        "equity_curve": backtest_result["equity_curve"],
        "simulated_trades": backtest_result["trades"]
    }
