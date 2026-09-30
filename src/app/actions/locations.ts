"use server";

import { getDb } from "@/lib/db";
import { locationsPoi } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import initialLocations from "@/data/mar_java_locations.json";

export async function getLocations(includeInactive = false) {
  const db = await getDb();
  
  const query = db.select().from(locationsPoi).where(
    includeInactive
      ? isNull(locationsPoi.deletedAt)
      : and(isNull(locationsPoi.deletedAt), eq(locationsPoi.isActive, true))
  );
  
  const results = await query;
  return results;
}

export async function createLocation(
  name: string,
  category: string,
  imagePath: string | null,
  longitude: number,
  latitude: number,
  isActive = true
) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede agregar ubicaciones.");
  }
  
  const db = await getDb();
  
  const [newLocation] = await db
    .insert(locationsPoi)
    .values({
      name,
      category,
      imagePath,
      longitude,
      latitude,
      isActive,
    })
    .returning();
    
  revalidatePath("/ubicacion");
  revalidatePath("/dashboard/map");
  return newLocation;
}

export async function updateLocation(
  id: string,
  name: string,
  category: string,
  imagePath: string | null,
  longitude: number,
  latitude: number,
  isActive: boolean
) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede actualizar ubicaciones.");
  }
  
  const db = await getDb();
  
  const [updatedLocation] = await db
    .update(locationsPoi)
    .set({
      name,
      category,
      imagePath,
      longitude,
      latitude,
      isActive,
    })
    .where(eq(locationsPoi.id, id))
    .returning();
    
  revalidatePath("/ubicacion");
  revalidatePath("/dashboard/map");
  return updatedLocation;
}

export async function deleteLocation(id: string) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede eliminar ubicaciones.");
  }
  
  const db = await getDb();
  
  await db
    .update(locationsPoi)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(locationsPoi.id, id));
    
  revalidatePath("/ubicacion");
  revalidatePath("/dashboard/map");
  return { success: true };
}

export async function seedLocations() {
  const db = await getDb();
  
  // Add any newly shipped points without overwriting locations that the
  // administrator has already edited in the dashboard.
  const existing = await db
    .select()
    .from(locationsPoi)
    .where(isNull(locationsPoi.deletedAt));
    
  const seeded: any[] = [];
  const existingIds = new Set(existing.map(location => location.id));
  
  // Filter out the project itself if present (it has its own hardcoded marker on map)
  const features = (initialLocations.features || []).filter(
    (f: any) => f.properties.nombre !== "Mar de Java"
  );
  
  for (const feature of features) {
    if (feature.id && existingIds.has(feature.id)) continue;
    const name = feature.properties.nombre;
    const category = feature.properties.categoria || "Otros";
    const imagePath = feature.properties.imagen || null;
    const longitude = feature.geometry.coordinates[0];
    const latitude = feature.geometry.coordinates[1];
    
    const [row] = await db
      .insert(locationsPoi)
      .values({
        id: feature.id || crypto.randomUUID(),
        name,
        category,
        imagePath,
        longitude,
        latitude,
        isActive: true,
      })
      .returning();
      
    seeded.push(row);
  }
  
  return seeded;
}
