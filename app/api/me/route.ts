import { NextResponse } from "next/server";
import { currentSession } from "@/lib/session";
import { demoHistory, findDemoAccount } from "@/lib/demo-accounts";
import { geminiEnabled } from "@/lib/engine/gemini";
import { registryInfo } from "@/lib/engine/sebi";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await currentSession();
  if (!s) return NextResponse.json({ user: null });
  const features = { ai: geminiEnabled(), sebiList: registryInfo };
  if (s.kind === "demo") {
    const acc = findDemoAccount(s.username)!;
    return NextResponse.json({
      user: { username: s.username, displayName: acc.displayName, story: acc.story, city: acc.city, kind: "demo" },
      trades: demoHistory(s.username),
      features,
    });
  }
  return NextResponse.json({
    user: {
      username: s.username,
      displayName: { en: s.name, hi: s.name },
      story: {
        en: "Your own account. Add a few past trades in Profile so we can spot habits like loss-chasing.",
        hi: "आपका अपना अकाउंट। प्रोफ़ाइल में कुछ पुराने ट्रेड जोड़ें, ताकि हम घाटा-वसूली जैसी आदतें पहचान सकें।",
      },
      city: "",
      kind: "user",
    },
    trades: [],
    features,
  });
}
