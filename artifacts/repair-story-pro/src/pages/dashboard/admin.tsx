import { useState, useEffect } from "react";
import {
  useListBookings,
  useUpdateBookingStatus,
  useAssignTechnician,
  useListTechnicians,
  useGetBooking,
} from "@workspace/api-client-react";
import { PageTransition } from "@/components/PageTransition";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Download,
  FileText,
  Search,
  X,
  ChevronRight,
  Clock,
  Package,
  Users,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Wrench,
  Eye,
  Calendar,
  Mail,
  User,
  RefreshCw,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  accepted: "Принят",
  diagnosing: "Диагностика",
  repairing: "В ремонте",
  ready: "Готов",
  closed: "Выдан",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ["accepted"],
  accepted: ["diagnosing"],
  diagnosing: ["repairing"],
  repairing: ["ready"],
  ready: ["closed"],
};

type TabType = "bookings" | "users" | "technicians";

interface StatsData {
  total: number;
  statusCounts: Record<string, number>;
  todayCount: number;
  activeCount: number;
}

interface BookingWithClient {
  id: number;
  code: string;
  device: string;
  issue: string;
  status: string;
  appointmentAt: string | null;
  clientId: number;
  technicianId: number | null;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientEmail: string;
}

interface UserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function AdminDashboard() {
  useSocket();

  const [activeTab, setActiveTab] = useState<TabType>("bookings");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("");

  const [stats, setStats] = useState<StatsData | null>(null);
  const [allBookings, setAllBookings] = useState<BookingWithClient[]>([]);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const { data: technicians } = useListTechnicians();
  const assignMutation = useAssignTechnician();
  const statusMutation = useUpdateBookingStatus();

  const { data: selectedBookingData } = useGetBooking(selectedBookingId!, {
    // @ts-expect-error orval generates strict UseQueryOptions requiring queryKey, but the hook provides it internally
    query: { enabled: !!selectedBookingId },
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("repair_story_token");
      const res = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const token = localStorage.getItem("repair_story_token");
      const res = await fetch("/api/bookings-with-clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAllBookings(await res.json());
    } catch (e) {
      console.error("Failed to fetch bookings:", e);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("repair_story_token");
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAllUsers(await res.json());
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBookings();
  }, []);

  useEffect(() => {
    if (activeTab === "users" || activeTab === "technicians") {
      fetchUsers();
    }
  }, [activeTab]);

  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem("repair_story_token");
      const res = await fetch("/api/export/csv", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPdf = async (id: number, code: string) => {
    try {
      const token = localStorage.getItem("repair_story_token");
      const res = await fetch(`/api/export/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repair-${code}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = (bookingId: number, toStatus: string) => {
    setChangingStatusId(bookingId);
    setTargetStatus(toStatus);
    setStatusNote("");
  };

  const confirmStatusChange = () => {
    if (!changingStatusId || !targetStatus) return;
    statusMutation.mutate(
      { id: changingStatusId, data: { to: targetStatus as "accepted" | "diagnosing" | "repairing" | "ready" | "closed", note: statusNote || undefined } },
      {
        onSuccess: () => {
          setChangingStatusId(null);
          setTargetStatus("");
          setStatusNote("");
          fetchBookings();
          fetchStats();
        },
      }
    );
  };

  const handleAssign = (bookingId: number, technicianId: number) => {
    assignMutation.mutate(
      { id: bookingId, data: { technicianId } },
      { onSuccess: () => fetchBookings() }
    );
  };

  const filteredBookings = allBookings.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.code.toLowerCase().includes(q) ||
        b.device.toLowerCase().includes(q) ||
        b.issue.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.clientEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredUsers =
    activeTab === "technicians"
      ? allUsers.filter((u) => u.role === "technician")
      : allUsers;

  const technicianWorkload: Record<number, { name: string; count: number; active: number }> = {};
  for (const b of allBookings) {
    if (b.technicianId) {
      if (!technicianWorkload[b.technicianId]) {
        const tech = technicians?.find((t) => t.id === b.technicianId);
        technicianWorkload[b.technicianId] = {
          name: tech?.name || `Техник #${b.technicianId}`,
          count: 0,
          active: 0,
        };
      }
      technicianWorkload[b.technicianId].count++;
      if (!["closed", "ready"].includes(b.status)) {
        technicianWorkload[b.technicianId].active++;
      }
    }
  }

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Панель администратора</h1>
          <p className="text-slate-500 mt-1">ТехноДимак — управление сервисным центром</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchBookings(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Обновить
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 font-medium rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Download className="w-4 h-4" /> Экспорт CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-700" />
            </div>
            <span className="text-sm text-slate-500">Всего заявок</span>
          </div>
          <p className="text-3xl font-bold">{loadingStats ? "..." : stats?.total || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-slate-500">В работе</span>
          </div>
          <p className="text-3xl font-bold">{loadingStats ? "..." : stats?.activeCount || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-500">Готовы к выдаче</span>
          </div>
          <p className="text-3xl font-bold">{loadingStats ? "..." : stats?.statusCounts?.["ready"] || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500">Сегодня</span>
          </div>
          <p className="text-3xl font-bold">{loadingStats ? "..." : stats?.todayCount || 0}</p>
        </div>
      </div>

      {/* Status breakdown bar */}
      {stats && stats.total > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Распределение по статусам</h3>
          <div className="flex rounded-full overflow-hidden h-3 bg-slate-100">
            {Object.entries(stats.statusCounts).map(([status, count]) => {
              const pct = (count / stats.total) * 100;
              const colors: Record<string, string> = {
                new: "bg-slate-400",
                accepted: "bg-emerald-600",
                diagnosing: "bg-amber-400",
                repairing: "bg-purple-400",
                ready: "bg-emerald-400",
                closed: "bg-gray-300",
              };
              return (
                <div
                  key={status}
                  className={`${colors[status] || "bg-slate-300"} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${STATUS_LABELS[status]}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${statusFilter === status ? "text-primary" : "text-slate-500 hover:text-slate-700"}`}
              >
                <StatusBadge status={status} /> {count}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {[
          { key: "bookings" as TabType, label: "Заявки", icon: Package },
          { key: "users" as TabType, label: "Пользователи", icon: Users },
          { key: "technicians" as TabType, label: "Мастера", icon: Wrench },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по коду, устройству, клиенту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-sm min-w-[160px]"
            >
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="text-sm text-slate-500 mb-3">
            Показано: {filteredBookings.length} из {allBookings.length}
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Код</th>
                    <th className="px-4 py-3 font-medium">Устройство / Проблема</th>
                    <th className="px-4 py-3 font-medium">Клиент</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Мастер</th>
                    <th className="px-4 py-3 font-medium">Дата</th>
                    <th className="px-4 py-3 font-medium text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loadingBookings ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">Загрузка...</td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        {searchQuery || statusFilter ? "Ничего не найдено" : "Нет заявок"}
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const nextStatuses = VALID_TRANSITIONS[b.status] || [];
                      const assignedTech = technicians?.find((t) => t.id === b.technicianId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg">
                              {b.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[250px]">
                            <div className="font-semibold text-slate-900 truncate">{b.device}</div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">{b.issue}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-800 font-medium text-xs">{b.clientName}</div>
                            <div className="text-xs text-slate-400">{b.clientEmail}</div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="bg-transparent border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary min-w-[120px]"
                              value={b.technicianId || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val) handleAssign(b.id, val);
                              }}
                            >
                              <option value="">Не назначен</option>
                              {technicians?.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            <div>{format(new Date(b.createdAt), "dd.MM.yyyy", { locale: ru })}</div>
                            <div className="text-slate-400">{format(new Date(b.createdAt), "HH:mm")}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {nextStatuses.map((ns) => (
                                <button
                                  key={ns}
                                  onClick={() => handleStatusChange(b.id, ns)}
                                  className="px-2.5 py-1 text-xs font-medium border border-primary/20 text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-lg transition-colors whitespace-nowrap"
                                  title={`Перевести в: ${STATUS_LABELS[ns]}`}
                                >
                                  {STATUS_LABELS[ns]}
                                </button>
                              ))}
                              <button
                                onClick={() => setSelectedBookingId(b.id)}
                                className="p-1.5 text-slate-400 hover:text-primary bg-white rounded-lg border shadow-sm hover:shadow transition-all"
                                title="Подробнее"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExportPdf(b.id, b.code)}
                                className="p-1.5 text-slate-400 hover:text-primary bg-white rounded-lg border shadow-sm hover:shadow transition-all"
                                title="Скачать PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Users Tab */}
      {(activeTab === "users" || activeTab === "technicians") && (
        <>
          {activeTab === "technicians" && Object.keys(technicianWorkload).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {Object.entries(technicianWorkload).map(([id, data]) => (
                <div key={id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{data.name}</p>
                      <p className="text-xs text-slate-400">Мастер</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-2xl font-bold">{data.active}</p>
                      <p className="text-xs text-slate-500">В работе</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-400">{data.count}</p>
                      <p className="text-xs text-slate-500">Всего</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Имя</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Роль</th>
                    <th className="px-4 py-3 font-medium">Зарегистрирован</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">Загрузка...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">Нет пользователей</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">#{u.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-500" />
                            </div>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> {u.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                              u.role === "admin"
                                ? "bg-red-50 text-red-600 border-red-200"
                                : u.role === "technician"
                                ? "bg-purple-50 text-purple-600 border-purple-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {u.role === "admin" ? "Администратор" : u.role === "technician" ? "Мастер" : "Клиент"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {format(new Date(u.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Status Change Modal */}
      {changingStatusId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Изменение статуса</h3>
              <button onClick={() => setChangingStatusId(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Перевести заявку в статус: <span className="font-semibold">{STATUS_LABELS[targetStatus]}</span>
            </p>
            <textarea
              placeholder="Комментарий для клиента (необязательно)"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none h-24 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setChangingStatusId(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={statusMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {statusMutation.isPending ? "Сохранение..." : "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Side Panel */}
      {selectedBookingId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
          <div
            className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold">Детали заявки</h3>
              <button
                onClick={() => setSelectedBookingId(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedBookingData ? (
              <div className="p-6 space-y-6">
                {/* Booking Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg">
                      {selectedBookingData.booking.code}
                    </span>
                    <StatusBadge status={selectedBookingData.booking.status} />
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div>
                      <span className="text-xs text-slate-500 block">Оборудование</span>
                      <span className="font-semibold">{selectedBookingData.booking.device}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Описание проблемы</span>
                      <span className="text-sm text-slate-700">{selectedBookingData.booking.issue}</span>
                    </div>
                    {selectedBookingData.booking.appointmentAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                          {format(
                            new Date(selectedBookingData.booking.appointmentAt),
                            "d MMMM yyyy, HH:mm",
                            { locale: ru }
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      Создана: {format(new Date(selectedBookingData.booking.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                    </div>
                  </div>

                  {/* Actions */}
                  {VALID_TRANSITIONS[selectedBookingData.booking.status]?.length > 0 && (
                    <div className="bg-primary/5 rounded-xl p-4">
                      <p className="text-xs font-medium text-slate-500 mb-2">Следующий статус:</p>
                      <div className="flex flex-wrap gap-2">
                        {VALID_TRANSITIONS[selectedBookingData.booking.status].map((ns) => (
                          <button
                            key={ns}
                            onClick={() => {
                              setSelectedBookingId(null);
                              handleStatusChange(selectedBookingData.booking.id, ns);
                            }}
                            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 inline mr-1" />
                            {STATUS_LABELS[ns]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assign technician */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Назначить мастера:</p>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
                      value={selectedBookingData.booking.technicianId || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val) handleAssign(selectedBookingData.booking.id, val);
                      }}
                    >
                      <option value="">Не назначен</option>
                      {technicians?.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleExportPdf(selectedBookingData.booking.id, selectedBookingData.booking.code)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" /> Скачать PDF отчёт
                  </button>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> История изменений
                  </h4>
                  {selectedBookingData.logs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Нет записей</p>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 pb-2">
                      {selectedBookingData.logs.map((log) => (
                        <div key={log.id} className="relative pl-6">
                          <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white shadow-sm" />
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge status={log.toStatus} />
                              <span className="text-xs text-slate-400">
                                от {log.fromStatus ? STATUS_LABELS[log.fromStatus] || log.fromStatus : "—"}
                              </span>
                            </div>
                            {log.note && <p className="text-sm text-slate-600 mt-1">{log.note}</p>}
                            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                              <span>{log.byUserName}</span>
                              <span>{format(new Date(log.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">Загрузка...</div>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
