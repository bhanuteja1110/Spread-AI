import { z } from 'zod';

/**
 * Core domain models and interfaces
 */

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(['USER', 'ADMIN', 'MANAGER']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    metadata: z.object({
      totalCount: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
  });
