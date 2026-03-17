import { useState } from "react";
import { useListBookings, useUpdateBookingStatus } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageTransition } from "@/components/PageTransition";
import { StatusBadge } from "@/components/StatusBadge";
import { useSocket } from "@/hooks/use-socket";

export default function TechnicianDashboard() {
  useSocket();
  const { user } = useAuth();
  const { data: bookings, isLoading } = useListBookings({ technicianId: user?.id });
  const statusMutation = useUpdateBookingStatus();

  const [note, setNote] = useState("");
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);

  const handleStatusChange = (id: number, toStatus: string) => {
    statusMutation.mutate({ id, data: { to: toStatus as any, note } }, {
      onSuccess: () => {
        setNote("");
        setActiveBookingId(null);
      }
    });
  };

  return (
    <PageTransition className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-display font-bold mb-8">Рабочий стол инженера</h1>
      
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
                <StatusBadge status={b.status as any} />
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
