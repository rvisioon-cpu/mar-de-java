import { auth } from "@/auth";
import { getSocialContents } from "@/app/actions/content";
import ContentDashboard from "@/components/dashboard/content/ContentDashboard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Contenido RRSS - Dashboard Mar de Java",
};

export default async function ContentPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role as string;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  const contents = await getSocialContents();

  // Serializar campos complejos (Date, JSON) para evitar advertencias de hidratación de Next.js
  const serializedContents = contents.map((item) => ({
    id: item.id,
    title: item.title,
    platform: item.platform,
    templateType: item.templateType,
    width: item.width,
    height: item.height,
    aspectRatio: item.aspectRatio,
    prompt: item.prompt || null,
    resultUrl: item.resultUrl || null,
    referenceUrls: item.referenceUrls || [],
    status: item.status,
    createdAt: item.createdAt,
  }));

  return <ContentDashboard initialContentList={serializedContents} />;
}
