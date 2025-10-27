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

type VerifyInput = {
    userId: string;
    verificationData: {
        orderId: string;
        packageName: string;
        productId: string;
        purchaseToken: string;
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
    const existing = await PurchaseModel.findOne({ purchaseToken });
    return existing;
};

export const InAppPurchaseService = {
    verifyAndroidPurchaseToDB: async (payload: VerifyInput): Promise<IPurchaseDoc> => {
        const {
            userId,
            verificationData: { orderId, productId, purchaseToken, autoRenewing },
        } = payload;

        const existing = await createOrReturnExistingPurchase(purchaseToken);
        if (existing) return existing;

        const isSub = !!autoRenewing;

        if (isSub) {
            const sub = await verifySubscription(productId, purchaseToken);

            const acknowledged = isAcknowledged(sub.acknowledgementState);
            const autoRenew = !!sub.autoRenewing;
            const paymentState = typeof sub.paymentState === "number" ? sub.paymentState : undefined;
            const expiryTime = sub.expiryTimeMillis ? new Date(Number(sub.expiryTimeMillis)) : undefined;

            // Play requires acknowledge
            if (!acknowledged) {
                await acknowledgeSubscription(productId, purchaseToken);
            }

            // derive status
            let status: PurchaseStatus = "PENDING";
            const now = new Date();
            if (expiryTime && expiryTime > now) status = "ACTIVE";
            if (expiryTime && expiryTime <= now) status = "EXPIRED";
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
            } as unknown) as IPurchase;

            if (!created) {
                throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Purchase");
            }

            // Update user entitlement
            if (status === "ACTIVE" && expiryTime) {
                await UserModel.findByIdAndUpdate(userId, { proActive: true, proExpiresAt: expiryTime }, { new: true });
            } else if (status === "EXPIRED" || status === "CANCELED") {
                await UserModel.findByIdAndUpdate(userId, { proActive: false, proExpiresAt: null }, { new: true });
            }

            created;
        }

        // One-time in-app product flow
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
        } as unknown as IPurchase);

        if (!created) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Purchase");
        }

        await UserModel.findByIdAndUpdate(userId, { proActive: true, proExpiresAt: null }, { new: true });

        return created;
    },

    listPurchasesFromDB: async (
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
    },

    getPurchaseByIdFromDB: async (id: string) => {
        const doc = await PurchaseModel.findById(id).lean();
        return doc;
    },

    listPurchasesByUserFromDB: async (userId: string, page = 1, limit = 20, sort = "-createdAt") => {
        return InAppPurchaseService.listPurchasesFromDB({ userId }, page, limit, sort);
    },
};
