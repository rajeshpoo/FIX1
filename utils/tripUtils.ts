
import { Trip, TripExpense, Vehicle } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { sendToNativeApp, getDaysRemaining, getIndianDate } from './helpers';
import { notify } from '../services/firebaseService';
import { drawPDFHeader, drawPDFFooter, COLORS } from './pdfGenerator';

// --- HELPERS ---

export const safeNumber = (val: any): number => {
    if (val === null || val === undefined || val === '' || val === 'NaN' || val === 'undefined' || val === 'null') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    if (!cleaned || cleaned === '.' || cleaned === '-') return 0;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

export const parseAnyDate = (val: any): string => {
    if (val === undefined || val === null || val === '') return getIndianDate();
    if (val instanceof Date) {
      // Manual formatting to ensure local time is respected if needed, 
      // but using getIndianDate logic is safer for consistency.
      // Here we try to keep the date passed if valid, otherwise fallback.
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'number') {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
      } catch (e) { return getIndianDate(); }
    }
    let str = String(val).trim();
    if (!str || str.length < 5) return getIndianDate();
    str = str.replace(/[./\\\s|]/g, '-').replace(/-+/g, '-');
    const parts = str.split('-');
    if (parts.length === 3) {
      let d: number = 0, m: number = 0, y: number = 0;
      const p0 = parseInt(parts[0]);
      const p1 = parseInt(parts[1]);
      const p2 = parseInt(parts[2]);
      if (parts[0].length === 4) { y = p0; m = p1; d = p2; } else { 
        y = p2; if (parts[2].length === 2) y += 2000;
        if (p0 > 12) { d = p0; m = p1; d = p1; m = p0; } else { d = p0; m = p1; } 
      }
      if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return getIndianDate();
};

export const getTripBreakdown = (trip: Trip) => {
    const expenses = trip.expenses || [];
    const fuel = expenses.filter(e => e.type === 'FUEL').reduce((s, e) => s + safeNumber(e.amount), 0);
    const toll = expenses.filter(e => e.type === 'TOLL').reduce((s, e) => s + safeNumber(e.amount), 0);
    const driver = expenses.filter(e => e.type === 'DRIVER_CASH').reduce((s, e) => s + safeNumber(e.amount), 0);
    const repair = expenses.filter(e => e.type === 'REPAIR').reduce((s, e) => s + safeNumber(e.amount), 0);
    const police = expenses.filter(e => e.type === 'POLICE').reduce((s, e) => s + safeNumber(e.amount), 0);
    const other = expenses.filter(e => !['FUEL', 'TOLL', 'DRIVER_CASH', 'REPAIR', 'POLICE'].includes(e.type)).reduce((s, e) => s + safeNumber(e.amount), 0);
    return { freight: safeNumber(trip.freightAmount), fuel, toll, driver, repair, police, other };
};

export const generateTripWhatsAppLink = (trip: Trip) => {
    const breakdown = getTripBreakdown(trip);
    const text = `🚚 *Trip Summary: ${trip.vehicleNumber}* %0a%0a` +
        `📅 Date: ${trip.startDate} %0a` +
        `📍 Route: ${trip.route.from} ➝ ${trip.route.to} %0a` +
        `👤 Driver: ${trip.driverName} %0a%0a` +
        `💰 *Fare:* ₹${breakdown.freight.toLocaleString()} %0a` +
        `⛽ Diesel: ₹${breakdown.fuel.toLocaleString()} %0a` +
        `🛣️ Toll: ₹${breakdown.toll.toLocaleString()} %0a` +
        `💸 Total Exp: ₹${safeNumber(trip.totalExpense).toLocaleString()} %0a%0a` +
        `✅ *Net Savings: ₹${safeNumber(trip.netProfit).toLocaleString()}* %0a%0a` +
        `_Generated via FleetDost_`;
    return `https://wa.me/?text=${text}`;
};

export const generateDiaryRows = (trip: Trip | null) => {
    if (!trip) return [];

    // 1. Start Node
    const startNode = {
        id: 'start-node',
        isStart: true,
        date: trip.startDate,
        time: '09:00', // Default start time
        particulars: `Trip Started (${trip.route.from} to ${trip.route.to})`,
        paidBy: trip.partyName,
        freight: trip.freightAmount,
        expense: 0,
        original: null
    };

    // 2. Expense Nodes
    const expenseNodes = (trip.expenses || []).map(e => ({
        id: e.id,
        isStart: false,
        date: e.date,
        time: e.time || '12:00',
        particulars: `${e.type.replace('_', ' ')} ${e.notes ? '- ' + e.notes : ''}`,
        paidBy: e.paidBy,
        freight: 0,
        expense: e.amount,
        original: e
    }));

    // 3. Combine & Sort
    return [startNode, ...expenseNodes].sort((a, b) => {
        const da = new Date(`${a.date}T${a.time || '00:00'}`);
        const db = new Date(`${b.date}T${b.time || '00:00'}`);
        return da.getTime() - db.getTime();
    });
};

// --- PDF & EXCEL REPORTS ---

export const handleExportFleet = (vehicles: Vehicle[], format: 'xlsx' | 'csv' | 'pdf' | 'share', userProfile: any) => {
    if (vehicles.length === 0) {
        notify("Error", "No vehicles to export", "warning");
        return;
    }

    if (format === 'pdf') {
        try {
            // Re-routing to the centralized generator for consistency
            // Since `generateFleetReportPDF` is imported in components, we focus on Excel here.
            return; 
        } catch (e) {
            console.error(e);
        }
    }

    // Excel Export
    const exportData = vehicles.map(v => {
        const docs: any = v.documents || {};
        return {
            "Vehicle Number": v.number,
            "Owner Name": v.ownerName,
            "RC Expiry": docs.rc?.expiryDate || '-',
            "Insurance Expiry": docs.insurance?.expiryDate || '-',
            "Fitness Expiry": docs.fitness?.expiryDate || '-',
            "Permit Expiry": docs.permit?.expiryDate || '-',
            "State Permit": docs.statePermit?.expiryDate || '-',
            "PUC Expiry": docs.puc?.expiryDate || '-',
            "Tax Expiry": docs.tax?.expiryDate || '-'
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-width
    const wscols = Object.keys(exportData[0]).map(k => ({ wch: k.length + 5 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fleet_Status");

    if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        sendToNativeApp(blob, "Fleet_Data.csv");
    } else {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        // FIX: Use specific MIME type for Android support
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        sendToNativeApp(blob, "Fleet_Data.xlsx");
    }
    
    notify("Export Complete", `Fleet data saved as ${format.toUpperCase()}`, "success");
};

export const handleExportAllTrips = (trips: Trip[], format: 'xlsx' | 'pdf', user: any, label: string, profile: any) => {
    if (format === 'xlsx') {
        const data = trips.map(t => {
            const bd = getTripBreakdown(t);
            return {
                "Date": t.startDate,
                "Vehicle": t.vehicleNumber,
                "Route": `${t.route.from} to ${t.route.to}`,
                "Party": t.partyName,
                "Freight": bd.freight,
                "Diesel": bd.fuel,
                "Toll": bd.toll,
                "Driver Cash": bd.driver,
                "Repair": bd.repair,
                "Police/RTO": bd.police || 0,
                "Other": bd.other,
                "Total Expense": safeNumber(t.totalExpense),
                "Net Profit": safeNumber(t.netProfit),
                "Status": t.status,
                "Bill Status": t.billStatus || 'PENDING'
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Trips");
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        // FIX: Use specific MIME type for Android support
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        sendToNativeApp(blob, `Trips_${label.replace(/\s/g,'_')}.xlsx`);
        notify("Success", "Excel file generated", "success");
    } 
    else if (format === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const startY = drawPDFHeader(doc, `TRIP REPORT: ${label}`, profile);
        
        const tableBody = trips.map(t => [
            t.startDate,
            t.vehicleNumber,
            `${t.route.from} > ${t.route.to}`,
            t.partyName,
            t.freightAmount.toLocaleString(),
            t.totalExpense.toLocaleString(),
            t.netProfit.toLocaleString()
        ]);

        autoTable(doc, {
            startY: startY,
            head: [['Date', 'Vehicle', 'Route', 'Party', 'Freight', 'Expense', 'Profit']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: COLORS.PRIMARY, textColor: 255, fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
            columnStyles: { 2: { cellWidth: 40 }, 3: { cellWidth: 30 } }, // Wider columns for route/party
            foot: [[
                'TOTAL', '', '', '', 
                `Rs. ${trips.reduce((s,t)=>s+safeNumber(t.freightAmount),0).toLocaleString()}`,
                `Rs. ${trips.reduce((s,t)=>s+safeNumber(t.totalExpense),0).toLocaleString()}`,
                `Rs. ${trips.reduce((s,t)=>s+safeNumber(t.netProfit),0).toLocaleString()}`
            ]],
            footStyles: { fillColor: COLORS.SECONDARY, textColor: 255, fontStyle: 'bold' }
        });

        drawPDFFooter(doc);
        const blob = doc.output('blob');
        sendToNativeApp(blob, `Trips_${label}.pdf`);
        notify("Success", "PDF Report generated", "success");
    }
};

export const handlePrintTrip = (trip: Trip, userProfile: any) => {
    // Re-use Bilty Logic or create specific Trip Receipt
    // For now, we can use a simple PDF generation for single trip
    // Or users use the visual receipt sharing.
    // If they clicked "Print PDF" in the history view:
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = drawPDFHeader(doc, `TRIP MANIFEST #${trip.tripNumber}`, userProfile);
    
    // ... (Simple Trip Summary PDF logic would go here) ...
    // For brevity, we are redirecting user to Share Image in UI, but this supports explicit PDF request
    
    doc.setFontSize(12); doc.text(`Vehicle: ${trip.vehicleNumber}`, 14, startY + 10);
    doc.text(`Driver: ${trip.driverName}`, 14, startY + 16);
    doc.text(`Route: ${trip.route.from} to ${trip.route.to}`, 14, startY + 22);
    
    const rows = generateDiaryRows(trip);
    const tableData = rows.map(r => [
        r.date, 
        r.particulars, 
        r.freight ? r.freight.toLocaleString() : '-', 
        r.expense ? r.expense.toLocaleString() : '-'
    ]);
    
    autoTable(doc, {
        startY: startY + 30,
        head: [['Date', 'Description', 'Credit (In)', 'Debit (Out)']],
        body: tableData,
        theme: 'grid',
        foot: [['', 'NET PROFIT', '', `Rs. ${trip.netProfit.toLocaleString()}`]]
    });
    
    drawPDFFooter(doc);
    sendToNativeApp(doc.output('blob'), `Trip_${trip.tripNumber}.pdf`);
};

export const handlePrintVehicleHistory = (vehicle: Vehicle, trips: Trip[], monthLabel: string, userProfile: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = drawPDFHeader(doc, `HISTORY: ${vehicle.number} (${monthLabel})`, userProfile);
    
    const tableData = trips.map(t => [
        t.startDate,
        `${t.route.from} - ${t.route.to}`,
        t.partyName,
        t.freightAmount.toLocaleString(),
        t.totalExpense.toLocaleString(),
        t.netProfit.toLocaleString()
    ]);
    
    autoTable(doc, {
        startY: startY,
        head: [['Date', 'Route', 'Party', 'Freight', 'Exp', 'Profit']],
        body: tableData,
        theme: 'striped'
    });
    
    drawPDFFooter(doc);
    sendToNativeApp(doc.output('blob'), `History_${vehicle.number}_${monthLabel}.pdf`);
};
