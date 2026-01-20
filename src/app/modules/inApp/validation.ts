import { z } from "zod";

const AndroidVerificationDataSchema = z.object({
    packageName: z.string(),
    productId: z.string(),
    purchaseToken: z.string(),
    orderId: z.string().optional(), 
    transactionId: z.string().optional(),
    purchaseTime: z.number().optional(),
    purchaseState: z.number().optional(),
    quantity: z.number().optional(),
    autoRenewing: z.boolean().optional(),
    acknowledged: z.boolean().optional(),
});

const IOSVerificationDataSchema = z.object({
    packageName: z.string(),
    productId: z.string(),
    transactionId: z.string(), 
    
    originalTransactionId: z.string().optional(),
    appAccountToken: z.string().optional(),
});

export const VerifyBodySchema = z.discriminatedUnion("source", [
    z.object({
        source: z.literal("google_play"),
        verificationData: AndroidVerificationDataSchema,
    }),

    z.object({
        source: z.literal("app_store"), 
        verificationData: IOSVerificationDataSchema,
    }),
]);

export type VerifyBody = z.infer<typeof VerifyBodySchema>;