import { useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Megaphone,
  Users,
  Activity,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { AttendanceBadge } from "@/components/attendance/AttendanceBadge";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
type Announcement = {
  id: number;
  title: string;
  priority: "URGENT" | "NORMAL";
  createdAt: string;
  content?: string;
};

type DashboardStats = {
  usersTotal: number;
  checkinsToday: number;
  transactionsToday: number;
  activeAnnouncements: number;
  usersWithoutCheckin: number;
  checkinRate: number;
  attendanceDeadline?: string;
  gangBalance?: number;
};

type CheckinUser = {
  id: number;
  inGameName: string;
  phoneNumber: string;
  role: string;
  profileImageUrl?: string;
  hasCheckedIn: boolean;
  sessions?: Record<
    number,
    { status: "O" | "L" | "A" | "-" | null; checkInTime: string | null }
  >;
};

type RoundConfig = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

// --- Animations ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
    },
  },
};

const tableRowVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

// --- Formatting Helpers ---
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
};

// --- Main Component ---
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);

  const [checkinData, setCheckinData] = useState<CheckinUser[]>([]);
  const [checkinLoading, setCheckinLoading] = useState(true);
  const [checkinPage, setCheckinPage] = useState(1);
  const [checkinTotalPages, setCheckinTotalPages] = useState(1);
  const [roundsConfig, setRoundsConfig] = useState<RoundConfig[]>([]);

  // Countdown Logic
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isPastDeadline, setIsPastDeadline] = useState(false);

  const latestAnnouncement = announcements[0] ?? null;
  const otherAnnouncements = announcements.slice(1, 4);

  // Fetch stats
  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      try {
        const data = await apiFetch<DashboardStats>("/dashboard/stats");
        setStats(data);
      } catch (e) {
        setStatsError((e as any)?.message ?? "Failed to load stats");
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  // Fetch announcements
  useEffect(() => {
    (async () => {
      setAnnLoading(true);
      try {
        const data = await apiFetch<Announcement[]>("/announcements/active");
        setAnnouncements(data);
      } catch {
        // ignore
      } finally {
        setAnnLoading(false);
      }
    })();
  }, []);

  // Fetch check-in data
  useEffect(() => {
    (async () => {
      setCheckinLoading(true);
      try {
        const data = await apiFetch<{
          users: CheckinUser[];
          pagination: { totalPages: number };
          roundsConfig: RoundConfig[];
        }>(`/dashboard/checkin-status?page=${checkinPage}&limit=10`);
        setCheckinData(data.users || []);
        setCheckinTotalPages(data.pagination?.totalPages || 1);
        if (data.roundsConfig) setRoundsConfig(data.roundsConfig);
      } catch {
        // ignore
      } finally {
        setCheckinLoading(false);
      }
    })();
  }, [checkinPage]);

  // Countdown timer effect
  useEffect(() => {
    if (!stats?.attendanceDeadline) return;

    const interval = setInterval(() => {
      const now = new Date();
      const [hours, minutes] = stats.attendanceDeadline!.split(":").map(Number);
      const deadline = new Date();
      deadline.setHours(hours, minutes, 0, 0);

      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("หมดเวลาเช็คชื่อ");
        setIsPastDeadline(true);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
            .toString()
            .padStart(2, "0")}`
        );
        setIsPastDeadline(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stats?.attendanceDeadline]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto"
    >
      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-200 to-teal-100 drop-shadow-sm">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-400">ภาพรวมระบบและข้อมูลสำคัญ</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-md shadow-sm">
            <Clock className="w-4 h-4 text-teal-400" />
            {new Date().toLocaleDateString("th-TH", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          {stats?.attendanceDeadline && (
            <motion.div
              key={isPastDeadline ? "past" : "active"}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "text-sm font-mono px-3 py-1 rounded-full border shadow-[0_0_15px_rgba(0,0,0,0.2)] font-medium",
                isPastDeadline
                  ? "bg-rose-950/40 text-rose-400 border-rose-500/30"
                  : "bg-amber-950/40 text-amber-400 border-amber-500/30 animate-pulse"
              )}
            >
              {isPastDeadline
                ? "หมดเวลาเช็คชื่อ"
                : `เหลือเวลา: ${timeRemaining}`}
            </motion.div>
          )}
        </div>
      </motion.div>

      {statsError && (
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex items-center gap-3"
        >
          <Activity className="w-5 h-5 text-rose-400" />
          {statsError}
        </motion.div>
      )}

      {/* Main Grid: Stats & Announcement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats Grid (2x2 Layout) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Check-in */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <StatCard
              title="เช็คชื่อวันนี้"
              value={statsLoading ? "—" : String(stats?.checkinsToday ?? 0)}
              subtitle="User Checked In"
              icon={CheckCircle}
              className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/20 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)] h-full"
              iconClassName="text-emerald-400"
            />
          </motion.div>

          {/* Card 2: Pending */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <StatCard
              title="ยังไม่เช็คชื่อ"
              value={
                statsLoading ? "—" : String(stats?.usersWithoutCheckin ?? 0)
              }
              subtitle="Pending Check-in"
              icon={XCircle}
              className="bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500/20 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.1)] h-full"
              iconClassName="text-rose-400"
            />
          </motion.div>

          {/* Card 3: Gang Balance (Highlighted) */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-amber-500/10 rounded-xl blur-lg group-hover:bg-amber-500/20 transition-all opacity-50"></div>
            <StatCard
              title="เงินกองกลาง"
              value={
                statsLoading
                  ? "—"
                  : stats?.gangBalance
                  ? formatMoney(stats.gangBalance)
                  : "0 ฿"
              }
              subtitle="Gang Wallet Balance"
              icon={Wallet}
              className="relative bg-gradient-to-br from-amber-950/50 to-slate-900 border-amber-500/30 shadow-[0_4px_25px_-5px_rgba(251,191,36,0.15)] h-full"
              iconClassName="text-amber-400"
            />
          </motion.div>

          {/* Card 4: Transactions */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <StatCard
              title="ธุรกรรมวันนี้"
              value={statsLoading ? "—" : String(stats?.transactionsToday ?? 0)}
              subtitle="Daily Transactions"
              icon={TrendingUp}
              className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 border-slate-700/50 h-full"
              iconClassName="text-blue-400"
            />
          </motion.div>
        </div>

        {/* Right Column: Featured Announcement (Full Height) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-1 h-full"
          onClick={() => setShowAllAnnouncements(true)}
        >
          <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/20 p-6 relative overflow-hidden group shadow-lg h-full flex flex-col cursor-pointer hover:border-teal-500/50 transition-all">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-teal-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-teal-500/20 transition-all duration-700"></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
                <h3 className="text-lg font-bold text-teal-100 tracking-wide">
                  ประกาศล่าสุด
                </h3>
              </div>
              <Megaphone className="h-5 w-5 text-teal-400 animate-bounce-slow" />
            </div>

            {annLoading ? (
              <div className="text-sm text-slate-400 animate-pulse flex-1 flex items-center justify-center">
                กำลังโหลดประกาศ...
              </div>
            ) : latestAnnouncement ? (
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h2 className="text-xl font-bold text-white leading-tight line-clamp-3">
                      {latestAnnouncement.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    {latestAnnouncement.priority === "URGENT" && (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-lg shadow-rose-500/20 tracking-wider">
                        ด่วนที่สุด
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                      <Calendar className="w-3 h-3 text-slate-300" />
                      {formatDate(latestAnnouncement.createdAt)}
                    </span>
                  </div>

                  {latestAnnouncement.content && (
                    <p className="text-sm text-slate-300/80 line-clamp-4">
                      {latestAnnouncement.content}
                    </p>
                  )}
                </div>

                <div className="mt-auto pt-5 border-t border-slate-800/50 flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    ประกาศอื่นๆ
                  </h4>
                  {otherAnnouncements.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-xs text-slate-400 hover:text-teal-200 transition-colors cursor-pointer group/item"
                    >
                      <span className="truncate max-w-[200px] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover/item:bg-teal-400 transition-colors"></span>
                        {a.title}
                      </span>
                      <span className="opacity-60 text-[10px] font-mono">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                  ))}
                  {otherAnnouncements.length === 0 && (
                    <span className="text-xs text-slate-500 italic">
                      ไม่มีประกาศเพิ่มเติม
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 flex-1">
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <span className="text-sm">ยังไม่มีประกาศใหม่</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Check-in Status Table - Full Width */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 md:p-6 backdrop-blur-sm shadow-xl"
      >
        <SectionHeader
          icon={Users}
          title="สถานะการเช็คชื่อวันนี้"
          subtitle="Today's Check-in Status"
          className="mb-6"
        />

        {checkinLoading ? (
          <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            กำลังโหลดข้อมูล...
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/20">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900/80 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 md:px-6 md:py-4 md:pl-8 text-nowrap">
                      ชื่อในเกม
                    </th>
                    <th className="px-4 py-3 md:px-6 md:py-4 text-nowrap">
                      เบอร์โทร
                    </th>
                    {(roundsConfig.length > 0
                      ? roundsConfig
                      : [
                          { id: 1, name: "รอบที่ 1", startTime: "20:00" },
                          { id: 2, name: "รอบที่ 2", startTime: "21:30" },
                          { id: 3, name: "รอบที่ 3", startTime: "22:30" },
                        ]
                    ).map((round: any) => (
                      <th
                        key={round.id}
                        className="px-4 py-3 md:px-6 md:py-4 text-nowrap text-center"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>{round.name}</span>
                          {round.startTime && (
                            <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                              {round.startTime}
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <AnimatePresence mode="wait">
                    {checkinData.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-4 py-3 pl-4 md:px-6 md:py-4 md:pl-8">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-linear-to-br from-teal-600 to-teal-800 overflow-hidden shrink-0 border border-slate-700 group-hover:border-teal-500/50 transition-colors shadow-sm flex items-center justify-center">
                              <span className="text-sm md:text-lg font-bold text-white">
                                {user.inGameName?.charAt(0).toUpperCase() ||
                                  "U"}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-200 group-hover:text-teal-200 transition-colors text-sm md:text-base whitespace-nowrap">
                                {user.inGameName}
                              </span>
                              <span className="text-[10px] md:text-xs text-slate-500">
                                {user.role}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 md:px-6 md:py-4 text-slate-400 font-mono tracking-wide text-xs md:text-sm whitespace-nowrap">
                          {user.phoneNumber}
                        </td>
                        {(roundsConfig.length > 0
                          ? roundsConfig
                          : [{ id: 1 }, { id: 2 }, { id: 3 }]
                        ).map((round: any) => {
                          const session = user.sessions?.[round.id];
                          return (
                            <td
                              key={round.id}
                              className="px-4 py-3 md:px-6 md:py-4 text-center whitespace-nowrap"
                            >
                              <div className="flex justify-center">
                                <AttendanceBadge
                                  status={session ? session.status : null}
                                  time={session ? session.checkInTime : null}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {checkinData.length === 0 && (
                    <tr>
                      <td
                        colSpan={roundsConfig.length + 2}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        ไม่พบข้อมูลสมาชิก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 bg-slate-900/30 border-t border-slate-800/50">
              <div className="text-sm text-slate-500 pl-2">
                หน้าที่ {checkinPage} จาก {checkinTotalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckinPage((p) => Math.max(1, p - 1))}
                  disabled={checkinPage === 1 || checkinLoading}
                  className="h-8 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCheckinPage((p) => Math.min(checkinTotalPages, p + 1))
                  }
                  disabled={checkinPage === checkinTotalPages || checkinLoading}
                  className="h-8 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Full Screen Announcement Modal */}
      <AnimatePresence>
        {showAllAnnouncements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowAllAnnouncements(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl border border-teal-500/30 bg-slate-950 shadow-2xl relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-6 w-6 text-teal-400" />
                  <h2 className="text-xl font-bold text-slate-100">
                    ประกาศทั้งหมด
                  </h2>
                </div>
                <button
                  onClick={() => setShowAllAnnouncements(false)}
                  className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <div className="sr-only">Close</div>
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {announcements.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    ไม่มีประกาศ
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-bold text-slate-200 leading-snug">
                          {ann.title}
                        </h3>
                        {ann.priority === "URGENT" && (
                          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600/20 text-rose-400 border border-rose-600/30">
                            URGENT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(ann.createdAt)}
                      </div>

                      <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {ann.content}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
