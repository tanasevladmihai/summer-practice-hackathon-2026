import { z } from "zod";
import {
  eventVisibilityModes,
  locationPrivacyModes,
  playIntensities,
  skillLevels
} from "../types/domain";

const nonEmptyText = z.string().trim().min(1).max(280);

export const registerSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(80)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128)
});

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  homeArea: z.string().trim().min(2).max(120),
  preferredRadiusKm: z.number().min(1).max(80),
  locationPrivacy: z.enum(locationPrivacyModes),
  allowsAiProfile: z.boolean(),
  coordinates: coordinatesSchema
});

export const sportPreferenceSchema = z.object({
  sportId: z.string().trim().min(2).max(40),
  skillLevel: z.enum(skillLevels),
  intensity: z.enum(playIntensities),
  preferredRoles: z.array(z.string().trim().min(1).max(40)).max(6)
});

export const availabilitySchema = z.object({
  showUpToday: z.boolean(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  note: z.string().trim().max(160).optional()
});

export const eventCreateSchema = z.object({
  title: z.string().trim().min(4).max(120),
  sportId: z.string().trim().min(2).max(40),
  imageUrl: z.string().url().optional().or(z.literal("")),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  visibility: z.enum(eventVisibilityModes),
  location: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(2).max(180),
    city: z.string().trim().min(2).max(80),
    coordinates: coordinatesSchema,
    priceEstimateCents: z.number().int().min(0).optional()
  }),
  skillRange: z.tuple([z.enum(skillLevels), z.enum(skillLevels)]),
  capacity: z.number().int().min(2).max(60),
  description: z.string().trim().min(10).max(1000)
});

export const joinEventSchema = z.object({
  status: z.enum(["joined", "confirmed", "waitlisted"]).default("joined")
});

export const messageCreateSchema = z.object({
  conversationId: z.string().trim().min(2).max(80),
  body: nonEmptyText,
  eventId: z.string().trim().min(2).max(80).optional()
});

export const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(3).max(180),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  byteSize: z.number().int().min(1).max(6_000_000)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type SportPreferenceInput = z.infer<typeof sportPreferenceSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;
