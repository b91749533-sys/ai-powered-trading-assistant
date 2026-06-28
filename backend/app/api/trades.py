from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete


from app.core.database import get_db
from app.repositories.trading import TradingRepository
from app.schemas.trading import TradeCreate, TradeResponse, TradeUpdate
from app.models.trading import Trade
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[TradeResponse])
async def get_trades(
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Retrieve executed trade logs, optionally filtered by status (OPEN/CLOSED).
    """
    repo = TradingRepository(db)
    trades = await repo.get_trades(status=status, limit=limit)
    return trades


@router.post("/", response_model=TradeResponse)
async def create_trade(
    trade_in: TradeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Manually log/create a trade.
    """
    repo = TradingRepository(db)
    trade_data = trade_in.model_dump()
    trade = await repo.create_trade(trade_data)
    await db.commit()
    await db.refresh(trade)
    return trade


@router.post("/{trade_id}/close", response_model=TradeResponse)
async def close_trade(
    trade_id: int,
    trade_close: TradeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Close an open trade by specifying exit price and time.
    """
    repo = TradingRepository(db)
    trade = await repo.get_trade_by_id(trade_id)
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )
    if trade.status == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trade is already closed"
        )
    
    exit_price = trade_close.exit_price or trade.entry_price
    exit_time = trade_close.exit_time or datetime.now(timezone.utc)
    
    updates = {
        "exit_price": exit_price,
        "status": "CLOSED",
        "exit_time": exit_time
    }
    
    updated_trade = await repo.update_trade(trade_id, updates)
    await db.commit()
    await db.refresh(updated_trade)
    return updated_trade


@router.delete("/{trade_id}", response_model=Dict[str, str])
async def delete_trade(
    trade_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Delete a trade log.
    """
    await db.execute(delete(Trade).where(Trade.id == trade_id))
    await db.commit()
    return {"status": "success", "message": "Trade deleted successfully"}
