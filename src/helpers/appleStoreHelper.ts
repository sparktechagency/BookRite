import axios from "axios";
import jwt from "jsonwebtoken";

// .env থেকে ভেরিয়েবলগুলো লোড করুন
const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;       // App Store Connect থেকে পাওয়া Key ID
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID!; // App Store Connect থেকে পাওয়া Issuer ID
const APPLE_BUNDLE_ID = process.env.IOS_BUNDLE_ID!;   // আপনার অ্যাপের Bundle ID
// Private Key-তে অনেক সময় \n থাকে, সেটা হ্যান্ডেল করা জরুরি
const APPLE_PRIVATE_KEY = (process.env.APPLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');

// StoreKit 2 URLs
const PROD_URL = "https://api.storekit.itunes.apple.com/inApps/v1/transactions";
const SANDBOX_URL = "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions";

/**
 * ১. অ্যাপলের সাথে কথা বলার জন্য JWT টোকেন জেনারেট করা
 */
function generateAppleToken() {
    const payload = {
        iss: APPLE_ISSUER_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // ১ ঘণ্টা মেয়াদ
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
 * ২. মেইন ভেরিফিকেশন ফাংশন
 * @param transactionId - Flutter থেকে পাওয়া `purchaseID` বা `transactionId`
 */
export async function verifyApplePurchaseV2(transactionId: string, isSandbox = false) {
    const token = generateAppleToken();
    const baseUrl = isSandbox ? SANDBOX_URL : PROD_URL;
    
    // API Endpoint: Get Transaction Info
    const url = `${baseUrl}/${transactionId}`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        // অ্যাপল রেসপন্স দেয় "signedTransactionInfo" (JWS ফরম্যাটে)
        const { signedTransactionInfo } = response.data;

        // JWS ডিকোড করে আসল ডেটা বের করা
        const decoded = jwt.decode(signedTransactionInfo) as any;

        if (!decoded) {
            throw new Error("Failed to decode Apple transaction info");
        }

        return decoded;

    } catch (error: any) {
        // যদি প্রোডাকশন URL-এ 404 দেয়, তার মানে এটা স্যান্ডবক্স ট্রানজেকশন হতে পারে
        if (error.response?.status === 404 && !isSandbox) {
            console.log("⚠️ Transaction not found in Prod, retrying in Sandbox...");
            return verifyApplePurchaseV2(transactionId, true);
        }

        console.error("❌ Apple V2 Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.errorMessage || "Apple verification failed");
    }
}