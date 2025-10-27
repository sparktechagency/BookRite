import { Types, HydratedDocument, Model } from "mongoose";

export type PurchasePlatform = "google_play";
export type PurchaseStatus = "ACTIVE" | "CANCELED" | "PENDING" | "EXPIRED";

export interface IPurchase {
    userId: Types.ObjectId;
    platform: PurchasePlatform;
    productId: string;
    orderId: string;
    purchaseToken: string;
    acknowledged: boolean;
    autoRenewing: boolean;
    purchaseState?: number;
    expiryTime?: Date;
    raw?: unknown;
    status: PurchaseStatus;
    createdAt: Date;
    updatedAt: Date;
}

export type IPurchaseDoc = HydratedDocument<IPurchase>;
export interface IPurchaseModel extends Model<IPurchase> { }
