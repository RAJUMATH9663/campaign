import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Smartphone, Sparkles, ChevronRight, ChevronLeft, Check, Search, Users, UserCheck } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label, Textarea } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";
import { api } from "../services/api";
import { cn } from "../lib/utils";

type Source = "ALL" | "TAGS" | "SELECTED" | "GROUP";
type Channel = "SMS" | "WHATSAPP";

const STEPS = ["Recipients", "Channel", "Message", "Compliance", "Review"];

export default function CreateCampaign() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [source, setSource] = useState<Source>("ALL");
  const [tags, setTags] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [channel, setChannel] = useState<Channel>("SMS");
  const [message, setMessage] = useState("Hello {{name}}, we have an exciting offer for you.");
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiVariations, setAiVariations] = useState<string[]>([]);
  const [preview, setPreview] = useState<{
    eligibleCount: number;
    excludedCount: number;
    eligible: any[];
    excluded: any[];
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const { push } = useToast();
  const navigate = useNavigate();

  const previewText = message.replace(/\{\{name\}\}/g, "Rahul").replace(/\{\{phone\}\}/g, "+919876543210");

  useEffect(() => {
    if (source === "SELECTED" && contactsList.length === 0) {
      loadContacts();
    }
  }, [source]);

  async function loadContacts() {
    setContactsLoading(true);
    try {
      const { data } = await api.get("/contacts", { params: { pageSize: 500 } });
      setContactsList(data.contacts || []);
    } catch {
      push("error", "Failed to load contacts list");
    } finally {
      setContactsLoading(false);
    }
  }

  function toggleContact(id: string) {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(filteredIds: string[]) {
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedContactIds.includes(id));
    if (allSelected) {
      setSelectedContactIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedContactIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  }

  const filteredContacts = contactsList.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  async function loadPreview() {
    try {
      const { data } = await api.post("/campaigns/preview-recipients", {
        source,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        contactIds: source === "SELECTED" ? selectedContactIds : undefined,
        channel,
      });
      setPreview(data);
    } catch {
      push("error", "Failed to preview recipients");
    }
  }

  async function goNext() {
    if (step === 0 && !source) return push("error", "Select a recipient source");
    if (step === 0 && source === "SELECTED" && selectedContactIds.length === 0) {
      return push("error", "Please select at least one contact to continue");
    }
    if (step === 2 && !message.trim()) return push("error", "Message cannot be empty");
    if (step === 2) await loadPreview();
    if (step === 3 && !preview) await loadPreview();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function runAI(action: string) {
    if (!aiInput.trim() && action === "generate") return push("error", "Describe the message you want first");
    setAiLoading(true);
    try {
      const { data } = await api.post("/ai/generate", {
        action,
        input: action === "generate" ? aiInput : message,
        count: 3,
      });
      setAiVariations(data.variations);
    } catch (err: any) {
      push("error", err?.response?.data?.error || "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function submitCampaign(status: "send" | "draft") {
    if (status === "send" && (!preview?.eligibleCount || preview.eligibleCount === 0)) {
      return push("error", "Cannot send campaign: 0 eligible recipients found. Please add contacts with opt-in enabled first.");
    }
    setCreating(true);
    try {
      const { data } = await api.post("/campaigns", {
        name: name || `Campaign ${new Date().toLocaleDateString()}`,
        channel,
        message,
        source,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        contactIds: source === "SELECTED" ? selectedContactIds : undefined,
      });
      if (status === "send") {
        await api.post(`/campaigns/${data.campaign.id}/launch`);
        push("success", "Campaign is sending now");
      } else {
        push("success", "Campaign saved as draft");
      }
      navigate(`/campaigns/${data.campaign.id}`);
    } catch (err: any) {
      push("error", err?.response?.data?.error || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Layout title="Create Campaign">
      {/* Step indicator */}
      <div className="flex items-center mb-6 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center shrink-0">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                i === step
                  ? "bg-brand-600 text-white"
                  : i < step
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              {label}
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-slate-300 dark:bg-slate-700 mx-1" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {step === 0 && (
            <div className="space-y-4 max-w-xl">
              <div>
                <Label>Campaign name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Promo 2026" />
              </div>
              <div>
                <Label>Recipients</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["ALL", "TAGS", "SELECTED", "GROUP"] as Source[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSource(s)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm text-left",
                        source === s
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400"
                          : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {s === "ALL" && "All contacts"}
                      {s === "TAGS" && "By tags"}
                      {s === "SELECTED" && "Selected contacts"}
                      {s === "GROUP" && "Contact group"}
                    </button>
                  ))}
                </div>
              </div>
              {source === "TAGS" && (
                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, mumbai" />
                </div>
              )}

              {source === "SELECTED" && (
                <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-brand-600" />
                      Select Contacts ({selectedContactIds.length} selected)
                    </Label>
                    {contactsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleSelectAll(filteredContacts.map((c) => c.id))}
                        className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        {filteredContacts.length > 0 &&
                        filteredContacts.every((c) => selectedContactIds.includes(c.id))
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    )}
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search contacts by name or phone..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>

                  {contactsLoading ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Loading contacts...</p>
                  ) : contactsList.length === 0 ? (
                    <div className="text-center py-5 text-xs text-slate-500 space-y-1">
                      <p>No contacts found in your account.</p>
                      <a href="/contacts" className="text-brand-600 dark:text-brand-400 underline font-medium">
                        Go to Contacts page to add people
                      </a>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No contacts match "{contactSearch}"
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                      {filteredContacts.map((contact) => {
                        const isSelected = selectedContactIds.includes(contact.id);
                        return (
                          <div
                            key={contact.id}
                            onClick={() => toggleContact(contact.id)}
                            className={cn(
                              "flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors select-none",
                              isSelected && "bg-brand-50/60 dark:bg-brand-950/40"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleContact(contact.id)}
                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4 pointer-events-none"
                              />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {contact.name || "Unnamed"}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                  {contact.phone}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {contact.whatsappOptIn && (
                                <Badge tone="success" className="text-[10px] px-1.5 py-0">
                                  WA
                                </Badge>
                              )}
                              {contact.smsOptIn && (
                                <Badge tone="info" className="text-[10px] px-1.5 py-0">
                                  SMS
                                </Badge>
                              )}
                              {!contact.whatsappOptIn && !contact.smsOptIn && (
                                <Badge tone="warning" className="text-[10px] px-1.5 py-0">
                                  No Opt-in
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="max-w-xl">
              <Label>Channel</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setChannel("SMS")}
                  className={cn(
                    "rounded-lg border p-4 flex flex-col items-center gap-2",
                    channel === "SMS" ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  <Smartphone className="h-6 w-6 text-brand-600" />
                  SMS
                </button>
                <button
                  onClick={() => setChannel("WHATSAPP")}
                  className={cn(
                    "rounded-lg border p-4 flex flex-col items-center gap-2",
                    channel === "WHATSAPP" ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  <MessageCircle className="h-6 w-6 text-emerald-600" />
                  WhatsApp
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Message (use {"{{name}}"} or {"{{phone}}"} for personalization)</Label>
                <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
                  <p className="text-xs text-slate-400 mb-1">Preview</p>
                  {previewText}
                </div>
                <div className="flex flex-wrap gap-2">
                  {["improve", "shorten", "professional", "promotional", "friendly", "translate"].map((a) => (
                    <Button key={a} size="sm" variant="outline" disabled={aiLoading} onClick={() => runAI(a)}>
                      {a[0].toUpperCase() + a.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" /> Generate with AI
                </Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Create a professional promotional message for our new service"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                />
                <Button size="sm" disabled={aiLoading} onClick={() => runAI("generate")}>
                  {aiLoading ? "Generating…" : "Generate 3 variations"}
                </Button>
                <div className="space-y-2">
                  {aiVariations.map((v, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm">
                      <p className="mb-2">{v}</p>
                      <Button size="sm" variant="outline" onClick={() => setMessage(v)}>
                        Use this
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              {!preview ? (
                <p className="text-sm text-slate-400">Loading compliance check…</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
                      <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                        {preview.eligibleCount}
                      </p>
                      <p className="text-xs text-slate-500">Eligible recipients</p>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-center">
                      <p className="text-2xl font-semibold text-red-700 dark:text-red-400">
                        {preview.excludedCount}
                      </p>
                      <p className="text-xs text-slate-500">Excluded (no consent / opted out)</p>
                    </div>
                  </div>
                  {preview.eligibleCount === 0 && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-amber-800 dark:text-amber-300 text-sm space-y-1">
                      <p className="font-semibold">⚠️ 0 Eligible Recipients</p>
                      <p>
                        You currently have no eligible contacts. If you recently deleted all contacts, please go to the{" "}
                        <a href="/contacts" className="underline font-medium">Contacts page</a> and add your phone number with{" "}
                        <strong>{channel === "WHATSAPP" ? "WhatsApp Opt-in" : "SMS Opt-in"}</strong> enabled.
                      </p>
                    </div>
                  )}
                  {preview.excluded.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                          <tr className="text-left">
                            <th className="p-2">Name</th>
                            <th className="p-2">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.excluded.slice(0, 50).map((e: any) => (
                            <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                              <td className="p-2">{e.name}</td>
                              <td className="p-2 text-red-500">{e.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="max-w-xl space-y-3 text-sm">
              {preview?.eligibleCount === 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-300 text-sm">
                  ⚠️ <strong>Cannot send:</strong> You have 0 eligible recipients. Please add a contact with {channel === "WHATSAPP" ? "WhatsApp Opt-in" : "SMS Opt-in"} checked in the Contacts page first.
                </div>
              )}
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                <span className="text-slate-500">Campaign name</span>
                <span className="font-medium">{name || "Untitled campaign"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                <span className="text-slate-500">Channel</span>
                <Badge>{channel}</Badge>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                <span className="text-slate-500">Recipients</span>
                <span className="font-medium">
                  {source === "ALL" && "All contacts"}
                  {source === "TAGS" && `Tags: ${tags || "none"}`}
                  {source === "SELECTED" && `Selected (${selectedContactIds.length} chosen)`}
                  {source === "GROUP" && "Contact group"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                <span className="text-slate-500">Eligible recipients</span>
                <span className="font-medium">{preview?.eligibleCount ?? "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                <span className="text-slate-500">Excluded</span>
                <span className="font-medium">{preview?.excludedCount ?? "—"}</span>
              </div>
              <div className="py-2">
                <span className="text-slate-500 block mb-1">Message</span>
                <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">{message}</p>
              </div>
              <p className="text-xs text-slate-400">
                Actual delivery cost depends on your configured SMS/WhatsApp provider and its pricing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={goNext}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" disabled={creating} onClick={() => submitCampaign("draft")}>
              Save Draft
            </Button>
            <Button
              disabled={creating || !preview?.eligibleCount}
              onClick={() => submitCampaign("send")}
            >
              {creating ? "Sending…" : "Send Now"}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
