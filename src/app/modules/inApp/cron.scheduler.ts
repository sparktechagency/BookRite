import { UserValidation } from './../user/user.validation';
// src/app/modules/inApp/cron.scheduler.ts
import cron from "node-cron";
import { PurchaseModel } from "./subscription.model";
import { User as UserModel } from "../user/user.model";
import { IPurchase, PurchaseStatus } from "./subscription.interface";
import {
    verifySubscription,
    verifySubscriptionV2,
    verifyInAppProduct,
    acknowledgeSubscription,
    acknowledgeInAppProduct,
} from "../../../helpers/googlePlay";

const isAck = (st?: number | null) => st === 1;

function deriveStatusFromSub(sub: any): PurchaseStatus {
    const now = new Date();
    const expiry =
        sub?.expiryTimeMillis ? new Date(Number(sub.expiryTimeMillis)) :
            sub?.expiryTime ? new Date(Number(sub.expiryTime)) :
                undefined;

    const paymentState = typeof sub?.paymentState === "number" ? sub.paymentState : undefined;
    const canceled = typeof sub?.cancelReason === "number";

    if (expiry && expiry <= now) return "EXPIRED";
    if (canceled) return "CANCELED";
    if (expiry && expiry > now) return "ACTIVE";
    if (paymentState === 2) return "PENDING";
    return "PENDING";
}

async function refreshOnePurchase(p: IPurchase) {
    const { userId, productId, purchaseToken } = p;

    if (!productId || !purchaseToken) return;

    // Try as subscription v1 → v2 → product
    let sub: any | null = null;
    let prod: any | null = null;

    // SUB V1
    try {
        sub = await verifySubscription(productId, purchaseToken);
    } catch (e: any) {
        console.warn("[cron] sub v1 failed", e?.response?.status, e?.response?.data?.error?.message || e?.message);
    }

    // SUB V2
    if (!sub) {
        try {
            sub = await verifySubscriptionV2(purchaseToken);
        } catch (e2: any) {
            console.warn("[cron] sub v2 failed", e2?.response?.status, e2?.response?.data?.error?.message || e2?.message);
        }
    }

    // PRODUCT
    if (!sub) {
        try {
            prod = await verifyInAppProduct(productId, purchaseToken);
        } catch (e3: any) {
            console.error("[cron] product verify failed", e3?.response?.status, e3?.response?.data?.error?.message || e3?.message);
        }
    }

    if (sub) {
        // Acknowledge if needed
        if (!isAck(sub.acknowledgementState)) {
            try {
                await acknowledgeSubscription(productId, purchaseToken);
            } catch { }
        }

        const newStatus = deriveStatusFromSub(sub);
        const expiryTime =
            sub?.expiryTimeMillis ? new Date(Number(sub.expiryTimeMillis)) :
                sub?.expiryTime ? new Date(Number(sub.expiryTime)) :
                    undefined;

        await PurchaseModel.findByIdAndUpdate(
            userId,
            {
                $set: {
                    autoRenewing: !!sub.autoRenewing,
                    purchaseState: typeof sub.paymentState === "number" ? sub.paymentState : undefined,
                    expiryTime,
                    acknowledged: true,
                    status: newStatus,
                    raw: sub,
                },
            },
            { new: true }
        );

        // flip user entitlement
        if (newStatus === "ACTIVE" && expiryTime) {
            await UserModel.findByIdAndUpdate(userId, { proActive: true, proExpiresAt: expiryTime });
        } else if (newStatus === "EXPIRED" || newStatus === "CANCELED") {
            await UserModel.findByIdAndUpdate(userId, { proActive: false, proExpiresAt: null });
        }

        return;
    }

    if (prod) {
        // Acknowledge if needed
        if (!isAck(prod.acknowledgementState)) {
            try {
                await acknowledgeInAppProduct(productId, purchaseToken);
            } catch { }
        }

        const newStatus: PurchaseStatus = prod.purchaseState === 0 ? "ACTIVE" : "PENDING";

        await PurchaseModel.findByIdAndUpdate(
            userId,
            {
                $set: {
                    autoRenewing: false,
                    purchaseState: prod.purchaseState,
                    expiryTime: undefined,
                    acknowledged: true,
                    status: newStatus,
                    raw: prod,
                },
            },
            { new: true }
        );

        // one-time purchase → your rule: proActive true (lifetime) or apply coins
        await UserModel.findByIdAndUpdate(userId, { proActive: true, proExpiresAt: null });
    }
}

export function startInAppCron() {
    cron.schedule("*/6 * * * *", async () => {
        console.log("[cron] in-app refresh started");
        // pick candidates that likely need refresh
        const now = new Date();

        // statuses to check
        const toCheckStatuses: PurchaseStatus[] = ["ACTIVE", "PENDING"];

        // Also include autoRenewing true or very recent updates
        const candidates = await PurchaseModel.find({
            platform: "google_play",
            status: { $in: toCheckStatuses },
            // optional: or { expiryTime: { $gte: now } }
        })
            .select("_id userId productId purchaseToken status expiryTime autoRenewing")
            .lean<IPurchase[]>();

        if (!candidates.length) return;

        // Process sequentially or in small batches to respect quotas
        for (const p of candidates) {
            try {
                await refreshOnePurchase(p);
            } catch (err) {

            }
        }
    });
}
