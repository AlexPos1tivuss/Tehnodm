import { Link } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { Wrench, ShieldCheck, Clock, ArrowRight, Search, Flame, Truck, Settings } from "lucide-react";

export default function Home() {
  return (
    <PageTransition className="min-h-[calc(100vh-4rem)] flex flex-col">
      <section className="relative pt-24 pb-32 overflow-hidden flex-1 flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/80 to-white" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
            Сварочное оборудование в <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              надёжных руках
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
            Профессиональный ремонт, обслуживание и аренда сварочного оборудования в сервисном центре ТехноДимак. Быстро, качественно, с гарантией.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/booking/new" 
              className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-semibold text-lg shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
            >
              Записаться на ремонт
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <Link 
              href="/track" 
              className="flex items-center gap-2 px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-full font-semibold text-lg hover:border-primary/30 hover:bg-slate-50 transition-all duration-300"
            >
              <Search className="w-5 h-5 text-primary" />
              Статус заказа
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">Наши услуги</h2>
          <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">Полный спектр услуг по обслуживанию сварочного и технологического оборудования</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-100 text-primary rounded-2xl flex items-center justify-center mb-6">
                <Settings className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-display">Техническое обслуживание</h3>
              <p className="text-slate-600">Профессиональное техническое обслуживание сварочного оборудования всех типов.</p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Flame className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-display">Ремонт и модернизация</h3>
              <p className="text-slate-600">Ремонт и модернизация порталов воздушно-плазменной резки.</p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-display">Аренда оборудования</h3>
              <p className="text-slate-600">Гибкие условия аренды сварочного оборудования для временных проектов.</p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Wrench className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-display">Ремонт оборудования</h3>
              <p className="text-slate-600">Ремонт сварочного и технологического оборудования любой сложности.</p>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
