import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";

export default function Login() {
  const { user, loading, error, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setActionLoading(true);
    let success = false;
    if (isRegister) {
      success = await register(email, password);
    } else {
      success = await login(email, password);
    }
    setActionLoading(false);

    if (success) {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center text-sm text-trading-textSecondary font-mono">
        Initializing secure environment...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center p-4">
      {/* Glow effect background */}
      <div className="absolute w-96 h-96 bg-trading-green/10 rounded-full blur-[120px] top-1/4 left-1/4 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-trading-red/5 rounded-full blur-[120px] bottom-1/4 right-1/4 pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-2xl border border-trading-border/80 p-8 shadow-2xl z-10 relative">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-trading-green/10 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="text-trading-green w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-outfit">
            ANTIGRAVITY TERMINAL
          </h2>
          <p className="text-xs text-trading-textSecondary mt-1">
            {isRegister ? "Create secondary sub-account" : "Sign in to access your portfolios"}
          </p>
        </div>

        {/* Errors display */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-trading-red/10 border border-trading-red/35 text-xs text-trading-red leading-normal">
            {error}
          </div>
        )}

        {/* Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-trading-textSecondary uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-trading-textSecondary">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@domain.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B0E11] border border-trading-border rounded-xl text-sm text-white placeholder-trading-textSecondary/50 focus:outline-none focus:border-trading-green transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-trading-textSecondary uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-trading-textSecondary">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#0B0E11] border border-trading-border rounded-xl text-sm text-white placeholder-trading-textSecondary/50 focus:outline-none focus:border-trading-green transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-trading-textSecondary hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={actionLoading}
            variant="primary"
            className="w-full py-3 mt-6 hover:shadow-[0_0_12px_rgba(0,200,5,0.2)]"
          >
            {actionLoading ? "Processing credentials..." : isRegister ? "Deploy Sub-Account" : "Initialize Secure Session"}
          </Button>
        </form>

        {/* Footer switcher */}
        <div className="mt-8 text-center text-xs text-trading-textSecondary">
          {isRegister ? (
            <>
              Already have an active session?{" "}
              <button
                onClick={() => setIsRegister(false)}
                className="text-trading-green hover:underline focus:outline-none font-semibold ml-0.5"
              >
                Login
              </button>
            </>
          ) : (
            <>
              New operator?{" "}
              <button
                onClick={() => setIsRegister(true)}
                className="text-trading-green hover:underline focus:outline-none font-semibold ml-0.5"
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
