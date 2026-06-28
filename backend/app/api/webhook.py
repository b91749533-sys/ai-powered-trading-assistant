from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.repositories.trading import TradingRepository
from app.services.ai_engine import AIEngineService
from app.services.risk_manager import RiskManagerService
from app.models.trading import Strategy

router = APIRouter()
ai_service = AIEngineService()


@router.post("/webhook")
async def tradingview_webhook(
    payload: Dict[str, Any],
    secret: str = Query(None),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Receive alerts from TradingView, analyze using AI, run risk filters, and execute mock trades.
    """
    # 1. Parse and validate input payload
    symbol = payload.get("symbol")
    price = payload.get("price")
    signal_type = payload.get("signal")
    timeframe = payload.get("timeframe", "1H")

    if not symbol or price is None or not signal_type:
        raise HTTPException(
            status_code=400,
            detail="Payload must include 'symbol', 'price', and 'signal' fields."
        )

    repo = TradingRepository(db)

    # 2. Store signal alert in the database
    signal_entry = await repo.create_signal(payload)
    
    # 3. Call AI Analysis service
    ai_result = await ai_service.analyze_market(payload)
    
    # 4. Store AI analysis in the database
    analysis_data = {
        "signal_id": signal_entry.id,
        "decision": ai_result["decision"],
        "confidence": ai_result["confidence"],
        "entry": ai_result["entry"],
        "stop_loss": ai_result["stop_loss"],
        "take_profit": ai_result["take_profit"],
        "reasoning": ai_result["reasoning"]
    }
    analysis_entry = await repo.create_analysis(analysis_data)

    # 5. Risk Management & Automated Trade Execution
    # Fetch first active strategy if exists to associate with the trade
    strategy_result = await db.execute(select(Strategy).where(Strategy.is_active == True))
    active_strategy = strategy_result.scalars().first()
    
    trade_executed = False
    trade_info = {}
    
    # Only execute trades for BUY or SELL decisions
    if ai_result["decision"] in ["BUY", "SELL"]:
        # Initialize risk manager with active strategy parameters if available
        risk_params = active_strategy.parameters if active_strategy else {}
        risk_manager = RiskManagerService(risk_params)

        direction = "LONG" if ai_result["decision"] == "BUY" else "SHORT"
        
        is_approved, quantity, reason = risk_manager.evaluate_trade(
            entry=ai_result["entry"],
            stop_loss=ai_result["stop_loss"],
            take_profit=ai_result["take_profit"],
            direction=direction
        )

        if is_approved:
            # Check if there is already an open position for this symbol and active strategy
            # To simplify, we will close the previous open position if it is in the opposite direction (reversal)
            # or just open a new mock trade.
            trade_data = {
                "analysis_id": analysis_entry.id,
                "strategy_id": active_strategy.id if active_strategy else None,
                "symbol": symbol,
                "direction": direction,
                "entry_price": ai_result["entry"],
                "quantity": quantity,
                "status": "OPEN",
                "entry_time": datetime.now(timezone.utc)
            }
            new_trade = await repo.create_trade(trade_data)
            trade_executed = True
            trade_info = {
                "trade_id": new_trade.id,
                "direction": direction,
                "quantity": quantity,
                "status": "OPEN",
                "risk_message": reason
            }
        else:
            trade_info = {
                "trade_id": None,
                "status": "REJECTED_BY_RISK_MANAGER",
                "risk_message": reason
            }
    else:
        trade_info = {
            "trade_id": None,
            "status": "HOLD",
            "risk_message": "No action taken. AI decision is HOLD."
        }

    # Commit modifications
    await db.commit()

    return {
        "status": "success",
        "signal_id": signal_entry.id,
        "analysis_id": analysis_entry.id,
        "ai_analysis": ai_result,
        "trade_execution": trade_info
    }
