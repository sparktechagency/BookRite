import axios from "axios";
import jwt from "jsonwebtoken";

// .env থেকে ভেরিয়েবলগুলো লোড করুন
const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID!;
const APPLE_BUNDLE_ID = process.env.IOS_BUNDLE_ID!;

// 🔥 ফিক্স: প্রাইভেট কি ফরম্যাটার ফাংশন
const getFormattedPrivateKey = () => {
    let key = process.env.APPLE_PRIVATE_KEY || "";

    key = key.replace(/['"]+/g, '');
    key = key.replace(/\\n/g, '\n');

    if (!key.includes("BEGIN PRIVATE KEY")) {
        key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    }

    return key;
};

const APPLE_PRIVATE_KEY = getFormattedPrivateKey();

console.log("🔑 Loaded Apple Key Start:", APPLE_PRIVATE_KEY.substring(0, 40)); 
console.log("🔑 Contains Newline?", APPLE_PRIVATE_KEY.includes('\n'));

// StoreKit 2 URLs
const PROD_URL = "https://api.storekit.itunes.apple.com/inApps/v1/transactions";
const SANDBOX_URL = "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions";
function generateAppleToken() {
    const payload = {
        iss: APPLE_ISSUER_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, 
        aud: "appstoreconnect-v1",
        bid: APPLE_BUNDLE_ID
    };

    return jwt.sign(payload, APPLE_PRIVATE_KEY, {
        algorithm: "ES256",
        header: {
            alg: "ES256",
            kid: APPLE_KEY_ID,
            typ: "JWT"
        }
    });
}

/**
 * @param transactionId 
 */
export async function verifyApplePurchaseV2(transactionId: string, isSandbox = false) {
    const token = generateAppleToken();
    const baseUrl = isSandbox ? SANDBOX_URL : PROD_URL;
    
    const url = `${baseUrl}/${transactionId}`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const { signedTransactionInfo } = response.data;

        const decoded = jwt.decode(signedTransactionInfo) as any;

        if (!decoded) {
            throw new Error("Failed to decode Apple transaction info");
        }

        return decoded;

    } catch (error: any) {
        if (error.response?.status === 404 && !isSandbox) {
            console.log("⚠️ Transaction not found in Prod, retrying in Sandbox...");
            return verifyApplePurchaseV2(transactionId, true);
        }

        console.error("❌ Apple V2 Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.errorMessage || "Apple verification failed");
    }
}