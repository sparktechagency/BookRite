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
import { verifyApplePurchaseV2 } from "../../../helpers/appleStoreHelper";

export type VerifyInput = {
    userId: string;
    platform: "google_play" | "app_store"; 
    verificationData: {
        orderId?: string;
        packageName: string;
        productId: string;
        purchaseToken?: string; 
        // receiptData?: string;  
        transactionId?: string;
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

    if (platform === "app_store") {
        return await verifyIosPurchaseToDB(payload);
    } 
    
    // Default to Android
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
// const verifyIosPurchaseToDB = async (payload: VerifyInput): Promise<IPurchaseDoc> => {
//     const {
//         userId,
//         verificationData: { transactionId }, 
//     } = payload;

//     if (!transactionId) {
//         throw new Error("Transaction ID is required for iOS StoreKit 2 verification");
//     }

//     const transaction = await verifyApplePurchaseV2(transactionId);

//     const originalTransId = transaction.originalTransactionId;

//     const existing = await createOrReturnExistingPurchase(originalTransId);
//     if (existing) return existing;

//     const expiresDateMs = transaction.expiresDate; 
//     const revocationDateMs = transaction.revocationDate; 

//     let status: PurchaseStatus = "PENDING";
//     const now = Date.now();

//     if (expiresDateMs && expiresDateMs > now) {
//         status = "ACTIVE";
//     } else if (expiresDateMs && expiresDateMs <= now) {
//         status = "EXPIRED";
//     }

//     if (revocationDateMs) {
//         status = "CANCELED";
//     }

//     if (!expiresDateMs && !revocationDateMs) {
//         status = "ACTIVE";
//     }

//     const expiryTime = expiresDateMs ? new Date(expiresDateMs) : undefined;

//     const created = await PurchaseModel.create({
//         userId,
//         platform: "app_store",
//         productId: transaction.productId,
//         orderId: transaction.transactionId, 
//         purchaseToken: originalTransId,     
//         acknowledged: true,               
//         autoRenewing: transaction.type === "Auto-Renewable Subscription",
//         purchaseState: 0, 
//         expiryTime,
//         raw: transaction, 
//         status,
//     });
//     await updateUserStatus(userId, status, expiryTime);

//     if (status === "ACTIVE") {
//         await UserModel.findByIdAndUpdate(userId, { 
//             proActive: true, 
//             isSubscribed: true,
//             proExpiresAt: expiryTime || null 
//         }, { new: true });
//     } else {
//          await UserModel.findByIdAndUpdate(userId, { 
//             proActive: false, 
//             proExpiresAt: null,
//             isSubscribed: false
//         }, { new: true });
//     }
//     await updateUserStatus(userId, status, null);
//     return created;
// };
const verifyIosPurchaseToDB = async (payload: VerifyInput): Promise<IPurchaseDoc> => {
    const {
        userId,
        verificationData: { transactionId }, 
    } = payload;

    if (!transactionId) {
        throw new Error("Transaction ID is required for iOS StoreKit 2 verification");
    }

    const transaction = await verifyApplePurchaseV2(transactionId);
    const originalTransId = transaction.originalTransactionId;

    const existing = await createOrReturnExistingPurchase(originalTransId);
    if (existing) return existing;

    const expiresDateMs = transaction.expiresDate; 
    const revocationDateMs = transaction.revocationDate; 

    let status: PurchaseStatus = "PENDING";
    const now = Date.now();

    if (expiresDateMs && expiresDateMs > now) {
        status = "ACTIVE";
    } else if (expiresDateMs && expiresDateMs <= now) {
        status = "EXPIRED";
    }

    if (revocationDateMs) {
        status = "CANCELED";
    }

    if (!expiresDateMs && !revocationDateMs) {
        status = "ACTIVE";
    }

    const expiryTime = expiresDateMs ? new Date(expiresDateMs) : null;

    const created = await PurchaseModel.create({
        userId,
        platform: "app_store",
        productId: transaction.productId,
        orderId: transaction.transactionId, 
        purchaseToken: originalTransId,     
        acknowledged: true,               
        autoRenewing: transaction.type === "Auto-Renewable Subscription",
        purchaseState: 0, 
        expiryTime,
        raw: transaction, 
        status,
    });

    await updateUserStatus(userId, status, expiryTime);

    return created;
};

// const updateUserStatus = async (userId: string, status: string, expiryTime?: Date | null) => {
//     if (status === "ACTIVE") {
//         await UserModel.findByIdAndUpdate(userId, { 
//             proActive: true, 
//             proExpiresAt: expiryTime || null, 
//             isSubscribed: true
//         }, { new: true });
//     } else if (status === "EXPIRED" || status === "CANCELED") {
//         await UserModel.findByIdAndUpdate(userId, { 
//             proActive: false, 
//             proExpiresAt: null 
//         }, { new: true });
//     }
// };

const updateUserStatus = async (userId: string, status: string, expiryTime?: Date | null) => {
    if (status === "ACTIVE") {
        await UserModel.findByIdAndUpdate(userId, { 
            proActive: true, 
            proExpiresAt: expiryTime || null, 
            isSubscribed: true
        }, { new: true });
    } else if (status === "EXPIRED" || status === "CANCELED") {
        await UserModel.findByIdAndUpdate(userId, { 
            proActive: false, 
            proExpiresAt: null,
            isSubscribed: false 
        }, { new: true });
    }
};

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