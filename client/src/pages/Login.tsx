import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, name);
      navigate("/");
    } catch (err: any) {
      push("error", err?.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center">
            <MessageSquareText className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">CampaignHub</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4 text-slate-900 dark:text-slate-100">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </h2>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
            </Button>
          </form>
          <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-4">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              className="text-brand-600 dark:text-brand-400 font-medium"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
