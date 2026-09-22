"use server";

import { getDb } from "@/lib/db";
import {
  users,
  appointments,
  prospects,
  prospectUnits,
  availabilities,
  calendarTransfers,
  units,
} from "@/lib/db/schema";
import { eq, and, isNull, or, gte, lte, ne, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth as nextAuth } from "@/auth";
import { Resend } from "resend";
import AppointmentEmail from "@/components/emails/AppointmentEmail";
import config from "@/config/config";
import { createGoogleMeetEvent } from "@/utils/googleMeet";

// Helper to get logged-in user or mock for local development
async function getSessionUser(db: any) {
  const session = await nextAuth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const user = {
    id: session.user.id || "",
    name: session.user.name || "Dev User",
    email: session.user.email || "",
    role: session.user.role || "SELLER",
  };

  // Ensure user exists in D1 database to prevent foreign key errors
  try {
    const existingById = await db.select().from(users).where(eq(users.id, user.id));
    if (existingById.length > 0) {
      // User with this ID exists, we are good!
    } else {
      // Check if email already exists under a different ID
      const existingByEmail = await db.select().from(users).where(eq(users.email, user.email));
      if (existingByEmail.length > 0) {
        // Use the existing ID in the session object so all foreign keys match
        user.id = existingByEmail[0].id;
      } else {
        // No user with this ID or email exists. Safe to insert!
        await db.insert(users).values({
          id: user.id,
          name: user.name,
          email: user.email,
          password: "mockpassword",
          role: user.role,
        });
      }
    }
  } catch (err) {
    console.error("Error ensuring session user exists in SQLite:", err);
  }

  return user;
}

// Utility to resolve mock-id or ALL to their true DB identifiers
async function resolveUserId(db: any, id: string | undefined): Promise<string> {
  if (!id) return "";
  if (id === "mock-id" || id === "ALL") {
    if (id === "ALL") return "ALL";
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, "andresadmin@example.com"));
    if (existing.length > 0) {
      return existing[0].id;
    }
  }
  return id;
}

// Check if a transfer is active for a seller on a given date
async function getEffectiveSellerId(db: any, sellerId: string, date: Date): Promise<string> {
  const activeTransfers = await db
    .select()
    .from(calendarTransfers)
    .where(
      and(
        eq(calendarTransfers.fromSellerId, sellerId),
        lte(calendarTransfers.startDate, date),
        gte(calendarTransfers.endDate, date)
      )
    );

  if (activeTransfers.length > 0) {
    // Recursively check if the target seller also has a transfer
    return getEffectiveSellerId(db, activeTransfers[0].toSellerId, date);
  }
  return sellerId;
}

// ----------------------------------------------------
// PROSPECT ACTIONS
// ----------------------------------------------------

export async function getProspects() {
  const db = await getDb();
  return await db
    .select()
    .from(prospects)
    .where(isNull(prospects.deletedAt))
    .orderBy(prospects.name);
}

// ----------------------------------------------------
// SELLER ACTIONS
// ----------------------------------------------------

export async function getSellers() {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  
  // Get all users who are sellers or admins (excluding soft-deleted)
  let query = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(isNull(users.deletedAt));

  // If currentUser is ADMIN, they should not see SUPER_ADMIN in the seller list
  if (currentUser.role === "ADMIN") {
    query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(isNull(users.deletedAt), ne(users.role, "SUPER_ADMIN")));
  }

  return await query.orderBy(users.name);
}

// ----------------------------------------------------
// APPOINTMENT ACTIONS
// ----------------------------------------------------

export async function getAppointments(sellerId?: string) {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  const resolvedSellerId = sellerId ? await resolveUserId(db, sellerId) : undefined;

  // 1. Fetch all active appointments with their prospects
  const rows = await db
    .select({
      appointment: appointments,
      prospect: prospects,
    })
    .from(appointments)
    .leftJoin(prospects, eq(appointments.prospectId, prospects.id))
    .where(isNull(appointments.deletedAt));

  // 2. Fetch all prospect units to map units of interest
  const prUnits = await db
    .select({
      prospectId: prospectUnits.prospectId,
      unitIdentifier: units.identifier,
    })
    .from(prospectUnits)
    .innerJoin(units, eq(prospectUnits.unitId, units.id));

  // Map units of interest by prospect ID
  const unitsMap = new Map<string, string[]>();
  prUnits.forEach((u) => {
    const list = unitsMap.get(u.prospectId) || [];
    list.push(u.unitIdentifier);
    unitsMap.set(u.prospectId, list);
  });

  // 3. Fetch all active transfers
  const transfers = await db.select().from(calendarTransfers);

  // Helper to check if a date is within a transfer range
  const isTransferActive = (fromId: string, date: Date) => {
    const time = date.getTime();
    return transfers.find(
      (t) =>
        t.fromSellerId === fromId &&
        new Date(t.startDate).getTime() <= time &&
        new Date(t.endDate).getTime() >= time
    );
  };

  // Helper to resolve the final seller responsible for an appointment
  const resolveEffectiveSeller = (origSellerId: string, date: Date): string => {
    let currentId = origSellerId;
    let visited = new Set<string>();

    while (true) {
      if (visited.has(currentId)) break; // Prevent cycle
      visited.add(currentId);

      const activeT = isTransferActive(currentId, date);
      if (activeT) {
        currentId = activeT.toSellerId;
      } else {
        break;
      }
    }
    return currentId;
  };

  const isUserAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN";

  // Fetch all users to create a map of roles and names to filter out SUPER_ADMIN appointments for ADMIN users
  const allUsers = await db.select({ id: users.id, role: users.role, name: users.name }).from(users);
  const userRolesMap = new Map<string, string>();
  const userNamesMap = new Map<string, string>();
  allUsers.forEach((u) => {
    userRolesMap.set(u.id, u.role || "SELLER");
    userNamesMap.set(u.id, u.name || "Vendedor");
  });

  // Map and filter results
  let mapped = rows.map(({ appointment, prospect }) => {
    const pUnits = prospect ? (unitsMap.get(prospect.id) || []) : [];
    const effectiveSellerId = resolveEffectiveSeller(appointment.sellerId, appointment.date);
    
    return {
      ...appointment,
      prospect: prospect ? { ...prospect, units: pUnits } : null,
      effectiveSellerId,
      isTransferred: effectiveSellerId !== appointment.sellerId,
      sellerName: userNamesMap.get(appointment.sellerId) || "Desconocido",
      effectiveSellerName: userNamesMap.get(effectiveSellerId) || "Desconocido",
    };
  });

  // If currentUser is ADMIN, filter out any appointments where either the original or effective seller is SUPER_ADMIN
  if (currentUser.role === "ADMIN") {
    mapped = mapped.filter(
      (a) => userRolesMap.get(a.sellerId) !== "SUPER_ADMIN" && userRolesMap.get(a.effectiveSellerId) !== "SUPER_ADMIN"
    );
  }

  if (isUserAdmin) {
    if (resolvedSellerId && resolvedSellerId !== "ALL") {
      // Filter by the selected original or effective seller
      return mapped.filter(
        (a) => a.sellerId === resolvedSellerId || a.effectiveSellerId === resolvedSellerId
      );
    }
    return mapped;
  } else {
    // Sellers only see appointments where they are the effective seller,
    // or their own appointments that haven't been transferred out.
    return mapped.filter((a) => a.effectiveSellerId === currentUser.id || a.sellerId === currentUser.id);
  }
}

export async function createAppointment(data: {
  sellerId?: string;
  date: Date | string;
  type: "VIRTUAL" | "IN_PERSON";
  prospectName: string;
  prospectEmail: string;
  prospectPhone?: string;
  prospectAddress?: string;
  unitsOfInterest?: string[]; // array of unit IDs
  notes?: string;
  sendEmail: boolean;
}) {
  try {
    const db = await getDb();
    const bookingDate = new Date(data.date);

    if (bookingDate.getTime() <= Date.now()) {
      throw new Error("No se pueden programar citas en el pasado.");
    }

  // 1. Manage Prospect
  let prospectId = "";
  const existingProspects = await db
    .select()
    .from(prospects)
    .where(eq(prospects.email, data.prospectEmail.trim().toLowerCase()));

  if (existingProspects.length > 0) {
    prospectId = existingProspects[0].id;
    // Update prospect details if changed
    await db
      .update(prospects)
      .set({
        name: data.prospectName,
        phone: data.prospectPhone || existingProspects[0].phone,
        address: data.prospectAddress || existingProspects[0].address,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, prospectId));
  } else {
    // Create new prospect
    const [newProspect] = await db
      .insert(prospects)
      .values({
        name: data.prospectName,
        email: data.prospectEmail.trim().toLowerCase(),
        phone: data.prospectPhone || null,
        address: data.prospectAddress || null,
      })
      .returning();
    prospectId = newProspect.id;
  }

  // 2. Link Units of Interest
  if (data.unitsOfInterest && data.unitsOfInterest.length > 0) {
    // Delete existing links for this prospect
    await db.delete(prospectUnits).where(eq(prospectUnits.prospectId, prospectId));
    // Insert new links
    for (const uId of data.unitsOfInterest) {
      await db.insert(prospectUnits).values({
        prospectId,
        unitId: uId,
      });
    }
  }

  // 3. Resolve Assigned Seller
  let finalSellerId = data.sellerId ? await resolveUserId(db, data.sellerId) : undefined;

  if (!finalSellerId) {
    // PUBLIC BOOKING: Find available seller
    const bookingPeruDate = new Date(bookingDate.getTime() - 5 * 3600000);
    const dayOfWeek = bookingPeruDate.getUTCDay();
    // Use a locale-independent approach to avoid Cloudflare V8 runtime locale issues
    const timeStr = `${String(bookingPeruDate.getUTCHours()).padStart(2, "0")}:${String(bookingPeruDate.getUTCMinutes()).padStart(2, "0")}`; // e.g. "10:30"

    // Get all sellers' weekly availabilities for this day of week
    const allAvails = await db
      .select({
        userId: availabilities.userId,
        startTime: availabilities.startTime,
        endTime: availabilities.endTime,
        slotDuration: availabilities.slotDuration,
        meetingType: availabilities.meetingType,
      })
      .from(availabilities)
      .where(
        and(
          eq(availabilities.dayOfWeek, dayOfWeek),
          or(
            eq(availabilities.meetingType, data.type),
            eq(availabilities.meetingType, "BOTH")
          )
        )
      );

    // Get active sellers
    const activeUsers = await db.select().from(users).where(isNull(users.deletedAt));
    const activeUserIds = new Set(activeUsers.map((u) => u.id));

    // Filter by active users, and check if timeStr is within range
    const candidateAvails = allAvails.filter((av) => {
      if (!activeUserIds.has(av.userId)) return false;
      return timeStr >= av.startTime && timeStr < av.endTime;
    });

    if (candidateAvails.length === 0) {
      throw new Error("No hay asesores disponibles para el tipo de cita y horario seleccionados.");
    }

    // Resolve effective sellers for each candidate (considering transfers)
    const effectiveCandidatesMap = new Map<string, string>(); // origSellerId -> effectiveSellerId
    for (const cand of candidateAvails) {
      const effId = await getEffectiveSellerId(db, cand.userId, bookingDate);
      // Ensure the effective seller is also active and not deleted
      if (activeUserIds.has(effId)) {
        effectiveCandidatesMap.set(cand.userId, effId);
      }
    }

    if (effectiveCandidatesMap.size === 0) {
      throw new Error("No hay asesores disponibles en este momento debido a configuraciones de traspasos.");
    }

    // Find if candidates have conflicts (appointments already booked at this exact time)
    // We compare by hour:minute string to avoid millisecond mismatches
    const bookingTimeStr = `${String(bookingPeruDate.getUTCHours()).padStart(2, "0")}:${String(bookingPeruDate.getUTCMinutes()).padStart(2, "0")}`;

    // Fetch all appointments on this day (not just exact datetime) to compare by time string
    const bookingYear = bookingPeruDate.getUTCFullYear();
    const bookingMonth = bookingPeruDate.getUTCMonth();
    const bookingDay = bookingPeruDate.getUTCDate();

    const startOfBookingDay = new Date(`${bookingYear}-${String(bookingMonth + 1).padStart(2, '0')}-${String(bookingDay).padStart(2, '0')}T00:00:00-05:00`);
    const endOfBookingDay = new Date(`${bookingYear}-${String(bookingMonth + 1).padStart(2, '0')}-${String(bookingDay).padStart(2, '0')}T23:59:59.999-05:00`);

    const dayAppointments = await db
      .select({
        sellerId: appointments.sellerId,
        date: appointments.date,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.date, startOfBookingDay),
          lte(appointments.date, endOfBookingDay),
          ne(appointments.status, "CANCELLED"),
          isNull(appointments.deletedAt)
        )
      );

    // Resolve effective seller for each existing appointment and collect busy effective IDs at the same time slot
    const busyEffectiveSellerIds = new Set<string>();
    for (const appt of dayAppointments) {
      const apptDate = new Date(appt.date);
      const apptPeruDate = new Date(apptDate.getTime() - 5 * 3600000);
      const apptTimeStr = `${String(apptPeruDate.getUTCHours()).padStart(2, "0")}:${String(apptPeruDate.getUTCMinutes()).padStart(2, "0")}`;
      if (apptTimeStr === bookingTimeStr) {
        const effId = await getEffectiveSellerId(db, appt.sellerId, bookingDate);
        busyEffectiveSellerIds.add(effId);
        // Also add the original seller ID in case they were not transferred
        busyEffectiveSellerIds.add(appt.sellerId);
      }
    }

    const candidates = Array.from(effectiveCandidatesMap.values());

    // Find first effective seller without conflict
    const freeSeller = candidates.find((sellerId) => !busyEffectiveSellerIds.has(sellerId));

    if (!freeSeller) {
      throw new Error("Todos los asesores están ocupados en el horario solicitado. Por favor elige otra hora.");
    }

    finalSellerId = freeSeller;
  } else {
    // Direct scheduling: Check for active transfers
    finalSellerId = await getEffectiveSellerId(db, finalSellerId, bookingDate);
  }

  // Get seller details before inserting (needed for Google Calendar invite & email)
  const sellerArr = await db.select().from(users).where(eq(users.id, finalSellerId));
  const seller = sellerArr[0];

  // Generate Google Meet Link if virtual
  let meetLink: string | null = null;
  if (data.type === "VIRTUAL") {
    try {
      const title = `Cita Virtual - ${data.prospectName} y ${seller?.name || "Asesor"}`;
      const description = `Reunión virtual para conocer el proyecto ${config.company?.buildingName || "Residencial Mar de Java"}.\n\nAsesor: ${seller?.name || "Asesor Inmobiliario"} (${seller?.email || "N/A"})\nProspecto: ${data.prospectName} (${data.prospectEmail})`;
      
      meetLink = await createGoogleMeetEvent({
        summary: title,
        description,
        startDate: bookingDate,
        durationMinutes: 30,
        prospectEmail: data.prospectEmail,
        prospectName: data.prospectName,
        sellerEmail: seller?.email || "",
        sellerName: seller?.name || "Asesor Inmobiliario",
      });
    } catch (meetErr: any) {
      // Degradación segura: si Google no está configurado o falla, la cita se
      // agenda igual sin enlace y se notifica por correo como antes. Evita que
      // una credencial ausente bloquee el agendamiento de prospectos reales.
      console.error("Error al generar el enlace de Google Meet:", meetErr);
      meetLink = null;
    }
  }

  // 4. Create Appointment
  const [newAppointment] = await db
    .insert(appointments)
    .values({
      sellerId: finalSellerId,
      type: data.type,
      date: bookingDate,
      prospectName: data.prospectName,
      prospectEmail: data.prospectEmail.trim().toLowerCase(),
      prospectPhone: data.prospectPhone || null,
      prospectAddress: data.prospectAddress || null,
      prospectId,
      sendEmail: data.sendEmail,
      status: "SCHEDULED",
      meetLink,
    })
    .returning();

  // 5. Send Email Notifications. Las citas VIRTUAL normalmente las notifica
  // Google Calendar con su propia invitación; solo enviamos correo si no se
  // pudo generar el Meet, para que el prospecto no se quede sin aviso.
  if (data.sendEmail && (data.type === "IN_PERSON" || !meetLink)) {
    try {
      // Get unit identifiers of interest
      let unitIdentifiers: string[] = [];
      if (data.unitsOfInterest && data.unitsOfInterest.length > 0) {
        const matchingUnits = await db
          .select({ identifier: units.identifier })
          .from(units)
          .where(and(isNull(units.deletedAt), inArray(units.id, data.unitsOfInterest)));
        unitIdentifiers = matchingUnits.map((u) => u.identifier);
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);

        // Remitente y dirección de baja salen de la config, que apunta al
        // dominio verificado en Resend.
        const fromEmail = config.resend.fromNoReply;
        const unsubscribeHeaders = {
          "List-Unsubscribe": `<mailto:no-reply@${config.domainName}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        };

        // Send to prospect
        await resend.emails.send({
          from: fromEmail,
          to: [data.prospectEmail.trim().toLowerCase()],
          subject: `Confirmación de Cita - ${config.company?.buildingName || "Residencial Mar de Java"}`,
          headers: unsubscribeHeaders,
          react: AppointmentEmail({
            prospectName: data.prospectName,
            prospectEmail: data.prospectEmail,
            prospectPhone: data.prospectPhone,
            prospectAddress: data.prospectAddress,
            date: bookingDate,
            type: data.type,
            units: unitIdentifiers,
            sellerName: seller?.name || "Asesor Inmobiliario",
            sellerEmail: seller?.email || config.company.email,
            isForSeller: false,
          }),
        });

        // Send to seller
        if (seller?.email) {
          await resend.emails.send({
            from: fromEmail,
            to: [seller.email],
            subject: `Nueva Cita Asignada - ${data.prospectName}`,
            headers: unsubscribeHeaders,
            react: AppointmentEmail({
              prospectName: data.prospectName,
              prospectEmail: data.prospectEmail,
              prospectPhone: data.prospectPhone,
              prospectAddress: data.prospectAddress,
              date: bookingDate,
              type: data.type,
              units: unitIdentifiers,
              sellerName: seller.name,
              sellerEmail: seller.email,
              isForSeller: true,
            }),
          });
        }
      } else {
        console.warn("RESEND_API_KEY is not set. Skipping email alerts.");
      }
    } catch (emailErr) {
      console.error("Error sending email alert:", emailErr);
    }
  }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/contact");
    return { success: true, appointment: newAppointment };
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return { success: false, error: error.message || "Error al procesar la cita" };
  }
}

export async function updateAppointmentStatus(id: string, status: "SCHEDULED" | "COMPLETED" | "CANCELLED") {
  const db = await getDb();
  await db
    .update(appointments)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  revalidatePath("/dashboard/calendar");
}

export async function updateAppointmentNotes(id: string, notes: string) {
  const db = await getDb();
  await db
    .update(appointments)
    .set({
      notes,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  revalidatePath("/dashboard/calendar");
}

export async function updateAppointmentSeller(id: string, sellerId: string) {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
    throw new Error("Solo los administradores pueden traspasar citas.");
  }

  // Admin cannot transfer appointment to/from a Super Admin user
  if (currentUser.role === "ADMIN") {
    const appt = await db.select().from(appointments).where(eq(appointments.id, id));
    if (appt.length > 0) {
      const fromUserArr = await db.select().from(users).where(eq(users.id, appt[0].sellerId));
      const toUserArr = await db.select().from(users).where(eq(users.id, sellerId));
      if ((fromUserArr[0] && fromUserArr[0].role === "SUPER_ADMIN") || (toUserArr[0] && toUserArr[0].role === "SUPER_ADMIN")) {
        throw new Error("Unauthorized");
      }
    }
  }

  await db
    .update(appointments)
    .set({
      sellerId,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  revalidatePath("/dashboard/calendar");
}

// ----------------------------------------------------
// AVAILABILITY ACTIONS
// ----------------------------------------------------

export async function getAvailabilities(userId?: string) {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  
  let resolvedUserId = userId ? await resolveUserId(db, userId) : currentUser.id;
  if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
    resolvedUserId = currentUser.id; // Force self-view for sellers
  }

  // Admin cannot see Super Admin availabilities
  if (currentUser.role === "ADMIN") {
    const targetUserArr = await db.select().from(users).where(eq(users.id, resolvedUserId));
    if (targetUserArr[0] && targetUserArr[0].role === "SUPER_ADMIN") {
      throw new Error("Unauthorized");
    }
  }

  return await db
    .select()
    .from(availabilities)
    .where(eq(availabilities.userId, resolvedUserId))
    .orderBy(availabilities.dayOfWeek, availabilities.startTime);
}

export async function getAllAvailabilities() {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Fetch all availabilities linked to active (non-deleted) users
  let list = await db
    .select({
      id: availabilities.id,
      userId: availabilities.userId,
      dayOfWeek: availabilities.dayOfWeek,
      startTime: availabilities.startTime,
      endTime: availabilities.endTime,
      slotDuration: availabilities.slotDuration,
      meetingType: availabilities.meetingType,
      userName: users.name,
      userRole: users.role,
    })
    .from(availabilities)
    .innerJoin(users, eq(availabilities.userId, users.id))
    .where(isNull(users.deletedAt))
    .orderBy(availabilities.dayOfWeek, availabilities.startTime);

  // If Admin, filter out availabilities involving Super Admin
  if (currentUser.role === "ADMIN") {
    list = list.filter((a) => a.userRole !== "SUPER_ADMIN");
  }

  return list;
}

export async function saveAvailabilities(userId: string, slotsData: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  meetingType: "VIRTUAL" | "IN_PERSON" | "BOTH";
}[]) {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  const resolvedUserId = await resolveUserId(db, userId);

  // Authorization check
  if (currentUser.id !== resolvedUserId && currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
    throw new Error("No tienes permisos para modificar la disponibilidad de este usuario.");
  }

  // Admin cannot modify Super Admin availabilities
  if (currentUser.role === "ADMIN") {
    const targetUserArr = await db.select().from(users).where(eq(users.id, resolvedUserId));
    if (targetUserArr[0] && targetUserArr[0].role === "SUPER_ADMIN") {
      throw new Error("Unauthorized");
    }
  }

  // Remove existing availabilities
  await db.delete(availabilities).where(eq(availabilities.userId, resolvedUserId));

  // Insert new ones
  if (slotsData.length > 0) {
    for (const slot of slotsData) {
      await db.insert(availabilities).values({
        userId: resolvedUserId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDuration: slot.slotDuration,
        meetingType: slot.meetingType,
      });
    }
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/contact");
}

// ----------------------------------------------------
// TRANSFER ACTIONS
// ----------------------------------------------------

export async function transferCalendar(data: {
  fromSellerId: string;
  toSellerId: string;
  startDate: Date | string;
  endDate: Date | string;
  isDefinitive: boolean;
}) {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
    throw new Error("Solo los administradores pueden realizar traspasos de calendarios.");
  }
  const fromSellerIdResolved = await resolveUserId(db, data.fromSellerId);
  const toSellerIdResolved = await resolveUserId(db, data.toSellerId);

  // Admin cannot transfer calendar to/from Super Admin
  if (currentUser.role === "ADMIN") {
    const fromUserArr = await db.select().from(users).where(eq(users.id, fromSellerIdResolved));
    const toUserArr = await db.select().from(users).where(eq(users.id, toSellerIdResolved));
    if ((fromUserArr[0] && fromUserArr[0].role === "SUPER_ADMIN") || (toUserArr[0] && toUserArr[0].role === "SUPER_ADMIN")) {
      throw new Error("Unauthorized");
    }
  }
  const start = typeof data.startDate === "string" && data.startDate.length === 10
    ? new Date(`${data.startDate}T00:00:00-05:00`)
    : new Date(data.startDate);
  const end = typeof data.endDate === "string" && data.endDate.length === 10
    ? new Date(`${data.endDate}T23:59:59.999-05:00`)
    : new Date(data.endDate);

  if (data.isDefinitive) {
    // DEFINITIVE TRANSFER: Update all appointments directly in the DB
    await db
      .update(appointments)
      .set({
        sellerId: toSellerIdResolved,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(appointments.sellerId, fromSellerIdResolved),
          gte(appointments.date, start),
          isNull(appointments.deletedAt)
        )
      );
  } else {
    // TEMPORARY TRANSFER: Create transfer rule
    await db.insert(calendarTransfers).values({
      fromSellerId: fromSellerIdResolved,
      toSellerId: toSellerIdResolved,
      startDate: start,
      endDate: end,
    });
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/users");
}

export async function getTransfers() {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized: Solo los administradores pueden ver los traspasos.");
  }
  
  // Drizzle self-joins for user names
  const fromUsers = await db.select().from(users);
  const userMap = new Map<string, string>();
  fromUsers.forEach((u) => userMap.set(u.id, u.name));

  let list = await db
    .select()
    .from(calendarTransfers)
    .orderBy(calendarTransfers.startDate);

  // If Admin, filter out transfers involving Super Admin
  if (currentUser.role === "ADMIN") {
    const superAdminIds = new Set(fromUsers.filter(u => u.role === "SUPER_ADMIN").map(u => u.id));
    list = list.filter(t => !superAdminIds.has(t.fromSellerId) && !superAdminIds.has(t.toSellerId));
  }

  return list.map((t) => ({
    ...t,
    fromName: userMap.get(t.fromSellerId) || "Desconocido",
    toName: userMap.get(t.toSellerId) || "Desconocido",
  }));
}

export async function deleteTransfer(id: string) {
  const db = await getDb();
  const currentUser = await getSessionUser(db);
  if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
    throw new Error("Solo los administradores pueden eliminar traspasos.");
  }
  await db.delete(calendarTransfers).where(eq(calendarTransfers.id, id));

  revalidatePath("/dashboard/calendar");
}

export async function createProspectAction(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  unitId?: string;
}) {
  const db = await getDb();
  let prospectId = "";

  const cleanEmail = data.email.trim().toLowerCase();
  const existingProspects = await db
    .select()
    .from(prospects)
    .where(eq(prospects.email, cleanEmail));

  if (existingProspects.length > 0) {
    prospectId = existingProspects[0].id;
    await db
      .update(prospects)
      .set({
        name: data.name,
        phone: data.phone || existingProspects[0].phone,
        address: data.address || existingProspects[0].address,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, prospectId));
  } else {
    const [newProspect] = await db
      .insert(prospects)
      .values({
        name: data.name,
        email: cleanEmail,
        phone: data.phone || null,
        address: data.address || null,
      })
      .returning();
    prospectId = newProspect.id;
  }

  if (data.unitId) {
    // Check if the link already exists
    const existingLinks = await db
      .select()
      .from(prospectUnits)
      .where(
        and(
          eq(prospectUnits.prospectId, prospectId),
          eq(prospectUnits.unitId, data.unitId)
        )
      );
    if (existingLinks.length === 0) {
      await db.insert(prospectUnits).values({
        prospectId,
        unitId: data.unitId,
      });
    }
  }

  return { success: true, prospectId };
}
