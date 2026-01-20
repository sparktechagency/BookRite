import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();
const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID!;
const APPLE_BUNDLE_ID = process.env.IOS_BUNDLE_ID!;

const getApplePrivateKey = () => {
    const keyPath = path.join(__dirname, '../../AuthKey_N246NQZA36.p8');

    if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key file not found: ${keyPath}`);
    }

    const keyContent = fs.readFileSync(keyPath, 'utf8').trim();

    // Basic validation
    if (!keyContent.includes('-----BEGIN PRIVATE KEY-----') ||
        !keyContent.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Private key file has invalid format (missing BEGIN/END markers)');
    }

    console.log('✅ Loaded private key from file');
    console.log('   Path:', keyPath);
    console.log('   Length:', keyContent.length);
    console.log('   First line:', keyContent.split('\n')[0]);
    console.log('   Last line :', keyContent.split('\n').slice(-1)[0]);

    return keyContent;
};

const APPLE_PRIVATE_KEY = getApplePrivateKey();

// Optional: strong validation before using
if (APPLE_PRIVATE_KEY.length < 200) {
    throw new Error('Private key is too short - probably corrupted file');
}
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

    console.log(`🚀 Sending request to Apple (${isSandbox ? 'Sandbox' : 'Prod'})...`);
    console.log(`🔗 URL: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("✅ Apple Response Status:", response.status); 

        const { signedTransactionInfo } = response.data;
        const decoded = jwt.decode(signedTransactionInfo) as any;

        if (!decoded) throw new Error("Failed to decode Apple transaction info");
        return decoded;

    } catch (error: any) {
        if (error.response) {
            console.error("Apple API Error Status:", error.response.status);
            console.error("Apple API Error Body:", JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 401) {
                console.error("Apple Invalid Token. Check your key, key ID, and issuer ID.");
            }
            
            if (error.response.status === 404 && !isSandbox) {
                console.log("Apple Transaction not found in Prod, retrying in Sandbox...");
                return verifyApplePurchaseV2(transactionId, true);
            }
        } else {
            console.error("Apple Network/Code Error:", error.message);
        }

        const errorMsg = error.response?.data?.errorMessage || "Apple verification failed";
        throw new Error(errorMsg);
    }
}
