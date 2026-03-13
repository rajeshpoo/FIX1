
import { Vehicle, Trip, LedgerAccount, Bilty, LedgerTransaction } from '../types';
import { fetchVehicles, fetchTrips, fetchLedgers, fetchBilties, fetchTransactions, restoreBatchData } from '../services/firebaseService';
import { sendToNativeApp } from './helpers';

// Helper to prepare the backup data object
export const prepareBackupData = async (uid: string) => {
    try {
        const [vehicles, trips, ledgers, bilties, transactions] = await Promise.all([
            fetchVehicles(uid),
            fetchTrips(uid),
            fetchLedgers(uid),
            fetchBilties(uid),
            fetchTransactions(uid)
        ]);

        const backupData = {
            version: "1.0",
            timestamp: Date.now(),
            data: { vehicles, trips, ledgers, bilties, transactions }
        };

        const fileName = `FleetDost_Backup_${new Date().toISOString().split('T')[0]}.json`;
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        
        return { blob, fileName, jsonString };
    } catch (e) {
        console.error("Backup Prep Error:", e);
        throw new Error("Failed to gather data");
    }
};

export const generateFullBackup = async (uid: string) => {
    try {
        const { blob, fileName } = await prepareBackupData(uid);
        sendToNativeApp(blob, fileName);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const restoreFromBackup = async (uid: string, fileOrData: File | any) => {
    return new Promise(async (resolve, reject) => {
        try {
            let json: any;

            if (fileOrData instanceof File) {
                // File input (Legacy)
                const text = await fileOrData.text();
                json = JSON.parse(text);
            } else {
                // Direct JSON object (Google Drive)
                json = fileOrData;
            }

            if (!json.data || !json.version) throw new Error("Invalid Backup Format");

            await restoreBatchData(uid, json.data);
            resolve(true);
        } catch (err) {
            reject(err);
        }
    });
};
