import { randomUUID } from "node:crypto";
import { getPrismaClient } from "./prisma";
import { DEMO_TEAM_ID } from "./scheduling-data";
import type {
  FeatureInput,
  ManagedFeature,
  ManagedParticipant,
  ManagedRoom,
  ManagedWindow,
  ParticipantInput,
  RoomInput,
} from "@/scheduling";
import type { ParticipantRole } from "@/scheduling";

type PrismaParticipantRole = "REQUIRED" | "OPTIONAL";

export class FeatureSlugError extends Error {
  constructor() {
    super("A feature label must contain at least one letter or number.");
    this.name = "FeatureSlugError";
  }
}

// ----- Participants -------------------------------------------------------

export async function listParticipants(): Promise<ManagedParticipant[]> {
  const prisma = getPrismaClient();
  const members = await prisma.teamMember.findMany({
    where: { teamId: DEMO_TEAM_ID },
    include: { user: { include: { availabilityWindows: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return members.map((member) => ({
    id: member.userId,
    name: member.user.name,
    defaultRole: fromPrismaRole(member.defaultRole),
    availability: member.user.availabilityWindows
      .map(toWindow)
      .sort(byStart),
  }));
}

export async function createParticipant(
  input: ParticipantInput,
): Promise<ManagedParticipant> {
  const prisma = getPrismaClient();
  const id = `user-${randomUUID()}`;

  await prisma.$transaction(async (tx) => {
    await tx.user.create({ data: { id, name: input.name.trim() } });
    await tx.teamMember.create({
      data: {
        teamId: DEMO_TEAM_ID,
        userId: id,
        defaultRole: toPrismaRole(input.defaultRole),
      },
    });
    await tx.availabilityWindow.createMany({
      data: input.availability.map((window) => ({
        userId: id,
        ...fromWindow(window),
      })),
    });
  });

  return loadParticipant(id);
}

export async function updateParticipant(
  id: string,
  input: ParticipantInput,
): Promise<ManagedParticipant | null> {
  const prisma = getPrismaClient();
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: DEMO_TEAM_ID, userId: id } },
  });

  if (!member) {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { name: input.name.trim() },
    });
    await tx.teamMember.update({
      where: { teamId_userId: { teamId: DEMO_TEAM_ID, userId: id } },
      data: { defaultRole: toPrismaRole(input.defaultRole) },
    });
    await tx.availabilityWindow.deleteMany({ where: { userId: id } });
    await tx.availabilityWindow.createMany({
      data: input.availability.map((window) => ({
        userId: id,
        ...fromWindow(window),
      })),
    });
  });

  return loadParticipant(id);
}

export async function deleteParticipant(id: string): Promise<boolean> {
  const prisma = getPrismaClient();
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: DEMO_TEAM_ID, userId: id } },
  });

  if (!member) {
    return false;
  }

  await prisma.user.delete({ where: { id } });
  return true;
}

async function loadParticipant(id: string): Promise<ManagedParticipant> {
  const prisma = getPrismaClient();
  const member = await prisma.teamMember.findUniqueOrThrow({
    where: { teamId_userId: { teamId: DEMO_TEAM_ID, userId: id } },
    include: { user: { include: { availabilityWindows: true } } },
  });

  return {
    id: member.userId,
    name: member.user.name,
    defaultRole: fromPrismaRole(member.defaultRole),
    availability: member.user.availabilityWindows.map(toWindow).sort(byStart),
  };
}

// ----- Rooms --------------------------------------------------------------

export async function listRooms(): Promise<ManagedRoom[]> {
  const prisma = getPrismaClient();
  const rooms = await prisma.room.findMany({
    where: { teamId: DEMO_TEAM_ID },
    include: { features: true, availabilityWindows: true },
    orderBy: { name: "asc" },
  });

  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    featureIds: room.features.map((feature) => feature.featureId).sort(),
    availability: room.availabilityWindows.map(toWindow).sort(byStart),
  }));
}

export async function createRoom(input: RoomInput): Promise<ManagedRoom> {
  const prisma = getPrismaClient();
  const id = `room-${randomUUID()}`;

  await prisma.$transaction(async (tx) => {
    await tx.room.create({
      data: {
        id,
        teamId: DEMO_TEAM_ID,
        name: input.name.trim(),
        capacity: input.capacity,
      },
    });
    await tx.roomFeatureOnRoom.createMany({
      data: input.featureIds.map((featureId) => ({ roomId: id, featureId })),
    });
    await tx.roomAvailabilityWindow.createMany({
      data: input.availability.map((window) => ({
        roomId: id,
        ...fromWindow(window),
      })),
    });
  });

  return loadRoom(id);
}

export async function updateRoom(
  id: string,
  input: RoomInput,
): Promise<ManagedRoom | null> {
  const prisma = getPrismaClient();
  const existing = await prisma.room.findFirst({
    where: { id, teamId: DEMO_TEAM_ID },
  });

  if (!existing) {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.room.update({
      where: { id },
      data: { name: input.name.trim(), capacity: input.capacity },
    });
    await tx.roomFeatureOnRoom.deleteMany({ where: { roomId: id } });
    await tx.roomFeatureOnRoom.createMany({
      data: input.featureIds.map((featureId) => ({ roomId: id, featureId })),
    });
    await tx.roomAvailabilityWindow.deleteMany({ where: { roomId: id } });
    await tx.roomAvailabilityWindow.createMany({
      data: input.availability.map((window) => ({
        roomId: id,
        ...fromWindow(window),
      })),
    });
  });

  return loadRoom(id);
}

export async function deleteRoom(id: string): Promise<boolean> {
  const prisma = getPrismaClient();
  const existing = await prisma.room.findFirst({
    where: { id, teamId: DEMO_TEAM_ID },
  });

  if (!existing) {
    return false;
  }

  await prisma.room.delete({ where: { id } });
  return true;
}

async function loadRoom(id: string): Promise<ManagedRoom> {
  const prisma = getPrismaClient();
  const room = await prisma.room.findUniqueOrThrow({
    where: { id },
    include: { features: true, availabilityWindows: true },
  });

  return {
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    featureIds: room.features.map((feature) => feature.featureId).sort(),
    availability: room.availabilityWindows.map(toWindow).sort(byStart),
  };
}

// ----- Features -----------------------------------------------------------

export async function listFeatures(): Promise<ManagedFeature[]> {
  const prisma = getPrismaClient();
  const features = await prisma.roomFeature.findMany({
    orderBy: { label: "asc" },
  });
  return features.map((feature) => ({ id: feature.id, label: feature.label }));
}

export async function createFeature(
  input: FeatureInput,
): Promise<ManagedFeature> {
  const prisma = getPrismaClient();
  const id = slugify(input.label);

  if (!id) {
    throw new FeatureSlugError();
  }

  const feature = await prisma.roomFeature.create({
    data: { id, label: input.label.trim() },
  });
  return { id: feature.id, label: feature.label };
}

export async function updateFeature(
  id: string,
  input: FeatureInput,
): Promise<ManagedFeature | null> {
  const prisma = getPrismaClient();
  const existing = await prisma.roomFeature.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  const feature = await prisma.roomFeature.update({
    where: { id },
    data: { label: input.label.trim() },
  });
  return { id: feature.id, label: feature.label };
}

export async function deleteFeature(id: string): Promise<boolean> {
  const prisma = getPrismaClient();
  const existing = await prisma.roomFeature.findUnique({ where: { id } });

  if (!existing) {
    return false;
  }

  await prisma.roomFeature.delete({ where: { id } });
  return true;
}

// ----- Helpers ------------------------------------------------------------

function toWindow(window: { start: Date; end: Date }): ManagedWindow {
  return { start: window.start.toISOString(), end: window.end.toISOString() };
}

function fromWindow(window: ManagedWindow): { start: Date; end: Date } {
  return { start: new Date(window.start), end: new Date(window.end) };
}

function byStart(a: ManagedWindow, b: ManagedWindow) {
  return a.start.localeCompare(b.start);
}

function toPrismaRole(role: ParticipantRole): PrismaParticipantRole {
  return role === "required" ? "REQUIRED" : "OPTIONAL";
}

function fromPrismaRole(role: PrismaParticipantRole): ParticipantRole {
  return role === "REQUIRED" ? "required" : "optional";
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
