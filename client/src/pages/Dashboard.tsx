import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Megaphone,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Layout } from "../components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Skeleton } from "../components/Skeleton";
import { api } from "../services/api";

interface DashboardStats {
  totalContacts: number;
  validContacts: number;
  campaignCount: number;
  messagesSent: number;
  delivered: number;
  failed: number;
  pending: number;
  sentOverTime: { day: string; count: number }[];
  channelSplit: { channel: string; count: number }[];
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  icon: any;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
              {value.toLocaleString()}
            </p>
          )}
        </div>
        <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/reports/dashboard-stats")
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  const s = stats || {
    totalContacts: 0,
    validContacts: 0,
    campaignCount: 0,
    messagesSent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    sentOverTime: [],
    channelSplit: [],
  };

  const deliveryPieData = [
    { name: "Delivered", value: s.delivered },
    { name: "Failed", value: s.failed },
    { name: "Pending", value: s.pending },
  ].filter((d) => d.value > 0);

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Contacts" value={s.totalContacts} icon={Users} loading={loading} />
        <StatCard label="Valid Contacts" value={s.validContacts} icon={UserCheck} loading={loading} />
        <StatCard label="Campaigns" value={s.campaignCount} icon={Megaphone} loading={loading} />
        <StatCard label="Messages Sent" value={s.messagesSent} icon={Send} loading={loading} />
        <StatCard label="Delivered" value={s.delivered} icon={CheckCircle2} loading={loading} />
        <StatCard label="Failed" value={s.failed} icon={XCircle} loading={loading} />
        <StatCard label="Pending" value={s.pending} icon={Clock} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Messages sent over time</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : s.sentOverTime.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No messages sent yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.sentOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="day" fontSize={12} stroke="currentColor" opacity={0.5} />
                  <YAxis fontSize={12} stroke="currentColor" opacity={0.5} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : deliveryPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deliveryPieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {deliveryPieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>SMS vs WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : s.channelSplit.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.channelSplit}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="channel" fontSize={12} stroke="currentColor" opacity={0.5} />
                  <YAxis fontSize={12} stroke="currentColor" opacity={0.5} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
