import { useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeleton";
import { useToast } from "../components/ui/Toast";
import { api } from "../services/api";

interface Template {
  id: string;
  name: string;
  channel: string;
  content: string;
  variables: string[];
  status: string;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "SMS", content: "" });
  const { push } = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/templates");
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/templates", form);
      push("success", "Template created");
      setOpen(false);
      setForm({ name: "", channel: "SMS", content: "" });
      load();
    } catch (err: any) {
      push("error", err?.response?.data?.error || "Failed to create template");
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/templates/${id}`);
      push("success", "Template deleted");
      load();
    } catch {
      push("error", "Failed to delete template");
    }
  }

  return (
    <Layout title="Message Templates">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              icon={FileText}
              title="No templates yet"
              description="Save reusable message templates to speed up future campaigns."
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" /> New Template
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100">{t.name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => remove(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
                <div className="flex gap-1 mb-2">
                  <Badge>{t.channel}</Badge>
                  <Badge tone={t.status === "ACTIVE" ? "success" : "default"}>{t.status}</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{t.content}</p>
                {t.variables.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {t.variables.map((v) => (
                      <Badge key={v} tone="info">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Template"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="template-form">
              Save Template
            </Button>
          </>
        }
      >
        <form id="template-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label>Template name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Channel</Label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
            >
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
          <div>
            <Label>Message content</Label>
            <Textarea
              rows={4}
              required
              placeholder="Hello {{name}}, thank you for choosing our service."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
