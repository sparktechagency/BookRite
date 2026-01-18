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

// appleStoreV2Helper.ts

export async function verifyApplePurchaseV2(transactionId: string, isSandbox = false) {
    const token = generateAppleToken();
    const baseUrl = isSandbox ? SANDBOX_URL : PROD_URL;
    const url = `${baseUrl}/${transactionId}`;

    console.log(`🚀 Sending request to Apple (${isSandbox ? 'Sandbox' : 'Prod'})...`);
    console.log(`🔗 URL: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("✅ Apple Response Status:", response.status); // 200 means success

        const { signedTransactionInfo } = response.data;
        const decoded = jwt.decode(signedTransactionInfo) as any;

        if (!decoded) throw new Error("Failed to decode Apple transaction info");
        return decoded;

    } catch (error: any) {
        // 🔥🔥 বিস্তারিত এরর লগিং 🔥🔥
        if (error.response) {
            console.error("❌ Apple API Error Status:", error.response.status);
            console.error("❌ Apple API Error Body:", JSON.stringify(error.response.data, null, 2));

            // ১. যদি 401 Unauthorized দেয়
            if (error.response.status === 401) {
                console.error("👉 কারণ: আপনার Private Key, Issuer ID অথবা Key ID ভুল। Token জেনারেট ঠিকমতো হয়নি।");
            }
            
            // ২. যদি 404 Not Found দেয় (Sandbox Retry Logic)
            if (error.response.status === 404 && !isSandbox) {
                console.log("⚠️ Transaction not found in Prod, retrying in Sandbox...");
                return verifyApplePurchaseV2(transactionId, true);
            }
        } else {
            console.error("❌ Network/Code Error:", error.message);
        }

        // অরিজিনাল এরর মেসেজটি থ্রো করুন যাতে পোস্টম্যান বা ফ্লাটারে দেখা যায়
        const errorMsg = error.response?.data?.errorMessage || "Apple verification failed";
        throw new Error(errorMsg);
    }
}