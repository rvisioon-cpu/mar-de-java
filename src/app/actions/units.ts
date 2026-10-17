"use server";

import { cache } from "react";
import { getDb } from "@/lib/db";
import { floors, units, logs } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { floorsData as staticFloorsData } from "@/data/floors";

// Helper to audit actions
async function logAction(
  db: any,
  session: any,
  action: "CREATE" | "UPDATE" | "DELETE",
  entityType: "floor" | "unit",
  entityId: string,
  details: any
) {
  await db.insert(logs).values({
    userId: session?.user?.id || "system",
    userName: session?.user?.name || "Dev User",
    action,
    entityType,
    entityId,
    details: JSON.stringify(details),
  });
}

// ----------------------------------------------------
// FLOOR ACTIONS
// ----------------------------------------------------

export async function getFloors() {
  const db = await getDb();
  return await db
    .select()
    .from(floors)
    .where(isNull(floors.deletedAt))
    .orderBy(floors.level);
}

export const getFloorsData = cache(async function getFloorsData() {
  const sessionPromise = auth().catch(() => null);
  const db = await getDb();
  // D1 batches independent reads in a single round trip. Session lookup runs
  // alongside the reads; role filtering is still applied before returning data.
  const [session, [allFloors, allUnits]] = await Promise.all([
    sessionPromise,
    db.batch([
      db.select().from(floors).where(isNull(floors.deletedAt)).orderBy(floors.level),
      db.select().from(units).where(isNull(units.deletedAt)).orderBy(units.identifier),
    ]),
  ]);
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  return allFloors.map(f => {
    const rawFloorId = f.id.replace('floor_', '');
    const staticFloor = staticFloorsData.find(sf => sf.id === rawFloorId);

    const floorUnits = allUnits
      .filter(u => u.floorId === f.id)
      .filter(u => {
        if (u.state === 'COMMON_AREA') {
          return isSuperAdmin;
        }
        return true;
      })
      .map(u => {
        let status: 'available' | 'reserved' | 'sold' = 'available';
        if (u.state === 'SOLD') status = 'sold';
        else if (u.state === 'RESERVED') status = 'reserved';
        
        const coords = u.coordinates as { x?: number; y?: number; path?: string } | null;
        
        const cleanUnitId = u.id.replace(`unit_${rawFloorId}_`, '');
        const staticUnit = staticFloor?.units.find(
          su => su.id === cleanUnitId || su.id === u.identifier || (su.identifier && su.identifier === u.identifier)
        );

        let subtitle = 'Flat';
        if (u.type === 'STORAGE') {
          subtitle = 'Bodega';
        } else if (u.type === 'DUPLEX') {
          // Marks the unit as spanning two floors, which is what makes the unit
          // page show the level selector between its lower and upper plans.
          subtitle = 'Dúplex';
        } else if (u.identifier === 'Terraza') {
          subtitle = 'Terraza';
        } else if (u.identifier === '801') {
          subtitle = 'Duplex';
        }

        return {
          id: u.id,
          identifier: u.identifier,
          floorId: u.floorId.replace('floor_', ''),
          price: 0,
          dimensions: u.areaSqm || 0,
          bedrooms: u.bedrooms || undefined,
          bathrooms: u.bathrooms || undefined,
          status,
          type: u.type === 'STORAGE' ? ('storage' as const) : ('apartment' as const),
          subtitle,
          description: '',
          images: u.gallery ? (u.gallery as string[]) : [],
          tourUrl: u.tourUrl || undefined,
          x: coords?.x ?? staticUnit?.x,
          y: coords?.y ?? staticUnit?.y,
          path: coords?.path ?? staticUnit?.path,
          photosFurnished: u.photosFurnished ? (u.photosFurnished as string[]) : [],
          photosUnfurnished: u.photosUnfurnished ? (u.photosUnfurnished as string[]) : [],
          photosPlans: u.photosPlans ? (u.photosPlans as string[]) : [],
          photosBalcony: u.photosBalcony ? (u.photosBalcony as string[]) : [],
          gallery: u.gallery ? (u.gallery as string[]) : [],
        };
      });

    return {
      id: f.id.replace('floor_', ''),
      name: f.name,
      level: f.level,
      floorPlanImage: f.imagePath || '',
      units: floorUnits,
    };
  });
});

export async function createFloor(data: {
  name: string;
  level: number;
  type: string;
  imagePath?: string;
}) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede crear plantas.");
  }

  const db = await getDb();
  const [newFloor] = await db
    .insert(floors)
    .values({
      name: data.name,
      level: data.level,
      type: data.type,
      imagePath: data.imagePath || "",
    })
    .returning();

  await logAction(db, session, "CREATE", "floor", newFloor.id, {
    name: newFloor.name,
    level: newFloor.level,
    type: newFloor.type,
  });

  revalidatePath("/dashboard/units");
  return newFloor;
}

export async function updateFloor(
  id: string,
  data: {
    name: string;
    level: number;
    type: string;
    imagePath?: string;
  }
) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede editar plantas.");
  }

  const db = await getDb();
  
  // Get original floor
  const [original] = await db.select().from(floors).where(eq(floors.id, id));
  if (!original) throw new Error("Planta no encontrada.");

  const [updatedFloor] = await db
    .update(floors)
    .set({
      name: data.name,
      level: data.level,
      type: data.type,
      imagePath: data.imagePath,
      updatedAt: new Date(),
    })
    .where(eq(floors.id, id))
    .returning();

  await logAction(db, session, "UPDATE", "floor", id, {
    before: { name: original.name, level: original.level, type: original.type },
    after: { name: updatedFloor.name, level: updatedFloor.level, type: updatedFloor.type },
  });

  revalidatePath("/dashboard/units");
  return updatedFloor;
}

export async function deleteFloor(id: string) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede eliminar plantas.");
  }

  const db = await getDb();

  // Find units that will be soft-deleted recursively
  const relatedUnits = await db
    .select()
    .from(units)
    .where(and(eq(units.floorId, id), isNull(units.deletedAt)));

  const now = new Date();

  // Soft delete floor
  await db
    .update(floors)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(floors.id, id));

  // Soft delete related units
  if (relatedUnits.length > 0) {
    const unitIds = relatedUnits.map((u) => u.id);
    await db
      .update(units)
      .set({ deletedAt: now, updatedAt: now })
      .where(inArray(units.id, unitIds));
  }

  await logAction(db, session, "DELETE", "floor", id, {
    floorId: id,
    deletedUnitsCount: relatedUnits.length,
    deletedUnitIds: relatedUnits.map((u) => u.id),
  });

  revalidatePath("/dashboard/units");
  return { success: true, deletedUnitsCount: relatedUnits.length };
}

// ----------------------------------------------------
// UNIT ACTIONS
// ----------------------------------------------------

export async function getUnits() {
  const db = await getDb();
  return await db
    .select()
    .from(units)
    .where(isNull(units.deletedAt))
    .orderBy(units.identifier);
}

export async function createUnit(data: {
  floorId: string;
  identifier: string;
  type?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  state?: string;
  tourUrl?: string;
  photosFurnished?: string[];
  photosUnfurnished?: string[];
  photosPlans?: string[];
  photosBalcony?: string[];
}) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede crear unidades.");
  }

  const db = await getDb();
  const [newUnit] = await db
    .insert(units)
    .values({
      floorId: data.floorId,
      identifier: data.identifier,
      type: data.type || "",
      bedrooms: data.bedrooms || 0,
      bathrooms: data.bathrooms || 0,
      areaSqm: data.areaSqm || 0,
      state: data.state || "AVAILABLE",
      tourUrl: data.tourUrl || "",
      photosFurnished: data.photosFurnished || [],
      photosUnfurnished: data.photosUnfurnished || [],
      photosPlans: data.photosPlans || [],
      photosBalcony: data.photosBalcony || [],
      gallery: [],
      renders: [],
    })
    .returning();

  await logAction(db, session, "CREATE", "unit", newUnit.id, {
    identifier: newUnit.identifier,
    floorId: newUnit.floorId,
    state: newUnit.state,
  });

  revalidatePath("/dashboard/units");
  return newUnit;
}

export async function updateUnit(
  id: string,
  data: {
    identifier: string;
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    areaSqm?: number;
    state?: string;
    tourUrl?: string;
    photosFurnished?: string[];
    photosUnfurnished?: string[];
    photosPlans?: string[];
    photosBalcony?: string[];
  }
) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede editar detalles de la unidad.");
  }

  const db = await getDb();
  
  // Get original unit
  const [original] = await db.select().from(units).where(eq(units.id, id));
  if (!original) throw new Error("Unidad no encontrada.");

  const [updatedUnit] = await db
    .update(units)
    .set({
      identifier: data.identifier,
      type: data.type,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      areaSqm: data.areaSqm,
      state: data.state,
      tourUrl: data.tourUrl,
      photosFurnished: data.photosFurnished || [],
      photosUnfurnished: data.photosUnfurnished || [],
      photosPlans: data.photosPlans || [],
      photosBalcony: data.photosBalcony || [],
      updatedAt: new Date(),
    })
    .where(eq(units.id, id))
    .returning();

  await logAction(db, session, "UPDATE", "unit", id, {
    before: { identifier: original.identifier, state: original.state },
    after: { identifier: updatedUnit.identifier, state: updatedUnit.state },
  });

  revalidatePath("/dashboard/units");
  return updatedUnit;
}

export async function updateUnitState(id: string, newState: string) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized: Debes iniciar sesión.");
  }

  const db = await getDb();
  
  // Get original unit
  const [original] = await db.select().from(units).where(eq(units.id, id));
  if (!original) throw new Error("Unidad no encontrada.");

  const currentState = original.state;

  // Validation Guard: check for reversion (moving to a previous state)
  const isReversion = (current: string, next: string) => {
    if (current === "SOLD" && (next === "RESERVED" || next === "AVAILABLE")) return true;
    if (current === "RESERVED" && next === "AVAILABLE") return true;
    if (current === "COMMON_AREA" && next !== "COMMON_AREA") return true;
    return false;
  };

  if (isReversion(currentState, newState)) {
    // Requires supervisor status (ADMIN or SUPER_ADMIN)
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
      throw new Error(
        "Unauthorized: Revertir el estado de una unidad reservada/vendida requiere autorización de Supervisor."
      );
    }
  }

  const [updatedUnit] = await db
    .update(units)
    .set({
      state: newState,
      updatedAt: new Date(),
    })
    .where(eq(units.id, id))
    .returning();

  await logAction(db, session, "UPDATE", "unit", id, {
    identifier: original.identifier,
    transition: `${currentState} -> ${newState}`,
    authorizedBy: session.user.name,
    role: session.user.role,
  });

  revalidatePath("/dashboard/units");
  return updatedUnit;
}

export async function deleteUnit(id: string) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Solo el Super Administrador puede eliminar unidades.");
  }

  const db = await getDb();
  const now = new Date();

  const [deletedUnit] = await db
    .update(units)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(units.id, id))
    .returning();

  await logAction(db, session, "DELETE", "unit", id, {
    identifier: deletedUnit.identifier,
  });

  revalidatePath("/dashboard/units");
  return { success: true };
}

// ----------------------------------------------------
// AUDIT LOG ACTIONS
// ----------------------------------------------------

export async function getLogs() {
  const db = await getDb();
  return await db
    .select()
    .from(logs)
    .orderBy(logs.createdAt);
}
