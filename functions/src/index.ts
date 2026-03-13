
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { UserProfile, Vehicle } from "./types";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// NOTE: DO NOT Initialize GoogleGenAI here globally. 
// It causes "API key must be set" error during deployment.

/**
 * Helper function to calculate days remaining for an expiry date.
 */
const getDaysRemaining = (expiryDate: string): number => {
    if (!expiryDate || typeof expiryDate !== "string" || expiryDate.trim() === "") {
        return 9999;
    }
    const dateStr = expiryDate.trim().replace(/[/.]/g, "-");
    const parts = dateStr.split("-");

    let y: number, m: number, d: number;
    if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
            [y, m, d] = parts.map(Number);
        } else { // DD-MM-YYYY
            [d, m, y] = parts.map(Number);
        }
    } else {
        return 9999;
    }

    if (isNaN(y) || isNaN(m) || isNaN(d)) return 9999;

    const expiry = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    if (isNaN(expiry.getTime())) return 9999;

    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};


/**
 * Scheduled function that runs daily to check for expiring vehicle documents.
 * MIGRATED TO V2 - Renamed to force new deployment
 */
export const dailyDocumentCheckV2 = onSchedule({
    schedule: "every day 09:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
}, async (event) => {
    logger.info("Executing Daily Document Expiry Check (Gen 2)...");

    try {
        const usersSnap = await db.collection("users").get();

        for (const userDoc of usersSnap.docs) {
            const user = userDoc.data() as UserProfile;
            const userId = userDoc.id;

            if (!user.fcmToken) {
                continue;
            }

            const vehiclesSnap = await db.collection(`users/${userId}/vehicles`).get();
            if (vehiclesSnap.empty) {
                continue;
            }

            const warningWindow = user.expiryDays || 15;
            const expiringDocs: { vehicleNumber: string, docName: string, daysLeft: number }[] = [];

            for (const vehicleDoc of vehiclesSnap.docs) {
                const vehicle = vehicleDoc.data() as Vehicle;
                if (!vehicle.documents) continue;

                for (const doc of Object.values(vehicle.documents)) {
                    const daysLeft = getDaysRemaining(doc.expiryDate);
                    
                    if (daysLeft <= warningWindow) {
                        expiringDocs.push({
                            vehicleNumber: vehicle.number,
                            docName: doc.name,
                            daysLeft: daysLeft,
                        });
                    }
                }
            }

            if (expiringDocs.length > 0) {
                expiringDocs.sort((a, b) => a.daysLeft - b.daysLeft);

                const firstDoc = expiringDocs[0];
                const title = `🚨 Action Required: ${expiringDocs.length} Document${expiringDocs.length > 1 ? "s" : ""}`;
                
                let statusText = "";
                if (firstDoc.daysLeft < 0) {
                    statusText = `EXPIRED ${Math.abs(firstDoc.daysLeft)} days ago`;
                } else if (firstDoc.daysLeft === 0) {
                    statusText = "expires TODAY";
                } else {
                    statusText = `expires in ${firstDoc.daysLeft} days`;
                }

                let body = `${firstDoc.vehicleNumber}: ${firstDoc.docName} ${statusText}.`;
                if (expiringDocs.length > 1) {
                    body += ` +${expiringDocs.length - 1} more issues.`;
                }

                // --- IMMORTAL NOTIFICATION PROTOCOL ---
                // Using Data-Only payload where possible to let SW handle display
                const message: admin.messaging.TokenMessage = {
                    token: user.fcmToken,
                    data: {
                        title: title,
                        body: body,
                        tag: `expiry-alert-${userId}`,
                        url: "/#alerts",
                        timestamp: Date.now().toString(),
                        type: 'ALERT' // Explicit type
                    },
                    android: {
                        priority: 'high', 
                        ttl: 2419200,
                    },
                    webpush: {
                        headers: { "Urgency": "high", "TTL": "2419200" }
                    }
                };

                try {
                    await admin.messaging().send(message);
                    logger.info(`Notification sent to ${userId}`);
                } catch (err: any) {
                    logger.error(`Failed to send to ${userId}`, err);
                    if (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-argument') {
                        logger.warn(`Removing invalid token for user ${userId}`);
                        await db.collection("users").doc(userId).update({ fcmToken: admin.firestore.FieldValue.delete() });
                    }
                }
            }
        }
        logger.info("Daily Document Expiry Check completed successfully.");
    } catch (error) {
        logger.error("Error in dailyDocumentCheck:", error);
    }
});

/**
 * NEW: UNIVERSAL HOURLY HEARTBEAT (Har User, Har Ghanta)
 * MIGRATED TO V2 - Renamed to force new deployment
 */
export const keepAliveInfiniteV2 = onSchedule({
    schedule: "every 1 hours",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
}, async (event) => {
    logger.info("Running UNIVERSAL Hourly Heartbeat Protocol (Gen 2)...");
    
    try {
        const usersSnap = await db.collection("users")
            .where("fcmToken", "!=", null)
            .get();

        const tokensToPing: string[] = [];
        const userIdsToUpdate: string[] = [];

        usersSnap.forEach(doc => {
            const data = doc.data() as UserProfile;
            if (data.fcmToken) {
                tokensToPing.push(data.fcmToken);
                userIdsToUpdate.push(doc.id);
            }
        });

        if (tokensToPing.length === 0) {
            logger.info("No devices found to ping.");
            return;
        }

        logger.info(`Sending Universal Heartbeat to ${tokensToPing.length} devices.`);

        // Send in batches of 500
        const chunkSize = 500;
        for (let i = 0; i < tokensToPing.length; i += chunkSize) {
            const chunk = tokensToPing.slice(i, i + chunkSize);
            
            const message: admin.messaging.MulticastMessage = {
                tokens: chunk,
                data: {
                    type: 'HEARTBEAT', 
                    timestamp: Date.now().toString(),
                    urgency: 'high'
                },
                android: {
                    priority: 'high', 
                },
                webpush: {
                    headers: { "Urgency": "high" }
                }
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    const realIdx = i + idx;
                    const uid = userIdsToUpdate[realIdx];

                    if (!resp.success) {
                        const error = resp.error;
                        if (error?.code === 'messaging/registration-token-not-registered' || error?.code === 'messaging/invalid-argument') {
                            db.collection("users").doc(uid).update({ 
                                fcmToken: admin.firestore.FieldValue.delete() 
                            });
                        }
                    }
                });
            }
        }

        const batch = db.batch();
        userIdsToUpdate.forEach(uid => {
            const ref = db.collection("users").doc(uid);
            batch.update(ref, { lastHeartbeat: Date.now() });
        });
        await batch.commit();

        logger.info("Universal Heartbeat cycle complete.");

    } catch (error) {
        logger.error("Heartbeat Error:", error);
    }
});

/**
 * Secure Server-Side OCR using Gemini.
 * MIGRATED TO V2 - Renamed to force new deployment
 * Using 2GiB memory for heavy AI processing.
 */
export const analyzeDocumentV2 = onCall({
    region: "asia-south1",
    memory: "2GiB",
    timeoutSeconds: 540,
    maxInstances: 10,
    cors: true, 
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { imageBase64, mimeType } = request.data;
    
    if (!imageBase64) {
        throw new HttpsError("invalid-argument", "Image data missing.");
    }

    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        logger.error("Missing API_KEY environment variable.");
        throw new HttpsError("internal", "Server configuration error: API Key missing.");
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: apiKey });

        const prompt = "Extract data from this vehicle document. Return a JSON object with strictly these keys: 'number' (registration number, e.g., MH12AB1234), 'owner' (owner full name), and 'expiry' (expiry date in YYYY-MM-DD format). If a field cannot be found, omit the key.";
        
        const response = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                { 
                    parts: [
                        { text: prompt },
                        { inlineData: { data: imageBase64, mimeType: mimeType || "image/jpeg" } }
                    ]
                }
            ]
        });

        let text = response.text;
        
        if (!text) {
            throw new Error("Empty response from AI");
        }
        
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        return JSON.parse(text);
    } catch (error: any) {
        logger.error("OCR Error", error);
        throw new HttpsError("internal", "Failed to process document.");
    }
});

/**
 * Secure Server-Side AI Chat using Gemini.
 * MIGRATED TO V2 - Renamed to force new deployment
 * Using 2GiB memory.
 */
export const askAIV2 = onCall({
    region: "asia-south1",
    memory: "2GiB",
    timeoutSeconds: 540,
    maxInstances: 10,
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { prompt } = request.data;
    
    if (!prompt) {
        throw new HttpsError("invalid-argument", "Prompt is missing.");
    }

    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        logger.error("Missing API_KEY environment variable.");
        throw new HttpsError("internal", "Server configuration error: API Key missing.");
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: apiKey });
        
        const response = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                { 
                    parts: [{ text: prompt }]
                }
            ],
            config: { responseMimeType: "application/json" }
        });

        let text = response.text;
        
        if (!text) {
            throw new Error("Empty response from AI");
        }
        
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        return JSON.parse(text);
    } catch (error: any) {
        logger.error("AI Assistant Error", error);
        throw new HttpsError("internal", "AI Service Failed: " + error.message);
    }
});

/**
 * Firestore trigger that activates when a new broadcast is queued.
 * MIGRATED TO V2 - Renamed to force new deployment
 */
export const onBroadcastQueuedV2 = onDocumentCreated({
    document: "system_broadcasts/{broadcastId}",
    region: "asia-south1",
}, async (event) => {
    const snap = event.data;
    if (!snap) return;

    const broadcast = snap.data();
    if (!broadcast || broadcast.status !== "PENDING") {
        return;
    }

    const broadcastId = event.params.broadcastId;
    const { title, body, target } = broadcast;
    logger.info(`Processing broadcast: ${title} for ${target} users.`);

    try {
        let usersQuery = db.collection("users").where("fcmToken", "!=", null);

        if (target === "PREMIUM") {
            usersQuery = usersQuery.where("planType", "==", "PREMIUM");
        } else if (target === "FREE") {
            usersQuery = usersQuery.where("planType", "==", "FREE");
        }

        const usersSnap = await usersQuery.get();
        
        const targetUsers = usersSnap.docs.map((doc) => {
            const data = doc.data() as UserProfile;
            return {
                uid: doc.id,
                token: data.fcmToken!,
                name: data.displayName || 'Unknown User',
                phone: data.phoneNumber || ''
            };
        }).filter(u => u.token);

        if (targetUsers.length === 0) {
            logger.warn("No users found for this broadcast target.");
            await snap.ref.update({ status: "SENT_EMPTY" });
            return;
        }

        const chunkSize = 500;
        const userChunks = [];
        for (let i = 0; i < targetUsers.length; i += chunkSize) {
            userChunks.push(targetUsers.slice(i, i + chunkSize));
        }

        let successCount = 0;
        let failureCount = 0;
        const failureDetails: { uid: string, name: string, phone: string, error: string }[] = [];

        for (const chunk of userChunks) {
            const message: admin.messaging.MulticastMessage = {
                tokens: chunk.map(u => u.token),
                // Data-Only to allow full customization by SW
                data: {
                    title: title,
                    body: body,
                    tag: `broadcast-${broadcastId}`,
                    url: "/#alerts",
                    type: 'BROADCAST'
                },
                android: {
                    priority: 'high',
                    ttl: 2419200
                },
                webpush: {
                    headers: { Urgency: "high", TTL: "2419200" }
                }
            };
            
            const response = await admin.messaging().sendEachForMulticast(message);
            
            successCount += response.successCount;
            failureCount += response.failureCount;

            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code || 'Unknown';
                        failureDetails.push({
                            uid: chunk[idx].uid,
                            name: chunk[idx].name,
                            phone: chunk[idx].phone,
                            error: errorCode
                        });
                        
                        if (errorCode === 'messaging/registration-token-not-registered') {
                            db.collection("users").doc(chunk[idx].uid).update({ fcmToken: admin.firestore.FieldValue.delete() });
                        }
                    }
                });
            }
        }

        await snap.ref.update({ 
            status: "SENT", 
            sentCount: successCount, 
            failCount: failureCount,
            failureDetails: failureDetails,
            sentAt: admin.firestore.FieldValue.serverTimestamp() 
        });
        
        logger.info(`Broadcast sent. Success: ${successCount}, Failed: ${failureCount}`);
    } catch (error) {
        logger.error("Error sending broadcast:", error);
        await snap.ref.update({ status: "FAILED", error: (error as Error).message });
    }
});

/**
 * Callable function to send a test push notification.
 * MIGRATED TO V2 - Renamed to force new deployment
 */
export const sendTestNotificationV2 = onCall({
    region: "asia-south1",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Auth required.");
    }

    const { token } = request.data;
    if (!token) throw new HttpsError("invalid-argument", "Token required.");

    // IMPORTANT: Sending as Data-Only message to force Service Worker handling.
    // This ensures icons and actions appear correctly on mobile web.
    const message: admin.messaging.TokenMessage = {
        token: token,
        data: {
            title: "Signal Test ✅",
            body: "Your device is connected to FleetDost alerts.",
            tag: `test-signal-${Date.now()}`,
            url: "/#settings",
            type: "TEST"
        },
        android: {
            priority: 'high',
            ttl: 2419200
        },
        webpush: {
            headers: { Urgency: "high", TTL: "2419200" }
        }
    };

    try {
        const responseId = await admin.messaging().send(message);
        return { success: true, messageId: responseId };
    } catch (error: any) {
        logger.error("Error sending test notification:", error);
        if (error.code === 'messaging/registration-token-not-registered') {
            await db.collection("users").doc(request.auth.uid).update({ fcmToken: admin.firestore.FieldValue.delete() });
            throw new HttpsError("not-found", "Token is invalid or expired.");
        }
        throw new HttpsError("internal", error.message || "Internal error.");
    }
});
