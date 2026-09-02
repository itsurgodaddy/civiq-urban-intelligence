"use client";

import { FormEvent, useState } from "react";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OwnerClaim({ email }: { email: string }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: form.get("token") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Owner access could not be claimed.");
      window.location.reload();
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border bg-card/85 p-7 soft-ring sm:p-9">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-7" /></span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-primary">One-time setup</p>
      <h1 className="mt-2 text-3xl font-black">Claim CIVIQ ownership</h1>
      <p className="mt-3 leading-7 text-muted-foreground">You are signed in as <strong className="text-foreground">{email}</strong>. Enter the private owner setup key once to make this ChatGPT identity the permanent CIVIQ administrator.</p>
      <form onSubmit={claim} className="mt-7">
        <label className="block text-sm font-semibold">Owner setup key
          <div className="relative mt-2"><KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" /><Input name="token" type="password" required autoComplete="one-time-code" className="pl-9" /></div>
        </label>
        {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <Button type="submit" disabled={submitting} className="mt-5 w-full">{submitting ? <><LoaderCircle className="animate-spin" /> Claiming…</> : <><ShieldCheck /> Become site owner</>}</Button>
      </form>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">CIVIQ never receives or stores your ChatGPT password. The setup key stops another signed-in visitor from claiming the administrator role first.</p>
    </div>
  );
}
