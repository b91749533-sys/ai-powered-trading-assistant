import json
from typing import Any, Dict
from openai import OpenAI
from app.core.config import settings


class AIEngineService:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.api_base = settings.OPENAI_API_BASE
        self.model = settings.OPENAI_MODEL

        if self.api_key:
            self.client = OpenAI(api_key=self.api_key, base_url=self.api_base)
        else:
            self.client = None

    async def analyze_market(self, signal_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze trading indicators and market conditions to produce decision, confidence, and targets.
        """
        symbol = signal_payload.get("symbol", "UNKNOWN")
        price = float(signal_payload.get("price", 0.0))
        rsi = signal_payload.get("rsi")
        macd = signal_payload.get("macd")
        volume = signal_payload.get("volume")
        signal_type = signal_payload.get("signal", "HOLD").upper()
        indicator_values = signal_payload.get("indicator_values") or {}

        # 1. Use OpenAI if key is present
        if self.client:
            try:
                system_prompt = (
                    "You are an expert AI Trading System. Evaluate market conditions, technical indicators, "
                    "momentum, RSI, MACD, volume strength, and risk/reward. Return a structured trading advice."
                )
                user_content = (
                    f"Evaluate this signal alert:\n"
                    f"Symbol: {symbol}\n"
                    f"Current Price: {price}\n"
                    f"TradingView Signal Type: {signal_type}\n"
                    f"RSI (14): {rsi}\n"
                    f"MACD Status: {macd}\n"
                    f"Volume: {volume}\n"
                    f"Custom Indicators: {json.dumps(indicator_values)}\n\n"
                    f"You MUST return a JSON object with this exact format:\n"
                    f"{{\n"
                    f"  \"decision\": \"BUY\" | \"SELL\" | \"HOLD\",\n"
                    f"  \"confidence\": integer (0-100),\n"
                    f"  \"entry\": float,\n"
                    f"  \"stop_loss\": float,\n"
                    f"  \"take_profit\": float,\n"
                    f"  \"reasoning\": \"string summarizing technical conditions\"\n"
                    f"}}\n"
                    f"Format the output strictly as JSON. No extra text or markdown formatting tags."
                )

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                
                result_text = response.choices[0].message.content
                result = json.loads(result_text)
                return {
                    "decision": result.get("decision", "HOLD").upper(),
                    "confidence": int(result.get("confidence", 50)),
                    "entry": float(result.get("entry") or price),
                    "stop_loss": float(result.get("stop_loss") or (price * 0.98)),
                    "take_profit": float(result.get("take_profit") or (price * 1.04)),
                    "reasoning": result.get("reasoning", "AI completed signal analysis successfully.")
                }
            except Exception as e:
                # If OpenAI errors out, fall back to mock logic
                print(f"OpenAI service error: {e}. Falling back to rule-based engine.")

        # 2. Simulated rule-based AI engine fallback
        return self._simulate_ai_analysis(price, signal_type, rsi, macd, volume, symbol)

    def _simulate_ai_analysis(self, price: float, signal_type: str, rsi: Any, macd: Any, volume: Any, symbol: str) -> Dict[str, Any]:
        # Simple simulated analysis based on indicators
        decision = "HOLD"
        confidence = 50
        reasoning_parts = []

        # RSI Evaluation
        rsi_val = float(rsi) if rsi is not None else 50.0
        if rsi_val > 70:
            reasoning_parts.append(f"RSI is overbought at {rsi_val:.1f}")
        elif rsi_val < 30:
            reasoning_parts.append(f"RSI is oversold at {rsi_val:.1f}")
        else:
            reasoning_parts.append(f"RSI is neutral at {rsi_val:.1f}")

        # MACD Evaluation
        macd_str = str(macd).lower() if macd else "neutral"
        if "bull" in macd_str or "cross up" in macd_str:
            reasoning_parts.append("MACD is showing bullish crossing momentum")
        elif "bear" in macd_str or "cross down" in macd_str:
            reasoning_parts.append("MACD is showing bearish crossing momentum")
        else:
            reasoning_parts.append("MACD is neutral")

        # Combine indicator conditions
        bullish_score = 0
        bearish_score = 0

        if signal_type in ["LONG", "BUY"]:
            bullish_score += 2
        elif signal_type in ["SHORT", "SELL"]:
            bearish_score += 2

        if rsi_val > 50:
            bullish_score += 1
        elif rsi_val < 50:
            bearish_score += 1

        if "bull" in macd_str:
            bullish_score += 2
        elif "bear" in macd_str:
            bearish_score += 2

        if bullish_score > bearish_score and bullish_score >= 3:
            decision = "BUY"
            confidence = int(60 + (bullish_score * 7))
            entry = price
            # Risk reward sizing: 2% risk, 4% reward
            stop_loss = round(price * 0.985, 2)
            take_profit = round(price * 1.03, 2)
            reasoning = f"Bullish setup identified on {symbol}. " + ", ".join(reasoning_parts) + "."
        elif bearish_score > bullish_score and bearish_score >= 3:
            decision = "SELL"
            confidence = int(60 + (bearish_score * 7))
            entry = price
            # Risk reward sizing for shorting: 2% risk, 4% reward
            stop_loss = round(price * 1.015, 2)
            take_profit = round(price * 0.97, 2)
            reasoning = f"Bearish setup identified on {symbol}. " + ", ".join(reasoning_parts) + "."
        else:
            decision = "HOLD"
            confidence = 45
            entry = price
            stop_loss = price
            take_profit = price
            reasoning = f"Consolidating market conditions on {symbol}. " + ", ".join(reasoning_parts) + ". Standing aside."

        # Cap confidence
        confidence = min(max(confidence, 10), 95)

        return {
            "decision": decision,
            "confidence": confidence,
            "entry": entry,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "reasoning": reasoning
        }
