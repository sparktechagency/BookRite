import { PurchaseModel } from "./subscription.model";
import { User as UserModel } from "../user/user.model";
import {
    verifySubscription,
    acknowledgeSubscription,
    verifyInAppProduct,
    acknowledgeInAppProduct,
} from "../../../helpers/googlePlay";
import { FilterQuery } from "mongoose";

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

export async function handleGooglePlayVerify(input: VerifyInput) {
    const {
        userId,
        verificationData: { orderId, productId, purchaseToken, autoRenewing },
    } = input;

    let existing = await PurchaseModel.findOne({ purchaseToken });
    if (existing) {
        return existing;
    }

    // 2) Subscription না one-time product—এখানে তোমার ক্ষেত্রে autoRenewing=true => Subscription
    const isSubscription = !!autoRenewing; // অথবা productId ম্যাপিং ব্যবহার করতে পারো

    if (isSubscription) {
        const sub = await verifySubscription(productId, purchaseToken);

        const acknowledged = sub.acknowledgementState === 1;
        const autoRenew = Boolean(sub.autoRenewing);
        const paymentState = typeof sub.paymentState === "number" ? sub.paymentState : undefined;

        const expiryTime = sub.expiryTimeMillis ? new Date(Number(sub.expiryTimeMillis)) : undefined;

        // 3) acknowledge (Play দাবী করে)
        if (!acknowledged) {
            await acknowledgeSubscription(productId, purchaseToken);
        }

        // 4) status নির্ধারণ
        let status: "ACTIVE" | "CANCELED" | "PENDING" | "EXPIRED" = "PENDING";
        const now = new Date();
        if (expiryTime && expiryTime > now) {
            status = "ACTIVE";
        } else if (expiryTime && expiryTime <= now) {
            status = "EXPIRED";
        }
        if (typeof sub.cancelReason === "number") {
            status = "CANCELED"; // user canceled / payment issue ইত্যাদি
        }
        if (paymentState === 2) { // pending (কিছু অঞ্চলে pending state আলাদা)
            status = "PENDING";
        }

        // 5) DB তে সেভ
        const doc = await PurchaseModel.create({
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

        // 6) ইউজার প্রো স্ট্যাটাস আপডেট
        if (status === "ACTIVE" && expiryTime) {
            await UserModel.findByIdAndUpdate(
                userId,
                { proActive: true, proExpiresAt: expiryTime },
                { new: true }
            );
        } else if (status === "EXPIRED" || status === "CANCELED") {
            // চাইলে এখানে proActive=false করতে পারো, কিন্তু সাধারণত RTDN ওয়েবহুকেও হ্যান্ডেল করা হয়
            await UserModel.findByIdAndUpdate(
                userId,
                { proActive: false, proExpiresAt: null },
                { new: true }
            );
        }

        return doc;
    } else {
        // One-time in-app product (যদি future-এ লাগে)
        const prod = await verifyInAppProduct(productId, purchaseToken);
        const acknowledged = prod.acknowledgementState === 1;
        if (!acknowledged) {
            await acknowledgeInAppProduct(productId, purchaseToken);
        }

        const status = prod.purchaseState === 0 ? "ACTIVE" : "PENDING";

        const doc = await PurchaseModel.create({
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

        // one-time হলে সাথে সাথে entitlement unlock করো (যেমন coins, lifetime, ইত্যাদি)
        await UserModel.findByIdAndUpdate(
            userId,
            { proActive: true, proExpiresAt: null },
            { new: true }
        );

        return doc;
    }
}

export type PurchaseFilters = {
    userId?: string;
    productId?: string;
    platform?: "google_play";
    status?: "ACTIVE" | "CANCELED" | "PENDING" | "EXPIRED";
    search?: string; // orderId partial search
};

export async function listPurchases(
    filters: PurchaseFilters,
    page = 1,
    limit = 20,
    sort = "-createdAt"
) {
    const query: FilterQuery<any> = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.productId) query.productId = filters.productId;
    if (filters.platform) query.platform = filters.platform;
    if (filters.status) query.status = filters.status;

    if (filters.search) {
        query.$or = [
            { orderId: { $regex: filters.search, $options: "i" } },
            { productId: { $regex: filters.search, $options: "i" } },
        ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        PurchaseModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        PurchaseModel.countDocuments(query),
    ]);

    return {
        items,
        meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
}

export async function getPurchaseById(id: string) {
    const doc = await PurchaseModel.findById(id).lean();
    return doc; // null হলে controller হ্যান্ডেল করবে
}

export async function listPurchasesByUser(
    userId: string,
    page = 1,
    limit = 20,
    sort = "-createdAt"
) {
    return listPurchases({ userId }, page, limit, sort);
}