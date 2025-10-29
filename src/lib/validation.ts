import { z } from "zod";

export const habitNameSchema = z
  .string()
  .trim()
  .min(1, "Habit name cannot be empty")
  .max(100, "Habit name must be less than 100 characters")
  .regex(/^[a-zA-Z0-9\s\-',.!?]+$/, "Habit name contains invalid characters");

export const journalContentSchema = z
  .string()
  .trim()
  .min(1, "Journal entry cannot be empty")
  .max(5000, "Journal entry must be less than 5000 characters");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name cannot be empty")
  .max(100, "Display name must be less than 100 characters");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");
