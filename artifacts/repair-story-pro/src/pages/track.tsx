import { useState } from "react";
import { useTrackBooking } from "@workspace/api-client-react";
import { PageTransition } from "@/components/PageTransition";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Track() {
  const [code, setCode] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const { data, isLoading, isError, error } = useTrackBooking(searchCode, {
    query: { enabled: !!searchCode, retry: false }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) setSearchCode(code.trim().toUpperCase());
  };

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-bold mb-4">Трекинг ремонта</h1>
        <p className="text-slate-600">Введите номер квитанции (например, R-12345), чтобы узнать статус</p>
      </div>

      <form onSubmit={handleSearch} className="max-w-md mx-auto mb-12">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="R-XXXXX"
            className="w-full pl-12 pr-32 py-4 rounded-2xl bg-white border-2 border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all uppercase text-lg font-medium"
          />
          <button 
            type="submit"
            className="absolute right-2 px-6 py-2 bg-primary text-white rounded-xl font-medium shadow-md hover:bg-primary/90 transition-colors"
          >
            Искать
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-center flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8" />
          <p className="font-medium">Заказ с таким номером не найден. Проверьте правильность ввода.</p>
        </div>
      )}

      {data && (
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-8 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold font-display">{data.booking.device}</h2>
                <StatusBadge status={data.booking.status as any} />
              </div>
              <p className="text-slate-500 font-mono">Заказ: {data.booking.code}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl text-sm w-full sm:w-auto">
              <span className="text-slate-500 block mb-1">Проблема:</span>
              <span className="font-medium">{data.booking.issue}</span>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> История изменений
          </h3>
          
          <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8 pb-4">
            {data.logs.map((log, idx) => (
              <div key={log.id} className="relative pl-8 md:pl-10">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-white shadow-sm" />
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 line-through opacity-50 text-sm">
                        {log.fromStatus}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <StatusBadge status={log.toStatus as any} />
                    </div>
                    <span className="text-sm text-slate-500">
                      {format(new Date(log.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                    </span>
                  </div>
                  {log.note && (
                    <p className="text-slate-600 mt-3 text-sm bg-white p-3 rounded-xl border border-slate-100">
                      {log.note}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-3 flex justify-end">
                    Сотрудник: {log.byUserName}
                  </p>
                </div>
              </div>
            ))}
            
            <div className="relative pl-8 md:pl-10 opacity-60">
               <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-200 ring-4 ring-white" />
               <p className="font-medium">Заявка создана</p>
               <p className="text-sm text-slate-500">
                 {format(new Date(data.booking.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
               </p>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
