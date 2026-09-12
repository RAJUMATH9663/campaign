import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Play, Pause, XCircle } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge, statusTone } from "../components/ui/Badge";
import { TableSkeleton } from "../components/Skeleton";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/ui/Toast";
import { api } from "../services/api";
import { formatDate } from "../lib/utils";

interface CampaignDetailData {
  id: string;
  name: string;
  channel: string;
  status: string;
  message: string;
  recipients: { id: string; eligible: boolean; excludeReason?: string; contact: { name: string; phone: string } }[];
  messages: { id: string; status: string; sentAt?: string; error?: string; contact?: any }[];
}

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<CampaignDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<"launch" | "cancel" | null>(null);
  const { push } = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/campaigns/${id}`);
      setCampaign(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action: "launch" | "pause" | "resume" | "cancel") {
    try {
      await api.post(`/campaigns/${id}/${action}`);
      push("success", `Campaign ${action === "launch" ? "sending started" : action + "d"}`);
      load();
    } catch (err: any) {
      push("error", err?.response?.data?.error || "Action failed");
    }
  }

  if (loading || !campaign) {
    return (
      <Layout title="Campaign">
        <TableSkeleton rows={8} cols={4} />
      </Layout>
    );
  }

  const eligible = campaign.recipients.filter((r) => r.eligible);
  const excluded = campaign.recipients.filter((r) => !r.eligible);

  return (
    <Layout title={campaign.name}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
          <span className="text-sm text-slate-500 dark:text-slate-400">{campaign.channel}</span>
        </div>
        <div className="flex gap-2">
          {["DRAFT", "SCHEDULED"].includes(campaign.status) && (
            <Button onClick={() => setConfirmAction("launch")}>
              <Play className="h-4 w-4" /> Send Now
            </Button>
          )}
          {campaign.status === "RUNNING" && (
            <Button variant="outline" onClick={() => act("pause")}>
              <Pause className="h-4 w-4" /> Pause
            </Button>
          )}
          {campaign.status === "PAUSED" && (
            <Button onClick={() => act("resume")}>
              <Play className="h-4 w-4" /> Resume
            </Button>
          )}
          {["DRAFT", "SCHEDULED", "RUNNING", "PAUSED"].includes(campaign.status) && (
            <Button variant="danger" onClick={() => setConfirmAction("cancel")}>
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{campaign.message}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Eligible recipients ({eligible.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {eligible.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span>{r.contact.name}</span>
                <span className="text-slate-500">{r.contact.phone}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Excluded ({excluded.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {excluded.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span>{r.contact.name}</span>
                <span className="text-xs text-red-500">{r.excludeReason}</span>
              </div>
            ))}
            {excluded.length === 0 && <p className="text-sm text-slate-400">None excluded</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery status</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Sent At</th>
                <th className="py-2 pr-4">Error</th>
              </tr>
            </thead>
            <tbody>
              {campaign.messages.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800/60">
                  <td className="py-2 pr-4">{m.contact?.name || "—"}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                  </td>
                  <td className="py-2 pr-4 text-slate-500">{formatDate(m.sentAt)}</td>
                  <td className="py-2 pr-4 text-red-500">{m.error || "—"}</td>
                </tr>
              ))}
              {campaign.messages.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No messages sent yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction === "launch"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => act("launch")}
        title="Send campaign now?"
        message={`This will send messages to ${eligible.length} eligible recipient(s) via ${campaign.channel}. This action cannot be undone.`}
        confirmLabel="Send Now"
      />
      <ConfirmDialog
        open={confirmAction === "cancel"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => act("cancel")}
        title="Cancel campaign?"
        message="Any pending or queued messages will not be sent."
        confirmLabel="Cancel Campaign"
        danger
      />
    </Layout>
  );
}
