import { google } from "googleapis";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME!;

function getJWT() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

    // Scopes for Android Publisher
    const scopes = ["https://www.googleapis.com/auth/androidpublisher"];

    const jwt = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes,
    });

    return jwt;
}

export async function getAndroidPublisher() {
    const auth = getJWT();
    await auth.authorize();
    return google.androidpublisher({ version: "v3", auth });
}

// Subscription verify
export async function verifySubscription(productId: string, token: string) {
    const api = await getAndroidPublisher();
    const res = await api.purchases.subscriptions.get({
        packageName: PACKAGE_NAME,
        subscriptionId: productId,
        token,
    });
    return res.data; // has expiryTimeMillis, paymentState, acknowledged, autoRenewing, cancelReason, etc.
}

// Subscription acknowledge
export async function acknowledgeSubscription(productId: string, token: string) {
    const api = await getAndroidPublisher();
    await api.purchases.subscriptions.acknowledge({
        packageName: PACKAGE_NAME,
        subscriptionId: productId,
        token,
        requestBody: { developerPayload: "ack_by_backend" },
    });
}

// (ঐচ্ছিক) যদি এক-টাইম in-app পণ্য থাকত
export async function verifyInAppProduct(productId: string, token: string) {
    const api = await getAndroidPublisher();
    const res = await api.purchases.products.get({
        packageName: PACKAGE_NAME,
        productId,
        token,
    });
    return res.data; // has purchaseState, consumptionState, acknowledged, purchaseTimeMillis
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
