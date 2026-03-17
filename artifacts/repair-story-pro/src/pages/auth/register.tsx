import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageTransition } from "@/components/PageTransition";
import { UserPlus, Loader2 } from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login: setAuthContext } = useAuth();
  const [, setLocation] = useLocation();
  
  const registerMutation = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await registerMutation.mutateAsync({ data: { name, email, password } });
      setAuthContext(data.accessToken, data.user);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Ошибка регистрации.");
    }
  };

  return (
    <PageTransition className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden py-12">
      <div className="absolute inset-0 z-0">
        <img src={`${import.meta.env.BASE_URL}images/auth-bg.png`} alt="bg" className="w-full h-full object-cover opacity-20" />
      </div>
      
      <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white relative z-10 mx-4">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>
        
        <h2 className="text-2xl font-display font-bold text-center mb-2">Создать аккаунт</h2>
        <p className="text-slate-500 text-center mb-8 text-sm">Станьте клиентом ТехноДимак</p>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="Иван Иванов"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="client@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="Минимум 6 символов"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full py-3.5 px-4 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:bg-emerald-700 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center"
          >
            {registerMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
