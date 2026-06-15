export type Direction = "long" | "short";
export type TradeResult = "win" | "loss" | "breakeven";
export type TradingSession = "Asia" | "London" | "NewYork";
export type RiskGrade = "A" | "B" | "C" | "D";

export type AIAnalysis = {
  id: number;
  trade_id: number | null;
  image_path: string;
  technical_analysis: Record<string, unknown>;
  macro_analysis: Record<string, unknown>;
  behavior_analysis: Record<string, unknown>;
  strategy_score: number;
  mistakes: string[];
  strengths: string[];
  suggestions: string[];
  risk_grade: RiskGrade;
  raw_response: Record<string, unknown> | null;
  created_at: string;
};

export type Trade = {
  id: number;
  symbol: string;
  direction: Direction;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward_ratio: number | null;
  timeframe: string | null;
  trade_time: string | null;
  session: TradingSession | null;
  result: TradeResult | null;
  pnl: number | null;
  reason_for_entry: string | null;
  emotion_before_trade: string | null;
  notes: string | null;
  image_path: string | null;
  created_at: string;
  analyses: AIAnalysis[];
};

export type Stats = {
  total_trades: number;
  win_rate: number;
  average_risk_reward: number;
  max_drawdown: number;
  average_win: number;
  average_loss: number;
  frequent_mistakes: { mistake: string; count: number }[];
  losing_sessions: { session: string; losses: number; total: number }[];
  losing_environments: { environment: string; count: number }[];
  emotion_loss_ratio: number;
  pnl_curve: { id: number; date: string; pnl: number; equity: number }[];
  error_heatmap: { session: string; mistake: string; count: number }[];
  session_win_rate: { session: string; win_rate: number; total: number }[];
  direction_win_rate: { direction: string; win_rate: number; total: number }[];
};
