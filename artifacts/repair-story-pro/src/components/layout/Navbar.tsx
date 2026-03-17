import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LogOut, Wrench, FileSearch, HelpCircle, User, Calendar, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/track", label: "Трекинг", icon: FileSearch, show: true },
    { href: "/troubleshooter", label: "Частые проблемы", icon: HelpCircle, show: true },
    { href: "/dashboard", label: "Мои ремонты", icon: User, show: user?.role === "client" },
    { href: "/booking/new", label: "Записаться", icon: Calendar, show: user?.role === "client" },
    { href: "/technician", label: "Задачи", icon: Wrench, show: user?.role === "technician" },
    { href: "/admin", label: "Панель управления", icon: LayoutDashboard, show: user?.role === "admin" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-lg border-b border-border/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/40 group-hover:-translate-y-0.5 transition-all">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Техно<span className="text-primary">Димак</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 hidden sm:block">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                  title="Выйти"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-foreground transition-colors">
                  Войти
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:-translate-y-0.5">
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
