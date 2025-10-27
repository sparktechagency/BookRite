import { z } from "zod";

export const AndroidVerificationDataSchema = z.object({
    orderId: z.string(),
    packageName: z.string(),
    productId: z.string(),
    purchaseTime: z.number().optional(),
    purchaseState: z.number().optional(),
    purchaseToken: z.string(),
    quantity: z.number().optional(),
    autoRenewing: z.boolean().optional(),
    acknowledged: z.boolean().optional(),
});

export const VerifyBodySchema = z.object({
    userId: z.string(),
    source: z.enum(["google_play"]),
    verificationData: AndroidVerificationDataSchema,
});
