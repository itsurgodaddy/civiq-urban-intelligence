import { env } from "cloudflare:workers";
import { getCurrentAccount, unauthorized } from "@/lib/authz";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4"]);

export async function POST(request: Request) {
  try {
    const identity = await getCurrentAccount();
    if (!identity?.account) return unauthorized("Sign in before uploading evidence.");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose an evidence file." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return Response.json({ error: "Use JPG, PNG, WebP, or MP4 evidence." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Evidence must be smaller than 10 MB." }, { status: 400 });
    if (!env.BUCKET) throw new Error("Evidence storage is unavailable.");

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const key = `evidence/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    return Response.json({ key, url: `/api/evidence?key=${encodeURIComponent(key)}` }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload evidence";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!/^[a-zA-Z0-9._/-]{1,220}$/.test(key) || !env.BUCKET) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=86400");
  return new Response(object.body, { headers });
}
