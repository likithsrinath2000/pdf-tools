import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PasswordOptionsProps {
  mode: "protect" | "unlock";
  onChange: (password: string) => void;
}

export function PasswordOptions({ mode, onChange }: PasswordOptionsProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "protect") {
      if (password && password === confirmPassword) {
        onChange(password);
        setError("");
      } else if (password && confirmPassword && password !== confirmPassword) {
        setError("Passwords don't match. Try again, champ!");
        onChange("");
      } else {
        onChange("");
      }
    } else {
      onChange(password);
    }
  }, [password, confirmPassword, mode, onChange]);

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
          <p className="text-sm text-green-600 text-center">
            Password set! Your PDF will be locked tighter than Fort Knox.
          </p>
        )}
      </div>
    </div>
  );
}
