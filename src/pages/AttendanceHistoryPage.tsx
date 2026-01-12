import { useEffect, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Filter,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Types ---
type AttendanceLog = {
  id: number;
  checkInTime: string;
  status: string;
  session: number; // Add session
  userId?: number; // Optional เพราะบางที API /me อาจไม่ส่งมา
  user?: {
    id: number;
    inGameName: string;
    phoneNumber: string;
  };
};

type User = {
  id: number;
  inGameName: string;
  phoneNumber: string;
  role: string;
};

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100 },
  },
};

export default function AttendanceHistoryPage() {
  // getUser() available if needed for future features
  void getUser();

  // States
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roundsConfig, setRoundsConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range (default to last 7 days)
  const [daysToShow] = useState(7);
  const [endDate, setEndDate] = useState(new Date());

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // === Load All Data for Everyone ===
        const end = endDate;
        const start = new Date(end);
        start.setDate(start.getDate() - daysToShow + 1);

        // 1. Fetch All Users
        const usersRes = await apiFetch<User[]>("/attendance/users");
        if (Array.isArray(usersRes)) {
          setUsers(
            usersRes.sort((a, b) =>
              (a.inGameName || "").localeCompare(b.inGameName || "")
            )
          );
        } else {
          setUsers([]);
        }

        // 2. Fetch All Logs in Range
        const logsRes = await apiFetch<AttendanceLog[]>(
          `/attendance?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
        );
        setLogs(logsRes);

        // 3. Fetch Rounds Config
        const settings = await apiFetch<any[]>("/admin/settings");
        const roundsSetting = settings.find(
          (s) => s.key === "attendance_rounds"
        );
        if (roundsSetting) {
          setRoundsConfig(JSON.parse(roundsSetting.value));
        } else {
          setRoundsConfig([{ id: 1 }, { id: 2 }, { id: 3 }]);
        }
      } catch (e) {
        console.error("Load Error:", e);
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [daysToShow, endDate]);

  // Utilities for Sheet
  const getDates = () => {
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      dates.push(d);
    }
    return dates;
  };

  const getDateKey = (d: Date) => d.toISOString().split("T")[0];

  // --- Logic การจับคู่ Log ---
  const getLogsForUserDate = (userId: number, date: Date) => {
    const key = getDateKey(date);

    return logs.filter((l) => {
      const logDateKey = getDateKey(new Date(l.checkInTime));
      return l.userId === userId && logDateKey === key;
    });
  };

  const handlePrevDays = () => {
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() - daysToShow);
    setEndDate(newEnd);
  };

  const handleNextDays = () => {
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + daysToShow);
    setEndDate(newEnd);
  };

  const handleResetToday = () => {
    setEndDate(new Date());
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setEndDate(new Date(e.target.value));
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const lower = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.inGameName.toLowerCase().includes(lower) ||
        u.phoneNumber.includes(lower)
    );
  }, [users, searchQuery]);

  // === RENDER ===
  const dates = getDates();

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header & Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-200">
            ตารางสรุปการเช็คชื่อ
          </h1>
          <p className="mt-1 text-slate-400">
            Attendance Sheet (Daily Summary)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/50 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-all"
            />
          </div>

          {/* Date Controls */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-sm">
            <button
              onClick={handlePrevDays}
              className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="relative group px-2">
              <input
                type="date"
                value={endDate.toISOString().split("T")[0]}
                onChange={handleDateChange}
                className="bg-transparent text-slate-300 text-sm font-medium border-none focus:ring-0 w-[110px] text-center cursor-pointer [color-scheme:dark] hover:text-teal-300 transition-colors"
              />
            </div>

            <button
              onClick={handleNextDays}
              className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button
              onClick={handleResetToday}
              className="px-3 py-1 text-xs font-medium text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 rounded-md transition-colors"
            >
              วันนี้
            </button>
          </div>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 animate-pulse">กำลังโหลดตาราง...</p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-sm"
        >
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] custom-scrollbar">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-950/90 backdrop-blur sticky top-0 z-20 shadow-lg">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-950/95 border-b border-r border-slate-800 px-4 py-4 text-left min-w-[200px] text-slate-300 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-500" />
                      <span>รายชื่อ ({filteredUsers.length})</span>
                    </div>
                  </th>
                  {dates.map((d) => (
                    <th
                      key={d.toISOString()}
                      className={cn(
                        "border-b border-slate-800 px-2 py-3 text-center min-w-[80px] transition-colors",
                        getDateKey(d) === getDateKey(new Date())
                          ? "bg-teal-500/10"
                          : ""
                      )}
                    >
                      <div
                        className={cn(
                          "text-sm font-bold",
                          getDateKey(d) === getDateKey(new Date())
                            ? "text-teal-400"
                            : "text-slate-200"
                        )}
                      >
                        {d.toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">
                        {d.toLocaleDateString("th-TH", { weekday: "short" })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={dates.length + 1}
                      className="py-20 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Filter className="w-8 h-8 opacity-20" />
                        ไม่พบข้อมูล
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <motion.tr
                      key={u.id || idx}
                      variants={itemVariants}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Sticky Name Column */}
                      <td className="sticky left-0 z-10 bg-slate-950/95 group-hover:bg-slate-900 border-r border-slate-800 px-4 py-3 font-medium text-slate-200 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.5)] transition-colors">
                        <div className="flex flex-col">
                          <span className="truncate text-sm group-hover:text-teal-200 transition-colors">
                            {u.inGameName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {u.phoneNumber}
                          </span>
                        </div>
                      </td>

                      {/* Date Columns */}
                      {dates.map((d) => {
                        const dayLogs = getLogsForUserDate(u.id, d);
                        const isToday =
                          getDateKey(d) === getDateKey(new Date());

                        // Default rounds if config missing
                        const rounds =
                          roundsConfig.length > 0
                            ? roundsConfig
                            : [{ id: 1 }, { id: 2 }, { id: 3 }];

                        return (
                          <td
                            key={d.toISOString()}
                            className={cn(
                              "px-2 py-2 text-center border-l border-slate-800/30 align-top",
                              isToday
                                ? "bg-teal-500/5 group-hover:bg-teal-500/10"
                                : ""
                            )}
                          >
                            <div className="flex flex-wrap justify-center gap-1 min-w-[60px]">
                              {rounds.map((r: any) => {
                                const log = dayLogs.find(
                                  (l) => l.session === r.id
                                );
                                let colorClass =
                                  "bg-slate-800/20 text-slate-700/30"; // Absent/Pending

                                if (log) {
                                  if (log.status === "O")
                                    colorClass =
                                      "bg-emerald-500 text-emerald-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                                  else if (log.status === "L")
                                    colorClass = "bg-amber-500 text-amber-950";
                                  else if (log.status === "A")
                                    colorClass = "bg-rose-500 text-rose-950";
                                } else if (isToday) {
                                  // Check if round passed (simple time check could move here or just keep gray)
                                }

                                return (
                                  <div
                                    key={r.id}
                                    title={
                                      log
                                        ? `${
                                            r.name || "Round " + r.id
                                          }: ${new Date(
                                            log.checkInTime
                                          ).toLocaleTimeString("th-TH")}`
                                        : `${r.name || "Round " + r.id}: -`
                                    }
                                    className={cn(
                                      "w-2 h-2 rounded-full",
                                      colorClass
                                    )}
                                  />
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))
                )}
              </tbody>

              {/* Footer Summary */}
              <tfoot className="bg-slate-900/95 backdrop-blur sticky bottom-0 z-20 border-t border-slate-800 shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.5)]">
                <tr>
                  <td className="sticky left-0 z-30 bg-slate-900/95 border-r border-slate-800 px-4 py-3 text-right text-emerald-400 text-xs font-semibold shadow-[4px_0_24px_-2px_rgba(0,0,0,0.5)]">
                    ✅ มา (Present)
                  </td>
                  {dates.map((d) => {
                    // Count all logs for that day
                    const present = logs.filter((l) => {
                      return (
                        getDateKey(new Date(l.checkInTime)) === getDateKey(d)
                      );
                    }).length;

                    return (
                      <td
                        key={d.toISOString()}
                        className="px-2 py-3 text-center text-emerald-400 font-bold text-xs bg-emerald-500/5"
                      >
                        {present}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
