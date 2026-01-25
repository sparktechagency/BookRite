import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID!;
const APPLE_BUNDLE_ID = process.env.IOS_BUNDLE_ID!;

// if (!APPLE_KEY_ID || !APPLE_ISSUER_ID || !APPLE_BUNDLE_ID) {
//     throw new Error('Missing required Apple environment variables');
// }


const getApplePrivateKey = () => {
    const keyPath = path.join(__dirname, '../../AuthKey_N246NQZA36.p8');
    
    if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key file not found: ${keyPath}`);
    }
    
    const keyContent = fs.readFileSync(keyPath, 'utf8').trim();
    
    if (!keyContent.includes('-----BEGIN PRIVATE KEY-----') ||
        !keyContent.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Private key file has invalid format');
    }
    
    // console.log('✅ Apple private key loaded successfully');
    
    return keyContent;
};

const APPLE_PRIVATE_KEY = getApplePrivateKey();

const PROD_URL = "https://api.storekit.itunes.apple.com/inApps/v1/transactions";
const SANDBOX_URL = "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions";

function generateAppleToken() {
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
        iss: APPLE_ISSUER_ID,
        iat: now,
        exp: now + 3600,
        aud: "appstoreconnect-v1",
        bid: APPLE_BUNDLE_ID
    };
    
    console.log('🔐 Generating JWT...');
    
    try {
        const token = jwt.sign(payload, APPLE_PRIVATE_KEY, {
            algorithm: "ES256",
            header: {
                alg: "ES256",
                kid: APPLE_KEY_ID,
                typ: "JWT"
            }
        });
        
        // console.log('✅ JWT generated successfully');
        
        return token;
    } catch (error: any) {
        console.error('❌ JWT generation failed:', error.message);
        throw new Error(`Failed to generate Apple JWT: ${error.message}`);
    }
}

export async function verifyApplePurchaseV2(transactionId: string, forceSandbox?: boolean) {
    console.log(`\n🍎 Starting Apple verification for transaction: ${transactionId}`);
    
    // Determine environment
    let isSandbox = false;
    
    if (forceSandbox !== undefined) {
        isSandbox = forceSandbox;
        console.log(`   Environment: ${isSandbox ? 'Sandbox (forced)' : 'Production (forced)'}`);
    } else {
        // Auto-detect: Sandbox transactions start with '2' (testing)
        // Production transactions start with '1' or higher
        const firstChar = transactionId.charAt(0);
        isSandbox = firstChar === '2';
        console.log(`   Transaction ID: ${transactionId}`);
        console.log(`   First character: ${firstChar}`);
        console.log(`   Auto-detected environment: ${isSandbox ? 'Sandbox ' : 'Production'}`);
    }
    
    const token = generateAppleToken();
    const baseUrl = isSandbox ? SANDBOX_URL : PROD_URL;
    const url = `${baseUrl}/${transactionId}`;
    
    console.log(`🔗 Request URL: ${url}`);
    
    try {
        const response = await axios.get(url, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log(`✅ Apple API Response: ${response.status}`);
        
        const { signedTransactionInfo } = response.data;
        
        if (!signedTransactionInfo) {
            throw new Error("Missing signedTransactionInfo in Apple response");
        }
        
        const decoded = jwt.decode(signedTransactionInfo) as any;
        
        if (!decoded) {
            throw new Error("Failed to decode Apple transaction info");
        }
        
        // console.log("✅ Transaction decoded successfully:");
        // console.log("   Product ID:", decoded.productId);
        // console.log("   Original Transaction ID:", decoded.originalTransactionId);
        // console.log("   Type:", decoded.type);
        // console.log("   Environment:", decoded.environment);
        // console.log("   Expires Date:", decoded.expiresDate ? new Date(decoded.expiresDate) : 'N/A');
        
        return decoded;
        
    } catch (error: any) {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            console.error(` Apple API Error (${status}):`);
            console.error('   Response:', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
            
            if (status === 401) {
                console.error('\n🔍 Authentication Failed - Current Config:');
                console.error('   APPLE_KEY_ID:', APPLE_KEY_ID);
                console.error('   APPLE_ISSUER_ID:', APPLE_ISSUER_ID);
                console.error('   IOS_BUNDLE_ID:', APPLE_BUNDLE_ID);
                throw new Error('Apple authentication failed - verify your credentials in App Store Connect');
            }
            
            // If not found in production, try sandbox
            if (status === 404 && !isSandbox) {
                console.log("\n⚠️ Transaction not found in Production, retrying in Sandbox...");
                return verifyApplePurchaseV2(transactionId, true);
            }
            
            // If not found in sandbox either
            if (status === 404 && isSandbox) {
                throw new Error(`Transaction ${transactionId} not found in Sandbox environment`);
            }
            
            const errorMsg = data?.errorMessage || data || 'Unknown error';
            throw new Error(`Apple API error (${status}): ${errorMsg}`);
            
        } else if (error.request) {
            console.error("❌ No response from Apple API");
            throw new Error('No response from Apple - check network connection');
        } else {
            console.error("❌ Request setup error:", error.message);
            throw new Error(`Apple verification failed: ${error.message}`);
        }
    }
}