import { StatusCodes } from "http-status-codes";
import { FilterQuery } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { PurchaseModel } from "./subscription.model";
import { IPurchase, IPurchaseDoc, PurchaseStatus } from "./subscription.interface";
import { User as UserModel } from "../user/user.model";
import {
    verifySubscription,
    acknowledgeSubscription,
    verifyInAppProduct,
    acknowledgeInAppProduct,
} from "../../../helpers/googlePlay";
import { response } from "express";
import { verifyAppleReceipt } from "../../../helpers/appleStoreHelper";

// type VerifyInput = {
//     userId: string;
//     verificationData: {
//         orderId: string;
//         packageName: string;
//         productId: string;
//         purchaseToken: string;
//         autoRenewing?: boolean;
//         acknowledged?: boolean;
//     };
// };
export type VerifyInput = {
    userId: string;
    platform: "google_play" | "apple_store"; 
    verificationData: {
        orderId?: string;
        packageName: string;
        productId: string;
        purchaseToken?: string; 
        receiptData?: string;  
        autoRenewing?: boolean;
        acknowledged?: boolean;
    };
};

export type PurchaseFilters = {
    userId?: string;
    productId?: string;
    platform?: "google_play";
    status?: PurchaseStatus;
    search?: string;
};

const isAcknowledged = (state?: number | null) => state === 1;


const createOrReturnExistingPurchase = async (purchaseToken: string) => {
    return await PurchaseModel.findOne({ purchaseToken });
};

    
const verifyPurchaseToDB = async (payload: VerifyInput): Promise<IPurchaseDoc> => {
    const { platform } = payload;

    if (platform === "apple_store") {
        return await verifyIosPurchaseToDB(payload);
    } 
    
    return await verifyAndroidPurchaseToDB(payload);
};

// 2. ANDROID LOGIC (Existing)
const verifyAndroidPurchaseToDB = async (payload: VerifyInput): Promise<IPurchaseDoc> => {
    const {
        userId,
        verificationData: { orderId, productId, purchaseToken, autoRenewing },
    } = payload;

    if (!purchaseToken) throw new Error("Purchase token missing for Android");

    const existing = await createOrReturnExistingPurchase(purchaseToken);
    if (existing) return existing;

    const isSub = !!autoRenewing;

    if (isSub) {
        const sub = await verifySubscription(productId, purchaseToken);
        const acknowledged = isAcknowledged(sub.acknowledgementState);
        const autoRenew = !!sub.autoRenewing;
        const paymentState = typeof sub.paymentState === "number" ? sub.paymentState : undefined;
        const expiryTime = sub.expiryTimeMillis ? new Date(Number(sub.expiryTimeMillis)) : undefined;

        if (!acknowledged) {
            await acknowledgeSubscription(productId, purchaseToken);
        }

        let status: PurchaseStatus = "PENDING";
        const now = new Date();
        if (expiryTime && expiryTime > now) status = "ACTIVE";
        else if (expiryTime && expiryTime <= now) status = "EXPIRED";
        if (typeof sub.cancelReason === "number") status = "CANCELED";
        if (paymentState === 2) status = "PENDING";

        const created = await PurchaseModel.create({
            userId,
            platform: "google_play",
            productId,
            orderId,
            purchaseToken,
            acknowledged: true,
            autoRenewing: autoRenew,
            purchaseState: paymentState,
            expiryTime,
            raw: sub,
            status,
        });

        await updateUserStatus(userId, status, expiryTime);
        return created;
    } else {
        // One-time product
        const prod = await verifyInAppProduct(productId, purchaseToken);
        const acknowledged = isAcknowledged(prod.acknowledgementState);
        
        if (!acknowledged) {
            await acknowledgeInAppProduct(productId, purchaseToken);
        }

        const status: PurchaseStatus = prod.purchaseState === 0 ? "ACTIVE" : "PENDING";

        const created = await PurchaseModel.create({
            userId,
            platform: "google_play",
            productId,
            orderId,
            purchaseToken,
            acknowledged: true,
            autoRenewing: false,
            purchaseState: prod.purchaseState,
            raw: prod,
            status,
        });

        await updateUserStatus(userId, status, null);
        return created;
    }
};

// 3. iOS LOGIC (New)
const verifyIosPurchaseToDB = async (payload: VerifyInput): Promise<IPurchaseDoc> => {
    const {
        userId,
        verificationData: { productId, receiptData },
    } = payload;

    if (!receiptData) throw new Error("Receipt data is required for iOS");

    // 1. Verify with Apple
    const transaction = await verifyAppleReceipt(receiptData);

    const originalTransId = transaction.original_transaction_id;
    
    const existing = await createOrReturnExistingPurchase(originalTransId);
    if (existing) return existing;

    // 3. Determine Status
    const expiresDateMs = transaction.expires_date_ms ? Number(transaction.expires_date_ms) : null;
    const now = Date.now();
    let status: PurchaseStatus = "PENDING";

    if (expiresDateMs && expiresDateMs > now) status = "ACTIVE";
    else if (expiresDateMs && expiresDateMs <= now) status = "EXPIRED";
    
    // Apple sends cancellation_date_ms if the transaction was refunded/revoked
    if (transaction.cancellation_date_ms) status = "CANCELED";
    
   
    if (!expiresDateMs && !transaction.cancellation_date_ms) status = "ACTIVE";

    const expiryTime = expiresDateMs ? new Date(expiresDateMs) : undefined;

    const created = await PurchaseModel.create({
        userId,
        platform: "apple_store",
        productId: transaction.product_id,
        orderId: transaction.transaction_id,
        purchaseToken: originalTransId, 
        acknowledged: true,
        autoRenewing: !!expiresDateMs, 
        purchaseState: 0, 
        expiryTime,
        raw: transaction,
        status,
    });


    await updateUserStatus(userId, status, expiryTime);

    return created;
};


const updateUserStatus = async (userId: string, status: string, expiryTime?: Date | null) => {
    if (status === "ACTIVE") {
        await UserModel.findByIdAndUpdate(userId, { 
            proActive: true, 
            proExpiresAt: expiryTime || null 
        }, { new: true });
    } else if (status === "EXPIRED" || status === "CANCELED") {
        await UserModel.findByIdAndUpdate(userId, { 
            proActive: false, 
            proExpiresAt: null 
        }, { new: true });
    }
};


//   const  verifyAndroidPurchaseToDB = async (payload: VerifyInput): Promise<IPurchaseDoc> => {
//         const {
//             userId,
//             verificationData: { orderId, productId, purchaseToken, autoRenewing },
//         } = payload;

//         const existing = await createOrReturnExistingPurchase(purchaseToken);
//         if (existing) return existing;

//         const isSub = !!autoRenewing;

//         if (isSub) {
//             const sub = await verifySubscription(productId, purchaseToken);

//             const acknowledged = isAcknowledged(sub.acknowledgementState);
//             const autoRenew = !!sub.autoRenewing;
//             const paymentState = typeof sub.paymentState === "number" ? sub.paymentState : undefined;
//             const expiryTime = sub.expiryTimeMillis ? new Date(Number(sub.expiryTimeMillis)) : undefined;

//             if (!acknowledged) {
//                 await acknowledgeSubscription(productId, purchaseToken);
//             }

//             let status: PurchaseStatus = "PENDING";
//             const now = new Date();
//             if (expiryTime && expiryTime > now) status = "ACTIVE";
//             else if (expiryTime && expiryTime <= now) status = "EXPIRED";
//             if (typeof sub.cancelReason === "number") status = "CANCELED";
//             if (paymentState === 2) status = "PENDING";

//             const created = await PurchaseModel.create({
//                 userId,
//                 platform: "google_play",
//                 productId,
//                 orderId,
//                 purchaseToken,
//                 acknowledged: true,
//                 autoRenewing: autoRenew,
//                 purchaseState: paymentState,
//                 expiryTime,
//                 raw: sub,
//                 status,
//             });

//             if (status === "ACTIVE" && expiryTime) {
//                 await UserModel.findByIdAndUpdate(userId, { proActive: true, proExpiresAt: expiryTime }, { new: true });
//             } else if (status === "EXPIRED" || status === "CANCELED") {
//                 await UserModel.findByIdAndUpdate(userId, { proActive: false, proExpiresAt: null }, { new: true });
//             }

//             // ⬅️ THIS was missing
//             return created;
//         } else {
//             // One-time product flow
//             const prod = await verifyInAppProduct(productId, purchaseToken);
//             const acknowledged = isAcknowledged(prod.acknowledgementState);
//             if (!acknowledged) {
//                 await acknowledgeInAppProduct(productId, purchaseToken);
//             }

//             const status: PurchaseStatus = prod.purchaseState === 0 ? "ACTIVE" : "PENDING";

//             const created = await PurchaseModel.create({
//                 userId,
//                 platform: "google_play",
//                 productId,
//                 orderId,
//                 purchaseToken,
//                 acknowledged: true,
//                 autoRenewing: false,
//                 purchaseState: prod.purchaseState,
//                 raw: prod,
//                 status,
//             });

//             await UserModel.findByIdAndUpdate(userId, { proActive: true, proExpiresAt: null }, { new: true });

//             return created;
//         }
//     }


   const listPurchasesFromDB = async (
        filters: PurchaseFilters,
        page = 1,
        limit = 20,
        sort = "-createdAt"
    ) => {
        const query: FilterQuery<IPurchase> = {};

        if (filters.userId) query.userId = filters.userId as any;
        if (filters.productId) query.productId = filters.productId;
        if (filters.platform) query.platform = filters.platform;
        if (filters.status) query.status = filters.status;

        if (filters.search) {
            (query as any).$or = [
                { orderId: { $regex: filters.search, $options: "i" } },
                { productId: { $regex: filters.search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            PurchaseModel.find(query).sort(String(sort)).skip(skip).limit(limit).lean(),
            PurchaseModel.countDocuments(query),
        ]);

        return {
            items,
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        };
    };

   const getPurchaseByIdFromDB = async (id: string) => {
        const doc = await PurchaseModel.findById(id).lean();
        return doc;
    }

    const listPurchasesByUserFromDB = async (userId: string, page = 1, limit = 20, sort = "-createdAt") => {
        return listPurchasesFromDB({ userId }, page, limit, sort);
    }

export const InAppPurchaseService = {
    // verifyAndroidPurchaseToDB,
    verifyPurchaseToDB,
    listPurchasesFromDB,
    getPurchaseByIdFromDB,
    listPurchasesByUserFromDB,
};