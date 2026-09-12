import { useEffect, useRef, useState } from "react";
import { Upload, Plus, Search, Trash2, Pencil, Users } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeleton";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/ui/Toast";
import { api } from "../services/api";
import { formatDate } from "../lib/utils";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  whatsappOptIn: boolean;
  smsOptIn: boolean;
  tags: string[];
  isValid: boolean;
  createdAt: string;
}

interface ImportRowResult {
  name: string;
  phone: string;
  normalizedPhone: string | null;
  isValid: boolean;
  isDuplicateInFile: boolean;
  errors: string[];
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    engine?: string;
    elapsedMicroseconds?: number;
    totalRows: number;
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
    rows: ImportRowResult[];
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();
  const pageSize = 10;

  const [form, setForm] = useState({ name: "", phone: "", email: "", smsOptIn: true, whatsappOptIn: true, tags: "" });

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/contacts", { params: { search, page, pageSize } });
      setContacts(data.contacts);
      setTotal(data.total);
    } catch {
      push("error", "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/contacts/import/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportPreview(data);
      setImportOpen(true);
    } catch (err: any) {
      push("error", err?.response?.data?.error || "Failed to parse file");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmImport() {
    if (!importPreview) return;
    try {
      const { data } = await api.post("/contacts/import/commit", { rows: importPreview.rows });
      push("success", `Imported ${data.imported} new contacts`);
      setImportOpen(false);
      setImportPreview(null);
      load();
    } catch (err: any) {
      push("error", err?.response?.data?.error || "Import failed");
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/contacts", {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      push("success", "Contact added");
      setAddOpen(false);
      setForm({ name: "", phone: "", email: "", smsOptIn: true, whatsappOptIn: true, tags: "" });
      load();
    } catch (err: any) {
      push("error", err?.response?.data?.error || "Failed to add contact");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/contacts/${deleteId}`);
      push("success", "Contact deleted");
      load();
    } catch {
      push("error", "Failed to delete contact");
    }
  }

  async function handleDeleteAll() {
    try {
      const { data } = await api.delete("/contacts/all");
      push("success", `Deleted all ${data.count ?? total} contacts`);
      setDeleteAllOpen(false);
      setPage(1);
      load();
    } catch (err: any) {
      push("error", err?.response?.data?.error || "Failed to delete contacts");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Layout title="Contacts">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name, phone, email..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          {total > 0 && (
            <Button variant="danger" onClick={() => setDeleteAllOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete All
            </Button>
          )}
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload CSV/XLSX
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Contact
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts yet"
              description="Upload a CSV/XLSX file or add a contact manually to get started."
              action={
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Upload contacts
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Phone</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Opt-ins</th>
                    <th className="py-2 pr-4 font-medium">Tags</th>
                    <th className="py-2 pr-4 font-medium">Added</th>
                    <th className="py-2 pr-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                      <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{c.phone}</td>
                      <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{c.email || "—"}</td>
                      <td className="py-2.5 pr-4 space-x-1">
                        {c.smsOptIn && <Badge tone="info">SMS</Badge>}
                        {c.whatsappOptIn && <Badge tone="success">WhatsApp</Badge>}
                        {!c.smsOptIn && !c.whatsappOptIn && <Badge tone="danger">No opt-in</Badge>}
                      </td>
                      <td className="py-2.5 pr-4 space-x-1">
                        {c.tags.map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{formatDate(c.createdAt)}</td>
                      <td className="py-2.5 pr-4 text-right space-x-1">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && contacts.length > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500 dark:text-slate-400">
              <span>
                Page {page} of {totalPages} ({total} contacts)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add contact modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Contact"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-contact-form">
              Add Contact
            </Button>
          </>
        }
      >
        <form id="add-contact-form" onSubmit={handleAddContact} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              required
              placeholder="+919876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Email (optional)</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.smsOptIn}
                onChange={(e) => setForm({ ...form, smsOptIn: e.target.checked })}
              />
              SMS opt-in
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.whatsappOptIn}
                onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
              />
              WhatsApp opt-in
            </label>
          </div>
        </form>
      </Modal>

      {/* Import preview modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Review import"
        footer={
          <>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmImport} disabled={!importPreview?.validCount}>
              Import {importPreview?.validCount || 0} contacts
            </Button>
          </>
        }
      >
        {importPreview && (
          <div className="space-y-4">
            {importPreview.engine && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-orange-500/30 text-xs">
                <span className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  🔥 {importPreview.engine}
                </span>
                {importPreview.elapsedMicroseconds ? (
                  <span className="font-mono font-medium text-[11px] text-orange-700 dark:text-orange-300">
                    {(importPreview.elapsedMicroseconds / 1000).toFixed(2)} ms execution
                  </span>
                ) : null}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">
                  {importPreview.validCount}
                </p>
                <p className="text-xs text-slate-500">Valid</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-xl font-semibold text-red-700 dark:text-red-400">
                  {importPreview.invalidCount}
                </p>
                <p className="text-xs text-slate-500">Invalid</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                <p className="text-xl font-semibold text-amber-700 dark:text-amber-400">
                  {importPreview.duplicateCount}
                </p>
                <p className="text-xs text-slate-500">Duplicates</p>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <tr className="text-left">
                    <th className="p-2">Name</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-2">{r.name || "—"}</td>
                      <td className="p-2">{r.phone}</td>
                      <td className="p-2">
                        {r.isValid ? (
                          <Badge tone="success">Valid</Badge>
                        ) : (
                          <Badge tone="danger">{r.errors[0]}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete contact"
        message="This will permanently remove the contact. This action cannot be undone."
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete all contacts"
        message={`Are you sure you want to permanently delete all ${total} contacts? This action cannot be undone.`}
        confirmLabel="Delete All"
        danger
      />
    </Layout>
  );
}
