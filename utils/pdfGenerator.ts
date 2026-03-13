
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vehicle } from '../types';
import { sendToNativeApp, getDaysRemaining } from './helpers';

// --- SHARED BRANDING COLORS ---
type RGB = [number, number, number];

export const COLORS = {
    PRIMARY: [67, 56, 202] as RGB, // Indigo-700
    SECONDARY: [30, 41, 59] as RGB, // Slate-800
    ACCENT: [241, 245, 249] as RGB, // Slate-100
    TEXT_MAIN: [15, 23, 42] as RGB, // Slate-900
    TEXT_LIGHT: [100, 116, 139] as RGB // Slate-500
};

// --- HELPER: TEXT WRAPPING ---
export const drawWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, align: 'left'|'center'|'right' = 'left', fontType: 'normal'|'bold' = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontType);
    const lines = doc.splitTextToSize(text || '', maxWidth);
    doc.text(lines, x, y, { align: align });
    return lines.length * (fontSize * 0.3527 * 1.2); // Approximate height in mm
};

// --- SHARED HEADER ---
export const drawPDFHeader = (doc: jsPDF, title: string, userDetails?: any) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;

    // 1. Decorative Left Strip
    doc.setFillColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.rect(0, 0, 4, doc.internal.pageSize.getHeight(), 'F');

    // 2. Company Name
    doc.setFontSize(22);
    doc.setTextColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.setFont("helvetica", "bold");
    const companyName = userDetails?.companyName || userDetails?.business?.companyName || userDetails?.displayName || "TRANSPORT OFFICE";
    doc.text(companyName.toUpperCase(), margin + 5, 20);

    // 3. Address & Contact
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
    doc.setFont("helvetica", "normal");
    
    const address = userDetails?.address || userDetails?.business?.address || "";
    const contact = userDetails?.contact || userDetails?.business?.contact || userDetails?.phoneNumber || "";
    
    let yPos = 26;
    if (address) {
        yPos += drawWrappedText(doc, address, margin + 5, yPos, 120, 9);
    }
    if (contact) {
        doc.text(`Contact: ${contact}`, margin + 5, yPos + 2);
    }

    // 4. Document Title Stamp (Right Side) - Dynamic Width Logic
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const titleText = title.toUpperCase();
    
    // Measure text width to adjust box size
    const textWidth = doc.getTextWidth(titleText);
    const padding = 12; // Internal padding
    const minWidth = 55; // Minimum width
    const boxWidth = Math.max(textWidth + padding, minWidth);
    const boxHeight = 14;
    
    // Position box relative to right margin
    const boxX = pageWidth - margin - boxWidth;
    const boxY = 12;
    const textCenterX = boxX + (boxWidth / 2);

    // Draw Box
    doc.setDrawColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 1, 1);
    
    // Draw Title
    doc.setTextColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.text(titleText, textCenterX, boxY + 8, { align: 'center' });
    
    // Draw Date
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, textCenterX, boxY + 12, { align: 'center' });

    // 5. Divider Line
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(margin, 40, pageWidth - margin, 40);

    return 45; // Return Y start for content
};

// --- SHARED FOOTER ---
export const drawPDFFooter = (doc: jsPDF) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;

    const yPos = pageHeight - 15;

    doc.setFontSize(8);
    doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
    doc.setFont("helvetica", "italic");
    doc.text("Generated via FleetDost App", margin + 5, yPos);

    doc.setFont("helvetica", "normal");
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, yPos, { align: "right" });
};

// --- FLEET REPORT GENERATOR (Centralized) ---
export const generateFleetReportPDF = (vehicles: Vehicle[], userProfile?: any) => {
    // UPDATED: Using Landscape orientation to fit all columns
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const startY = drawPDFHeader(doc, "FLEET STATUS REPORT", userProfile);

    const tableData = vehicles.map(v => {
        const rcExp = v.documents.rc?.expiryDate || '-';
        const insExp = v.documents.insurance?.expiryDate || '-';
        const fitExp = v.documents.fitness?.expiryDate || '-';
        const permitExp = v.documents.permit?.expiryDate || '-';
        const statePermitExp = v.documents.statePermit?.expiryDate || '-';
        const pucExp = v.documents.puc?.expiryDate || '-';
        const taxExp = v.documents.tax?.expiryDate || '-';
        
        const days = getDaysRemaining(rcExp);
        
        return [
            v.number,
            v.ownerName || 'N/A',
            rcExp,
            days < 0 ? 'EXPIRED' : `${days} Days`,
            insExp,
            fitExp,
            permitExp,
            statePermitExp,
            pucExp,
            taxExp
        ];
    });

    autoTable(doc, {
        startY: startY,
        // Added extra columns for complete document visibility
        head: [['Vehicle No', 'Owner Name', 'RC Expiry', 'Status', 'Insurance', 'Fitness', 'Permit', 'St Permit', 'PUC', 'Road Tax']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.PRIMARY, textColor: 255, fontSize: 9, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2, halign: 'center', valign: 'middle' },
        columnStyles: { 
            0: { fontStyle: 'bold', halign: 'left' }, // Vehicle No aligned left
            1: { halign: 'left' } // Owner Name aligned left
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                const val = data.cell.raw as string;
                if (val === 'EXPIRED') data.cell.styles.textColor = [220, 38, 38] as [number, number, number];
                else if (parseInt(val) < 15) data.cell.styles.textColor = [217, 119, 6] as [number, number, number];
                else data.cell.styles.textColor = [22, 163, 74] as [number, number, number];
            }
        }
    });

    drawPDFFooter(doc);
    const blob = doc.output('blob');
    sendToNativeApp(blob, `FleetDost_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
};
