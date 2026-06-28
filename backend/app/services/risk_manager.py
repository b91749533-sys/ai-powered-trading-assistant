from typing import Any, Dict, Tuple


class RiskManagerService:
    def __init__(self, settings_dict: Dict[str, Any] = None):
        if settings_dict is None:
            settings_dict = {}
        
        self.portfolio_capital = float(settings_dict.get("portfolio_capital", 10000.0))
        self.max_risk_per_trade_pct = float(settings_dict.get("max_risk_per_trade_pct", 1.0)) # 1%
        self.max_daily_loss_pct = float(settings_dict.get("max_daily_loss_pct", 5.0)) # 5%
        self.min_risk_reward_ratio = float(settings_dict.get("min_risk_reward_ratio", 1.5))

    def evaluate_trade(
        self, entry: float, stop_loss: float, take_profit: float, direction: str
    ) -> Tuple[bool, float, str]:
        """
        Evaluate if trade conforms to risk metrics and calculate position size.
        Returns:
            (is_approved, calculated_quantity, validation_reason)
        """
        # Ensure values are clean
        if entry <= 0 or stop_loss <= 0 or take_profit <= 0:
            return False, 0.0, "Invalid pricing inputs. Entry, SL, and TP must be positive numbers."

        # 1. Evaluate Risk/Reward Ratio
        risk_distance = abs(entry - stop_loss)
        reward_distance = abs(take_profit - entry)

        if risk_distance == 0:
            return False, 0.0, "Entry price cannot equal stop loss. Risk distance is zero."

        risk_reward_ratio = reward_distance / risk_distance
        if risk_reward_ratio < self.min_risk_reward_ratio:
            return (
                False,
                0.0,
                f"Risk/Reward ratio ({risk_reward_ratio:.2f}) is below the required minimum ({self.min_risk_reward_ratio:.2f})."
            )

        # 2. Check Direction Integrity
        if direction.upper() in ["BUY", "LONG"]:
            if stop_loss >= entry:
                return False, 0.0, "For LONG trade, Stop Loss must be BELOW the entry price."
            if take_profit <= entry:
                return False, 0.0, "For LONG trade, Take Profit must be ABOVE the entry price."
        elif direction.upper() in ["SELL", "SHORT"]:
            if stop_loss <= entry:
                return False, 0.0, "For SHORT trade, Stop Loss must be ABOVE the entry price."
            if take_profit >= entry:
                return False, 0.0, "For SHORT trade, Take Profit must be BELOW the entry price."
        else:
            return False, 0.0, f"Unsupported direction type: {direction}."

        # 3. Calculate Position Size
        risk_capital_limit = self.portfolio_capital * (self.max_risk_per_trade_pct / 100.0)
        quantity = risk_capital_limit / risk_distance
        
        # Round quantity to a readable fraction (e.g. 4 decimals)
        quantity = round(quantity, 4)

        return True, quantity, f"Approved. Risk/Reward ratio: {risk_reward_ratio:.2f}. Size: {quantity} units."
