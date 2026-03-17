import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageTransition } from "@/components/PageTransition";
import { Wrench, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login: setAuthContext } = useAuth();
  const [, setLocation] = useLocation();
  
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await loginMutation.mutateAsync({ data: { email, password } });
      setAuthContext(data.accessToken, data.user);
      
      if (data.user.role === "admin") setLocation("/admin");
      else if (data.user.role === "technician") setLocation("/technician");
      else setLocation("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка входа. Проверьте данные.";
      setError(message);
    }
  };

  return (
    <PageTransition className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={`${import.meta.env.BASE_URL}images/auth-bg.png`} alt="bg" className="w-full h-full object-cover opacity-20" />
      </div>
      
      <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white relative z-10 mx-4">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
        
        <h2 className="text-2xl font-display font-bold text-center mb-2">С возвращением!</h2>
        <p className="text-slate-500 text-center mb-8 text-sm">Войдите в систему для управления ремонтами</p>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3.5 px-4 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center"
          >
            {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
