import { z } from "zod";

/**
 * Validation for the six registration fields the team UI collects.
 *
 * Every string is trimmed before length checks, so "   " cannot satisfy a
 * min(1) and land whitespace in the database as a name.
 */
export const profileInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Full name contains unsupported characters"),

  // Deliberately permissive: this is an Indian college event, and callers send
  // "+91 98765 43210", "9876543210" or "098765-43210". Rejecting a real number
  // over formatting is worse than storing a variant, so only the digit count
  // is enforced.
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),

  // Modern Discord handles are 2–32 chars of [a-z0-9._]; legacy Name#1234 is
  // still accepted so an older account is not locked out.
  discordUsername: z
    .string()
    .trim()
    .min(2, "Discord username is too short")
    .max(64, "Discord username is too long")
    .regex(/^[a-zA-Z0-9._#]+$/, "Discord username contains unsupported characters"),

  year: z.coerce
    .number()
    .int("Year must be a whole number")
    .min(1, "Year must be between 1 and 4")
    .max(4, "Year must be between 1 and 4"),

  branch: z
    .string()
    .trim()
    .min(2, "Branch must be at least 2 characters")
    .max(50, "Branch must be at most 50 characters"),

  rollNumber: z
    .string()
    .trim()
}).superRefine((data, ctx) => {
  if (data.year === 1) {
    if (!/^\d{6}$/.test(data.rollNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admission number for 1st Year must be exactly 6 digits",
        path: ["rollNumber"],
      });
    }
  } else {
    if (!/^\d{10}$/.test(data.rollNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Roll number must be exactly 10 digits",
        path: ["rollNumber"],
      });
    }
  }
});
export type ProfileInputDto = z.infer<typeof profileInputSchema>;
