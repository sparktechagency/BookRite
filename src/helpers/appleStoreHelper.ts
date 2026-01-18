import axios from "axios";
import jwt from "jsonwebtoken";

const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID!;
const APPLE_BUNDLE_ID = process.env.IOS_BUNDLE_ID!;

// 🔥 সঠিক ফরম্যাটিং ফাংশন
const getApplePrivateKey = () => {
    const rawKey = process.env.APPLE_PRIVATE_KEY || "";
    
    // ১. ডাবল কোটেশন রিমুভ এবং \n কে আসল নিউলাইনে কনভার্ট করা
    // এটি খুবই গুরুত্বপূর্ণ কারণ .env থেকে \n টেক্সট হিসেবে আসে
    return rawKey.replace(/\\n/g, '\n');
};

const APPLE_PRIVATE_KEY = getApplePrivateKey();

// ডিবাগিং (রান করার পর এটা মুছে দেবেন)
// যদি দেখেন 'true' আসছে, তাহলে বুঝবেন কাজ হয়েছে
console.log("✅ Apple Key Format Valid check:", APPLE_PRIVATE_KEY.includes("\n")); 

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

export async function verifyApplePurchaseV2(transactionId: string, isSandbox = false) {
    const token = generateAppleToken();
    const baseUrl = isSandbox ? SANDBOX_URL : PROD_URL;
    const url = `${baseUrl}/${transactionId}`;

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const { signedTransactionInfo } = response.data;
        const decoded = jwt.decode(signedTransactionInfo) as any;

        if (!decoded) throw new Error("Failed to decode Apple transaction info");
        return decoded;

    } catch (error: any) {
        // ১. যদি রেসপন্স থাকে (যেমন 401, 404, 500)
        if (error.response) {
            console.error("🔥 Apple API Error Status:", error.response.status);
            console.error("🔥 Apple API Error Data:", JSON.stringify(error.response.data, null, 2));

            // যদি 401 Unauthorized দেয়, তার মানে আপনার Key/Issuer ID ভুল বা Token জেনারেশনে সমস্যা
            if (error.response.status === 401) {
                 console.error("❌ Possible Cause: Invalid Private Key, Key ID, or Issuer ID.");
            }

            // স্যান্ডবক্স রি-ট্রাই লজিক (আগেই ছিল)
            if (error.response.status === 404 && !isSandbox) {
                console.log("⚠️ Transaction not found in Prod, retrying in Sandbox...");
                return verifyApplePurchaseV2(transactionId, true);
            }
        } else {
            // ২. যদি নেটওয়ার্ক বা কোড এরর হয়
            console.error("❌ Network or Code Error:", error.message);
        }

        throw new Error(error.response?.data?.errorMessage || "Apple verification failed");
    }
}