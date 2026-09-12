import { useState } from "react";
import { Sparkles, Copy, RefreshCw } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";
import { api } from "../services/api";

const QUICK_ACTIONS = [
  { key: "improve", label: "Improve" },
  { key: "professional", label: "Make professional" },
  { key: "promotional", label: "Make promotional" },
  { key: "shorten", label: "Make shorter" },
  { key: "friendly", label: "Make friendly" },
  { key: "translate", label: "Translate" },
];

export default function AIAssistant() {
  const [input, setInput] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function generate(action = "generate", text = input) {
    if (!text.trim()) return push("error", "Type something first");
    setLoading(true);
    try {
      const { data } = await api.post("/ai/generate", { action, input: text, count: 3 });
      setVariations(data.variations);
    } catch (err: any) {
      push("error", err?.response?.data?.error || "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    push("success", "Copied to clipboard");
  }

  return (
    <Layout title="AI Assistant">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand-500" /> Describe your message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={5}
              placeholder='e.g. "Create a professional promotional message for our new service."'
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button onClick={() => generate("generate")} disabled={loading}>
              {loading ? "Generating…" : "Generate 3 variations"}
            </Button>
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-2">
                Or apply an action to text you've already generated:
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((a) => (
                  <Button
                    key={a.key}
                    size="sm"
                    variant="outline"
                    disabled={loading || variations.length === 0}
                    onClick={() => generate(a.key, variations[0])}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              The AI only suggests text here — nothing is ever sent to contacts without your
              explicit confirmation in the campaign wizard.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {variations.length === 0 && (
              <p className="text-sm text-slate-400">Generated message variations will appear here.</p>
            )}
            {variations.map((v, i) => (
              <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-2">
                <p>{v}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(v)}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => generate("improve", v)}>
                    <RefreshCw className="h-3.5 w-3.5" /> Improve further
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
