import { google } from "googleapis";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME!;

function normalizeKey(k?: string) {
    return (k || "").replace(/\\n/g, "\n").trim();
}

async function getAuth() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return google.auth.getClient({
            scopes: ["https://www.googleapis.com/auth/androidpublisher"],
        });
    }
    const email = process.env.GOOGLE_CLIENT_EMAIL!;
    const key = normalizeKey(process.env.GOOGLE_PRIVATE_KEY);
    return new google.auth.JWT({
        email,
        key,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
}

export async function getAndroidPublisher() {
    const auth = await getAuth();
    if (typeof (auth as any).authorize === "function") {
        // @ts-ignore
        await (auth as any).authorize();
    }
    return google.androidpublisher({ version: "v3", auth });
}


export async function acknowledgeSubscription(productId: string, token: string) {
    const api = await getAndroidPublisher();
    await api.purchases.subscriptions.acknowledge({
        packageName: PACKAGE_NAME,
        subscriptionId: productId,
        token,
        requestBody: { developerPayload: "ack_by_backend" },
    });
}

export async function verifySubscriptionV2(token: string) {
    const api = await getAndroidPublisher();
    const res = await api.purchases.subscriptionsv2.get({
        packageName: PACKAGE_NAME,
        token,
    });
    return res.data;
}

export async function verifyInAppProduct(productId: string, token: string) {
    const api = await getAndroidPublisher();
    const res = await api.purchases.products.get({
        packageName: PACKAGE_NAME,
        productId,
        token,
    });
    return res.data;
}

export async function acknowledgeInAppProduct(productId: string, token: string) {
    const api = await getAndroidPublisher();
    await api.purchases.products.acknowledge({
        packageName: PACKAGE_NAME,
        productId,
        token,
        requestBody: { developerPayload: "ack_by_backend" },
    });
}

export async function verifySubscription(productId: string, token: string) {
    const api = await getAndroidPublisher();
    const res = await api.purchases.subscriptions.get({
        packageName: PACKAGE_NAME,
        subscriptionId: productId,
        token,
    });

    // Check the cancellation status
    if (res.data.cancelReason || res.data.purchaseType === 2) {
        // If the subscription is canceled (cancelReason or purchaseState 2)
        return { status: "CANCELED", ...res.data };
    }

    return { status: "ACTIVE", ...res.data };
}
