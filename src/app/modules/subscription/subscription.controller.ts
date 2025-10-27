import { Request, Response } from "express";
import { VerifyBodySchema } from "./validation";
import { getPurchaseById, handleGooglePlayVerify, listPurchases, listPurchasesByUser } from "./subscription.service";

async function verifyAndroidPurchase(req: Request, res: Response): Promise<void> {
    try {
        const parse = VerifyBodySchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ success: false, errors: parse.error.flatten() });
            return;
        }

        const { userId, source, verificationData } = parse.data;

        if (source !== "google_play") {
            res.status(400).json({ success: false, message: "Invalid source" });
            return;
        }

        const pkg = process.env.ANDROID_PACKAGE_NAME!;
        if (verificationData.packageName !== pkg) {
            res.status(400).json({ success: false, message: "Package name mismatch" });
            return;
        }

        const result = await handleGooglePlayVerify({
            userId,
            verificationData,
        });

        res.json({ success: true, data: result });
        return;
    } catch (err: any) {
        console.error("verifyAndroidPurchaseController error:", err?.message || err);
        res.status(500).json({ success: false, message: "Server error", error: err?.message });
        return;
    }
}


async function getAllPurchases(req: Request, res: Response): Promise<void> {
    try {
        const {
            userId,
            productId,
            platform,
            status,
            search,
            page = "1",
            limit = "20",
            sort = "-createdAt",
        } = req.query as any;

        const data = await listPurchases(
            { userId, productId, platform, status, search },
            Number(page),
            Number(limit),
            String(sort)
        );

        res.json({ success: true, ...data });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error", error: err?.message });
    }
}

async function getUserPurchases(req: Request, res: Response): Promise<void> {
    try {
        const { userId } = req.params;
        const { page = "1", limit = "20", sort = "-createdAt" } = req.query as any;

        const data = await listPurchasesByUser(userId, Number(page), Number(limit), String(sort));
        res.json({ success: true, ...data });
        return;
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error", error: err?.message });
        return;
    }
}

async function getSinglePurchase(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const doc = await getPurchaseById(id);
        if (!doc) {
            res.status(404).json({ success: false, message: "Purchase not found" });
            return;
        }
        res.json({ success: true, data: doc });
        return;
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error", error: err?.message });
        return;
    }
}

export const inAppPurchaseController = {
    verifyAndroidPurchase,
    getAllPurchases,
    getUserPurchases,
    getSinglePurchase,
};