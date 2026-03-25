import { useState, useEffect } from "react";
import {
  useListBookings,
  useUpdateBookingStatus,
  useGetMyShiftStatus,
  useClockIn,
  useClockOut,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageTransition } from "@/components/PageTransition";
import { StatusBadge } from "@/components/StatusBadge";
import { useSocket } from "@/hooks/use-socket";
import { Clock, Play, Square, Timer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function formatDuration(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function TechnicianDashboard() {
  useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useListBookings({ technicianId: user?.id });
  const statusMutation = useUpdateBookingStatus();
  const { data: shiftStatus, isLoading: shiftLoading } = useGetMyShiftStatus();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const [note, setNote] = useState("");
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [timerDisplay, setTimerDisplay] = useState("00:00:00");

  useEffect(() => {
    if (!shiftStatus?.onShift || !shiftStatus?.session?.clockIn) return;
    const update = () => setTimerDisplay(formatDuration(shiftStatus.session!.clockIn));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [shiftStatus?.onShift, shiftStatus?.session?.clockIn]);

  const handleClockIn = () => {
    clockInMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/time-tracking/my-status"] });
      },
    });
  };

  const handleClockOut = () => {
    clockOutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/time-tracking/my-status"] });
      },
    });
  };

  const handleStatusChange = (id: number, toStatus: string) => {
    statusMutation.mutate({ id, data: { to: toStatus as "accepted" | "diagnosing" | "repairing" | "ready" | "closed", note } }, {
      onSuccess: () => {
        setNote("");
        setActiveBookingId(null);
      }
    });
  };

  return (
    <PageTransition className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-display font-bold mb-8">Рабочий стол инженера</h1>

      <div className={`rounded-2xl p-6 mb-8 border shadow-sm transition-all ${
        shiftStatus?.onShift
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-slate-200"
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              shiftStatus?.onShift ? "bg-emerald-100" : "bg-slate-100"
            }`}>
              {shiftStatus?.onShift ? (
                <Timer className="w-6 h-6 text-emerald-600" />
              ) : (
                <Clock className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {shiftLoading ? "Загрузка..." : shiftStatus?.onShift ? "Вы на смене" : "Вы не на смене"}
              </h2>
              {shiftStatus?.onShift && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-2xl font-mono font-bold text-emerald-700">{timerDisplay}</span>
                </div>
              )}
              {!shiftStatus?.onShift && !shiftLoading && (
                <p className="text-sm text-slate-500">Нажмите кнопку, чтобы начать рабочую смену</p>
              )}
            </div>
          </div>
          <div>
            {shiftStatus?.onShift ? (
              <button
                onClick={handleClockOut}
                disabled={clockOutMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Square className="w-4 h-4" />
                {clockOutMutation.isPending ? "Завершение..." : "Завершить смену"}
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={shiftLoading || clockInMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Play className="w-4 h-4" />
                {clockInMutation.isPending ? "Начинаем..." : "Начать смену"}
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : bookings?.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-slate-100">
          <p className="text-slate-500">Нет назначенных устройств.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings?.map(b => (
            <div key={b.id} className="bg-white rounded-2xl p-6 shadow-md shadow-slate-200/50 border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{b.device}</h3>
                  <p className="text-sm font-mono text-slate-500">Код: {b.code}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl text-sm mb-6">
                <span className="font-semibold block mb-1">Заявленная неисправность:</span>
                {b.issue}
              </div>

              {b.status !== 'closed' && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Изменить статус:</p>
                  
                  {activeBookingId === b.id && (
                    <input 
                      type="text"
                      placeholder="Комментарий для клиента (опционально)"
                      className="w-full mb-3 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-primary"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                  )}

                  <div className="flex flex-wrap gap-2">
                    {['diagnosing', 'repairing', 'ready'].filter(s => s !== b.status).map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          if (activeBookingId !== b.id) setActiveBookingId(b.id);
                          else handleStatusChange(b.id, status);
                        }}
                        disabled={statusMutation.isPending && activeBookingId === b.id}
                        className="px-4 py-2 text-sm font-medium border border-primary/20 text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {activeBookingId === b.id ? `Подтвердить: ${status}` : `Перевести в ${status}`}
                      </button>
                    ))}
                    {activeBookingId === b.id && (
                      <button onClick={() => setActiveBookingId(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800">
                        Отмена
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
