import { z } from 'zod'

const createServiceZodSchema = z.object({
  body: z.object({
    CategoryName: z.string({ required_error: 'Service Category name is required' })
  }),
})

const updateServiceZodSchema = z.object({
  body: z.object({
    CategoryName: z.string().optional()
  }),
})


const createServiceWcZodSchema = z.object({
  body: z.object({
    serviceName: z.string({ required_error: 'Service name is required' }),
  }),
})

// const updateServiceWcZodSchema = z.object({
//   body: z.object({
//     CategoryName: z.string().optional(),
//     CategoryImage: z.string().optional()
//   }),
// })

export const ServiceValidation = {
  createServiceZodSchema,
  updateServiceZodSchema,
  createServiceWcZodSchema,
}
