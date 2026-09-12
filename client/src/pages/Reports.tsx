import { useEffect, useState } from "react";
import { Download, BarChart3 } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge, statusTone } from "../components/ui/Badge";
import { EmptyState } from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeleton";
import { api } from "../services/api";
import { formatDate } from "../lib/utils";

interface MessageRow {
  id: string;
  status: string;
  channel: string;
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
  contact: { name: string; phone: string };
  campaign: { name: string };
}

const STATUS_FILTERS = ["", "SENT", "DELIVERED", "FAILED", "PENDING", "QUEUED"];

export default function Reports() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/messages", { params: { status: status || undefined } });
      setMessages(data.messages);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function exportAs(format: "csv" | "xlsx") {
    window.open(
      `${api.defaults.baseURL}/reports/messages/export?format=${format}`,
      "_blank"
    );
  }

  return (
    <Layout title="Delivery Reports">
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                status === s
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportAs("csv")}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAs("xlsx")}>
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : messages.length === 0 ? (
            <EmptyState icon={BarChart3} title="No delivery data yet" description="Send a campaign to see delivery status here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-4">Contact</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Channel</th>
                    <th className="py-2 pr-4">Campaign</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Sent At</th>
                    <th className="py-2 pr-4">Delivered At</th>
                    <th className="py-2 pr-4">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-2 pr-4">{m.contact.name}</td>
                      <td className="py-2 pr-4 text-slate-500">{m.contact.phone}</td>
                      <td className="py-2 pr-4">{m.channel}</td>
                      <td className="py-2 pr-4">{m.campaign.name}</td>
                      <td className="py-2 pr-4">
                        <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-slate-500">{formatDate(m.sentAt)}</td>
                      <td className="py-2 pr-4 text-slate-500">{formatDate(m.deliveredAt)}</td>
                      <td className="py-2 pr-4 text-red-500">{m.error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-3">Showing {messages.length} of {total} messages</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
