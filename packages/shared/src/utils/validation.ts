import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const staffRegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  storeName: z.string().min(1, 'Store name is required'),
  storeSlug: z
    .string()
    .min(3, 'At least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
})
export type StaffRegisterFormValues = z.infer<typeof staffRegisterSchema>

export const customerRegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters'),
})
export type CustomerRegisterFormValues = z.infer<typeof customerRegisterSchema>

export const storeSlugSchema = z
  .string()
  .min(1, 'Enter a store name or link')
  .transform((value) => {
    // Accepts a bare slug, a full storefront URL, or a `ywstore://store/<slug>` deep link.
    const trimmed = value.trim()
    const match = trimmed.match(/(?:store\/|\/)([a-z0-9-]+)\/?$/i)
    return (match?.[1] ?? trimmed).toLowerCase()
  })
