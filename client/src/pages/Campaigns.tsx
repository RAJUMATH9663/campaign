import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Plus } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge, statusTone } from "../components/ui/Badge";
import { EmptyState } from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeleton";
import { api } from "../services/api";
import { formatDate } from "../lib/utils";

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  createdAt: string;
  _count: { messages: number; recipients: number };
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/campaigns")
      .then((res) => setCampaigns(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Campaigns">
      <div className="flex justify-end mb-4">
        <Link to="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No campaigns yet"
              description="Create your first campaign to start messaging your contacts."
              action={
                <Link to="/campaigns/new">
                  <Button>
                    <Plus className="h-4 w-4" /> Create Campaign
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Channel</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Recipients</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="py-2.5 pr-4">
                        <Link to={`/campaigns/${c.id}`} className="font-medium text-brand-600 dark:text-brand-400">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">{c.channel}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                      </td>
                      <td className="py-2.5 pr-4">{c._count.recipients}</td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
