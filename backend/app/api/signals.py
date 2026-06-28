from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.trading import TradingRepository
from app.schemas.trading import SignalResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[SignalResponse])
async def get_signals(
    symbol: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Retrieve signal alert history, optionally filtered by symbol.
    """
    repo = TradingRepository(db)
    signals = await repo.get_signals(symbol=symbol, limit=limit)
    return signals
