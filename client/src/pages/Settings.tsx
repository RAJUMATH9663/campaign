import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { api } from "../services/api";

interface SettingsData {
  secretsConfigured: Record<string, boolean>;
  activeAiProvider: string;
  activeSmsProvider: string;
  activeWhatsappProvider: string;
}

function ConfigRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      {configured ? (
        <span className="flex items-center gap-1 text-emerald-600 text-sm">
          <CheckCircle2 className="h-4 w-4" /> Configured
        </span>
      ) : (
        <span className="flex items-center gap-1 text-slate-400 text-sm">
          <XCircle className="h-4 w-4" /> Not set
        </span>
      )}
    </div>
  );
}

export default function Settings() {
  const [data, setData] = useState<SettingsData | null>(null);

  useEffect(() => {
    api.get("/settings").then((res) => setData(res.data));
  }, []);

  return (
    <Layout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-slate-500">Active:</span>
              <Badge tone="info">{data?.activeAiProvider || "—"}</Badge>
            </div>
            <ConfigRow label="OpenAI API key" configured={!!data?.secretsConfigured.openai} />
            <ConfigRow label="Anthropic API key" configured={!!data?.secretsConfigured.anthropic} />
            <p className="text-xs text-slate-400 mt-3">
              Set AI_PROVIDER, OPENAI_API_KEY or ANTHROPIC_API_KEY in the server's .env file.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messaging Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-slate-500">SMS provider:</span>
              <Badge tone="info">{data?.activeSmsProvider || "—"}</Badge>
            </div>
            <ConfigRow label="SMS provider credentials" configured={!!data?.secretsConfigured.smsProvider} />
            <div className="flex items-center gap-2 mt-3 mb-2">
              <span className="text-sm text-slate-500">WhatsApp provider:</span>
              <Badge tone="info">{data?.activeWhatsappProvider || "—"}</Badge>
            </div>
            <ConfigRow label="WhatsApp provider credentials" configured={!!data?.secretsConfigured.whatsappProvider} />
            <p className="text-xs text-slate-400 mt-3">
              Set SMS_PROVIDER / WHATSAPP_PROVIDER and their API keys in the server's .env file.
              Defaults to a safe mock provider that does not send real messages.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>Every campaign automatically excludes contacts who:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Have not opted in for the selected channel (SMS or WhatsApp)</li>
              <li>Are on the suppression (opt-out) list</li>
              <li>Have an invalid phone number</li>
            </ul>
            <p>
              Inbound STOP / UNSUBSCRIBE replies (via your provider's webhook) automatically add the
              contact to the suppression list and revoke their opt-in status.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
