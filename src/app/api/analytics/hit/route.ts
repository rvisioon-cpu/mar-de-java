import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { trackPageView } from "@/app/actions/analytics";
import { isAnalyticsId, isPublicAnalyticsPath, VISIT_COOKIE, VISIT_TIMEOUT_SECONDS } from "@/lib/analytics/policy";

export async function POST(request: Request) {
  try {
    const { path, deviceType, pageViewId } = await request.json();
    if (!isPublicAnalyticsPath(path) || (pageViewId !== undefined && !isAnalyticsId(pageViewId))) {
      return NextResponse.json({ success: false, error: "Invalid page view" }, { status: 400 });
    }
    const sessionId = (await cookies()).get(VISIT_COOKIE)?.value;
    const result = await trackPageView(path, deviceType, sessionId, pageViewId);
    const response = NextResponse.json(result, { status: result.success ? 200 : 400 });
    if (result.success && result.sessionId) {
      response.cookies.set(VISIT_COOKIE, result.sessionId, {
        httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:",
        path: "/", maxAge: VISIT_TIMEOUT_SECONDS,
      });
    }
    return response;
  } catch (error) {
    console.error("Error in analytics hit endpoint:", error);
    return NextResponse.json({ success: false, error: "Unable to register visit" }, { status: 500 });
  }
}
