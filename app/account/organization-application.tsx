"use client";

import { FormEvent, useState } from "react";
import { Building2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function OrganizationApplication({ pending = false }: { pending?: boolean }) {
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/organizations/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          expertise: form.get("expertise"),
          operatingRegion: form.get("operatingRegion"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Application could not be submitted.");
      toast.success("Application sent", { description: "The CIVIQ owner can now review your organization." });
      window.location.reload();
    } catch (error) {
      toast.error("Application not sent", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card/80 p-6 soft-ring">
      <div className="mb-6 flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" /></span>
        <div>
          <h2 className="text-xl font-bold">{pending ? "Update organization application" : "Apply as an organization"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Verified organizations can investigate and adopt matching city issues.</p>
        </div>
      </div>
      <div className="space-y-4">
        <label className="block text-sm font-semibold">Organization name<Input name="name" required minLength={2} maxLength={120} className="mt-2" placeholder="Example: JalSetu Foundation" /></label>
        <label className="block text-sm font-semibold">Expertise<Textarea name="expertise" required minLength={3} maxLength={300} className="mt-2 min-h-24" placeholder="Water infrastructure, pipeline repair, conservation" /></label>
        <label className="block text-sm font-semibold">Operating region<Input name="operatingRegion" required minLength={2} maxLength={160} className="mt-2" placeholder="Delhi NCR" /></label>
      </div>
      <Button type="submit" disabled={submitting} className="mt-6 w-full">
        {submitting ? <><LoaderCircle className="animate-spin" /> Sending…</> : <><Send /> Submit for verification</>}
      </Button>
    </form>
  );
}
