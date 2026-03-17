import { useState } from "react";
import { useListBookings, useUpdateBookingStatus, useAssignTechnician, useListTechnicians, useExportCsv, useExportPdf } from "@workspace/api-client-react";
import { PageTransition } from "@/components/PageTransition";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Download, FileText, Settings, User } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";

export default function AdminDashboard() {
  useSocket();
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  const { data: bookings, isLoading } = useListBookings({ status: statusFilter as any || undefined });
  const { data: technicians } = useListTechnicians();
  const assignMutation = useAssignTechnician();
  const statusMutation = useUpdateBookingStatus();
  
  const csvMutation = useExportCsv({ query: { enabled: false } });
  
  const handleExportCsv = async () => {
    try {
      const { data } = await csvMutation.refetch();
      if (data) {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
      }
    } catch (e) { console.error(e); }
  };

  const handleExportPdf = async (id: number, code: string) => {
    try {
      // Direct fetch for blob to avoid query hooks type issues with binary data
      const token = localStorage.getItem("repair_story_token");
      const res = await fetch(`/api/export/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repair-${code}.pdf`;
      a.click();
    } catch (e) { console.error(e); }
  };

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Панель администратора</h1>
          <p className="text-slate-500">Управление всеми заказами</p>
        </div>
        
        <div className="flex gap-3">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary"
          >
            <option value="">Все статусы</option>
            <option value="new">Новые</option>
            <option value="accepted">Приняты</option>
            <option value="diagnosing">Диагностика</option>
            <option value="repairing">В ремонте</option>
            <option value="ready">Готовы</option>
            <option value="closed">Закрыты</option>
          </select>
          
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 font-medium rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                <th className="px-6 py-4 font-medium">Код / Устройство</th>
                <th className="px-6 py-4 font-medium">Статус</th>
                <th className="px-6 py-4 font-medium">Мастер</th>
                <th className="px-6 py-4 font-medium">Создано</th>
                <th className="px-6 py-4 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Загрузка...</td></tr>
              ) : bookings?.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{b.device}</div>
                    <div className="font-mono text-xs text-slate-500 mt-1">{b.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={b.status as any} />
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="bg-transparent border border-slate-200 rounded p-1 text-xs outline-none"
                      value={b.technicianId || ""}
                      onChange={(e) => assignMutation.mutate({ id: b.id, data: { technicianId: parseInt(e.target.value) }})}
                    >
                      <option value="">Не назначен</option>
                      {technicians?.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {format(new Date(b.createdAt), "dd.MM.yyyy", { locale: ru })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        className="bg-primary/5 text-primary border border-primary/20 rounded-lg px-2 py-1 text-xs outline-none font-medium"
                        value={b.status}
                        onChange={(e) => statusMutation.mutate({ id: b.id, data: { to: e.target.value as any, note: "Статус изменен админом" }})}
                      >
                        <option value="new" disabled>Новый</option>
                        <option value="accepted">Принять</option>
                        <option value="diagnosing">На диагностику</option>
                        <option value="repairing">В ремонт</option>
                        <option value="ready">Готов</option>
                        <option value="closed">Выдать</option>
                      </select>
                      
                      <button 
                        onClick={() => handleExportPdf(b.id, b.code)}
                        className="p-1.5 text-slate-400 hover:text-primary bg-white rounded-lg border shadow-sm hover:shadow"
                        title="Скачать PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
