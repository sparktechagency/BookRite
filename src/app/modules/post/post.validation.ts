import { z } from "zod"

const createPostZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    price: z.string({ required_error: 'Price is required' }),
    price_breakdown: z.string({ required_error: 'Price Breakdown is required' }),
    description: z.string({ required_error: 'Description is required' }),
    category: z.string({ required_error: 'Category is required' }),
    location: z.string({ required_error: 'Location is required' })
  })
})

const updatePostZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    price: z
      .union([z.string().transform((val) => parseFloat(val)), z.number()])
      .refine((val:any) => !isNaN(val), { message: "Price must be a valid number." }).optional(),
    price_breakdown: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    location: z.string().optional()
  }),
})

export const PostValidation = {
  createPostZodSchema,
  updatePostZodSchema,
}
