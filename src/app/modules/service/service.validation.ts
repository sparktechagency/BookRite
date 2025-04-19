import { z } from 'zod'

const createServiceZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Service name is required' })
  }),
})

const updateServiceZodSchema = z.object({
  body: z.object({
    name: z.string().optional()
  }),
})

export const ServiceValidation = {
  createServiceZodSchema,
  updateServiceZodSchema,
}
