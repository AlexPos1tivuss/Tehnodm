import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateBooking, useGetCalendarSlots } from "@workspace/api-client-react";
import { PageTransition } from "@/components/PageTransition";
import { format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, Smartphone, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewBooking() {
  const [, setLocation] = useLocation();
  const createMutation = useCreateBooking();
  
  const [device, setDevice] = useState("");
  const [issue, setIssue] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { data: slots, isLoading: slotsLoading } = useGetCalendarSlots(
    { date: selectedDate },
    // @ts-expect-error orval generates strict UseQueryOptions requiring queryKey, but the hook provides it internally
    { query: { enabled: !!selectedDate } }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let appointmentAt = null;
    if (selectedDate && selectedTime) {
      appointmentAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
    }

    try {
      const res = await createMutation.mutateAsync({
        data: { device, issue, appointmentAt }
      });
      // Redirect to tracking or dashboard
      setLocation(`/track?code=${res.code}`);
    } catch (error) {
      console.error(error);
    }
  };

  const dates = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, 'yyyy-MM-dd'),
      label: format(d, 'd MMM', { locale: ru }),
      day: format(d, 'EEEE', { locale: ru })
    };
  });

  return (
    <PageTransition className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold mb-4">Оформление ремонта</h1>
        <p className="text-slate-600">Опишите проблему, и мы подготовимся к вашему визиту</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Smartphone className="w-5 h-5 text-primary" /> Что сломалось?
          </h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Устройство (модель)</label>
              <input
                type="text"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                placeholder="iPhone 13 Pro"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Описание проблемы</label>
              <textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Разбит экран, не заряжается..."
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <CalendarIcon className="w-5 h-5 text-primary" /> Выберите время визита (необязательно)
          </h2>
          
          <div className="flex overflow-x-auto gap-3 pb-4 mb-4 hide-scrollbar">
            {dates.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => { setSelectedDate(d.value); setSelectedTime(null); }}
                className={cn(
                  "flex-shrink-0 px-5 py-3 rounded-2xl border transition-all text-left",
                  selectedDate === d.value 
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className={cn("text-xs mb-1 capitalize", selectedDate === d.value ? "text-primary font-medium" : "text-slate-500")}>
                  {d.day}
                </div>
                <div className={cn("font-bold", selectedDate === d.value ? "text-primary" : "text-slate-900")}>
                  {d.label}
                </div>
              </button>
            ))}
          </div>

          <div className="min-h-[150px]">
            {slotsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : slots && slots.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={cn(
                      "py-2 rounded-xl text-sm font-medium border transition-all",
                      !slot.available && "opacity-50 cursor-not-allowed bg-slate-100 border-transparent text-slate-400",
                      slot.available && selectedTime !== slot.time && "border-slate-200 hover:border-primary/50 hover:bg-primary/5",
                      selectedTime === slot.time && "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                Нет свободных слотов на эту дату
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-8 py-4 bg-primary text-white rounded-full font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-2 disabled:opacity-70 disabled:transform-none"
          >
            {createMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Подтвердить запись"}
          </button>
        </div>
      </form>
    </PageTransition>
  );
}
