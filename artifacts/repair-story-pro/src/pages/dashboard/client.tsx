import { useListMyBookings } from "@workspace/api-client-react";
import { PageTransition } from "@/components/PageTransition";
import { StatusBadge } from "@/components/StatusBadge";
import { PackageOpen, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Link } from "wouter";
import { useSocket } from "@/hooks/use-socket";

export default function ClientDashboard() {
  useSocket(); // Listen for real-time updates
  const { data, isLoading } = useListMyBookings();

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Мои ремонты</h1>
          <p className="text-slate-600">Отслеживайте статус ваших устройств в реальном времени</p>
        </div>
        <Link 
          href="/booking/new"
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-lg hover:bg-primary/90 transition-all hover:-translate-y-0.5"
        >
          Новая заявка
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2].map(i => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-3xl" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <PackageOpen className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">У вас пока нет активных ремонтов</h3>
          <p className="text-slate-500 mb-8 max-w-md">Если ваше устройство сломалось, оформите заявку, и мы починим его в кратчайшие сроки.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((booking) => (
            <Link key={booking.id} href={`/track?code=${booking.code}`} className="group block">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold font-display group-hover:text-primary transition-colors">
                      {booking.device}
                    </h3>
                    <p className="text-sm font-mono text-slate-500 mt-1">{booking.code}</p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
                
                <p className="text-slate-600 text-sm line-clamp-2 mb-6 h-10">
                  {booking.issue}
                </p>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  {booking.appointmentAt ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(booking.appointmentAt), "d MMM, HH:mm", { locale: ru })}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">В порядке очереди</span>
                  )}
                  
                  <div className="text-primary font-medium text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                    Подробнее <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
