import { z } from 'zod';
const isValidObjectId = (value: string) => /^[0-9a-fA-F]{24}$/.test(value);
export const ServiceWcValidation = {
  createServiceZodSchema: z.object({
    body: z.object({
      serviceName: z.string().min(1, { message: "Service name is required" }),
      serviceDescription: z.string().min(1, { message: "Service description is required" }),
      price: z.string().min(1, { message: "Price is required" }),
      category: z.string().min(1, { message: "Category is required" }),
    }),
  }),



//   createServiceZodSchema: z.object({
//     serviceName: z
//       .string()
//       .min(1, { message: "Service name is required" })
//       .max(100, { message: "Service name must not exceed 100 characters" }),
//     serviceDescription: z
//       .string()
//       .min(1, { message: "Service description is required" })
//       .max(500, { message: "Service description must not exceed 500 characters" }),
//     category: z
//       .string()
//       .min(1, { message: "Category is required" })
//       .refine(isValidObjectId, { message: "Invalid category ID format" }),
//     // Note: image is handled separately through file upload
//   }),

updateServiceZodSchema: z.object({
    serviceName: z
      .string()
      .min(1, { message: "Service name is required" })
      .max(100, { message: "Service name must not exceed 100 characters" })
      .optional(),
    
    serviceDescription: z
      .string()
      .min(1, { message: "Service description is required" })
      .max(500, { message: "Service description must not exceed 500 characters" })
      .optional(),
    
    image: z
      .string()
      .min(1, { message: "Service image URL is required" })
      .max(500, { message: "Service image URL must not exceed 500 characters" })
      .optional(),
    
    category: z
      .string()
      .min(1, { message: "Category is required" })
      .max(100, { message: "Category name must not exceed 100 characters" })
      .optional()
  }).refine(data => {
    // Ensure at least one field is provided for update
    return Object.keys(data).length > 0;
  }, {
    message: "At least one field must be provided for update"
  })
};

