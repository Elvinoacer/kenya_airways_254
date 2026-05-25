import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("search_history="));
  const history = match
    ? JSON.parse(decodeURIComponent(match.split("=")[1]))
    : [];
  return NextResponse.json({ history });
}

export async function POST(req: Request) {
  const body = await req.json();
  const item = body.item;
  const cookie = req.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("search_history="));
  const existing = match
    ? JSON.parse(decodeURIComponent(match.split("=")[1]))
    : [];
  const next = [
    item,
    ...existing.filter((x: any) => JSON.stringify(x) !== JSON.stringify(item)),
  ].slice(0, 10);
  const res = NextResponse.json({ ok: true, history: next });
  res.headers.append(
    "Set-Cookie",
    `search_history=${encodeURIComponent(JSON.stringify(next))}; Path=/; HttpOnly`,
  );
  return res;
}
