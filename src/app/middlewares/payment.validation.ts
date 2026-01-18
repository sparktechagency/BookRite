import { z } from 'zod';

const createPaymentSessionZodSchema = z.object({
  body: z.object({
    bookingId: z.string({
      required_error: 'Booking ID is required',
    }),
  }),
});

const createRefundZodSchema = z.object({
  body: z.object({
    bookingId: z.string({
      required_error: 'Booking ID is required',
    }),
  }),
});

export const PaymentValidation = {
  createPaymentSessionZodSchema,
  createRefundZodSchema,
};