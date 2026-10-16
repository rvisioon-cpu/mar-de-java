"use server";

import { getDb } from "@/lib/db";
import { constructionProgress } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function getProgressUpdates() {
  const db = await getDb();
  
  // Fetch active progress updates ordered by date descending
  const updates = await db
    .select()
    .from(constructionProgress)
    .where(isNull(constructionProgress.deletedAt))
    .orderBy(desc(constructionProgress.date));

  return updates;
}

export async function createProgressUpdate(data: {
  title: string;
  year: number;
  month: number;
  mediaUrl: string;
  description?: string;
}) {
  const session = await auth();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Solo administradores pueden crear avances de obra.");
  }

  const db = await getDb();
  const dateVal = new Date(data.year, data.month - 1, 1);

  const [newUpdate] = await db
    .insert(constructionProgress)
    .values({
      title: data.title,
      date: dateVal,
      mediaUrl: data.mediaUrl,
      description: data.description || "",
    })
    .returning();

  revalidatePath("/dashboard/progress");
  revalidatePath("/avance-de-obra");
  return newUpdate;
}

export async function updateProgressUpdate(
  id: string,
  data: {
    title: string;
    year: number;
    month: number;
    mediaUrl: string;
    description?: string;
  }
) {
  const session = await auth();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Solo administradores pueden editar avances de obra.");
  }

  const db = await getDb();
  const dateVal = new Date(data.year, data.month - 1, 1);

  const [updatedUpdate] = await db
    .update(constructionProgress)
    .set({
      title: data.title,
      date: dateVal,
      mediaUrl: data.mediaUrl,
      description: data.description || "",
    })
    .where(eq(constructionProgress.id, id))
    .returning();

  revalidatePath("/dashboard/progress");
  revalidatePath("/avance-de-obra");
  return updatedUpdate;
}

export async function deleteProgressUpdate(id: string) {
  const session = await auth();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Solo administradores pueden eliminar avances de obra.");
  }

  const db = await getDb();
  await db
    .update(constructionProgress)
    .set({ deletedAt: new Date() })
    .where(eq(constructionProgress.id, id));

  revalidatePath("/dashboard/progress");
  revalidatePath("/avance-de-obra");
  return { success: true };
}

export async function uploadMedia(formData: FormData) {
  const session = await auth();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Solo administradores pueden subir archivos.");
  }

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  // MOCK R2 UPLOAD
  // In a real scenario, you would use aws-sdk to upload `file` to Cloudflare R2
  // and return the public URL.
  // const arrayBuffer = await file.arrayBuffer();
  // ... upload to R2 ...
  
  // For now, return a mock URL
  return `progress/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
}
