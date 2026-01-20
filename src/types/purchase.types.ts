import { PurchaseStatus } from "../app/modules/inApp/subscription.interface";

export type AndroidVerifyInput = {
    userId: string;
    orderId?: string;
    packageName: string;
    productId: string;
    purchaseToken: string;
    autoRenewing?: boolean;
};

export type iOSVerifyInput = {
    userId: string;
    bundleId: string;
    productId: string;
    transactionId: string;
    verificationData: any;
    
};

export type PurchaseFilters = {
    userId?: string;
    productId?: string;
    platform?: "google_play" | "app_store";
    status?: PurchaseStatus;
    search?: string;
};