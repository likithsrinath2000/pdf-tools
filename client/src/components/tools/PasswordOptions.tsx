import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Lock, Eye, EyeOff, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PasswordOptionsProps {
  mode: "protect" | "unlock";
  onChange: (password: string) => void;
}

function calculatePasswordStrength(password: string): { score: number; label: string; color: string; tips: string[] } {
  if (!password) return { score: 0, label: "", color: "bg-gray-200", tips: [] };
  
  let score = 0;
  const tips: string[] = [];
  
  if (password.length >= 8) score += 25;
  else tips.push("Use at least 8 characters");
  
  if (password.length >= 12) score += 10;
  
  if (/[a-z]/.test(password)) score += 15;
  else tips.push("Add lowercase letters");
  
  if (/[A-Z]/.test(password)) score += 15;
  else tips.push("Add uppercase letters");
  
  if (/[0-9]/.test(password)) score += 15;
  else tips.push("Add numbers");
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;
  else tips.push("Add special characters (!@#$%...)");
  
  if (score < 30) return { score, label: "Weak", color: "bg-red-500", tips };
  if (score < 50) return { score, label: "Fair", color: "bg-orange-500", tips };
  if (score < 75) return { score, label: "Good", color: "bg-yellow-500", tips };
  return { score: Math.min(score, 100), label: "Strong", color: "bg-green-500", tips: [] };
}

export function PasswordOptions({ mode, onChange }: PasswordOptionsProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  useEffect(() => {
    if (mode === "protect") {
      if (password && password === confirmPassword) {
        onChangeRef.current(password);
        setError("");
      } else if (password && confirmPassword && password !== confirmPassword) {
        setError("Passwords don't match. Try again, champ!");
        onChangeRef.current("");
      } else {
        onChangeRef.current("");
      }
    } else {
      onChangeRef.current(password);
    }
  }, [password, confirmPassword, mode]);

  const getStrengthIcon = () => {
    if (strength.score < 30) return <ShieldAlert size={18} className="text-red-500" />;
    if (strength.score < 75) return <Shield size={18} className="text-yellow-500" />;
    return <ShieldCheck size={18} className="text-green-500" />;
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-slate-50 rounded-2xl border">
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="w-10 h-10 bg-slate-700 text-white rounded-xl flex items-center justify-center">
          <Lock size={20} />
        </div>
        <h3 className="text-lg font-semibold">
          {mode === "protect" ? "Set Password Protection" : "Enter PDF Password"}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">
            {mode === "protect" ? "New Password" : "Current Password"}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={mode === "protect" ? "Enter a strong password" : "Enter the PDF password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              data-testid="input-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
          </div>
        </div>

        {mode === "protect" && password && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStrengthIcon()}
                <span className={`text-sm font-medium ${
                  strength.score < 30 ? 'text-red-600' : 
                  strength.score < 75 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {strength.label} Password
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{strength.score}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
            {strength.tips.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 p-2 bg-white rounded-lg border">
                <p className="font-medium">Tips for a stronger password:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {strength.tips.slice(0, 3).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {mode === "protect" && (
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {mode === "protect" && password && password === confirmPassword && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 text-center font-medium">
              {strength.score >= 75 
                ? "Password set! Your PDF will be locked tighter than Fort Knox." 
                : "Password set! Consider using a stronger password for better security."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
