
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bilty } from '../types';
import { sendToNativeApp } from './helpers';
import { drawPDFFooter, COLORS } from './pdfGenerator';
import { notify } from '../services/firebaseService';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import saveAs from 'file-saver';

/**
 * Generates Bilty from a DOCX template stored as Base64
 */
export const generateBiltyFromDocx = async (bilty: Bilty, templateBase64: string) => {
    try {
        const binaryString = window.atob(templateBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const zip = new PizZip(bytes);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Map Bilty data to tags
        doc.setData({
            biltyNumber: bilty.biltyNumber,
            date: bilty.date,
            vehicleNumber: bilty.vehicleNumber,
            fromStation: bilty.fromStation,
            toStation: bilty.toStation,
            consignorName: bilty.consignor.name,
            consignorAddress: bilty.consignor.address,
            consignorGst: bilty.consignor.gst,
            consigneeName: bilty.consignee.name,
            consigneeAddress: bilty.consignee.address,
            consigneeGst: bilty.consignee.gst,
            description: bilty.itemDetails.description,
            packages: bilty.itemDetails.packages,
            weight: bilty.itemDetails.weight,
            freightAmount: bilty.freight.amount,
            advanceAmount: bilty.freight.advance,
            balanceAmount: bilty.freight.balance,
            driverName: bilty.driverName,
            remarks: bilty.remarks,
            declaredValue: bilty.declaredValue
        });

        doc.render();
        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        saveAs(out, `Bilty_${bilty.biltyNumber}.docx`);
        notify("Success", "Custom Word Bilty Generated", "success");
    } catch (error) {
        console.error("DOCX Error:", error);
        notify("Template Error", "Could not process Word file. Check tags.", "error");
    }
};

export const generateBiltyPDF = (b: Bilty, company: any) => {
    try {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);
        const centerX = pageWidth / 2;
        
        const BRAND_COLOR: [number, number, number] = [30, 41, 59];
        const BORDER_COLOR: [number, number, number] = [203, 213, 225];

        // --- 1. HEADER SECTION ---
        let yPos = 12;

        const companyName = company?.companyName || 'TRANSPORT OFFICE';
        const companyAddr = company?.address || '';
        
        // 1. Company Name (Centered)
        doc.setFont("helvetica", "bold"); 
        doc.setFontSize(22); 
        doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.text(companyName.toUpperCase(), centerX, yPos, { align: 'center' });
        
        yPos += 7;
        doc.setFontSize(10); 
        doc.setFont("helvetica", "normal"); 
        doc.setTextColor(80);
        
        // 2. Address (Centered)
        // Allow wider text area since it's centered
        const addressLines = doc.splitTextToSize(companyAddr, 140); 
        doc.text(addressLines, centerX, yPos, { align: 'center' });
        
        // 3. Contact & GST (Centered below address)
        const addrHeight = addressLines.length * 5;
        let contactY = yPos + addrHeight;

        let contactLine = '';
        if(company?.contact) contactLine += `Phone: ${company.contact}`;
        if(company?.gst) contactLine += `  |  GSTIN: ${company.gst}`;
        
        if (contactLine) {
            doc.text(contactLine, centerX, contactY, { align: 'center' });
        }

        // --- Lorry Receipt Box (Top Right) ---
        const boxWidth = 80; 
        const boxHeight = 22; 
        const boxX = pageWidth - margin - boxWidth; 
        const boxY = 10;
        
        doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'F');
        
        doc.setTextColor(255); 
        doc.setFontSize(12); 
        doc.setFont("helvetica", "bold");
        // Title Centered in Box
        doc.text("LORRY RECEIPT", boxX + (boxWidth/2), boxY + 7, { align: 'center' });
        
        doc.setFontSize(10); 
        doc.setFont("helvetica", "bold");
        
        // LR No (Left side of box)
        doc.text(`LR No: ${b.biltyNumber || '-'}`, boxX + 5, boxY + 16);
        
        // Date (Right side of box)
        const dateStr = b.date ? b.date.split('-').reverse().join('-') : '-';
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${dateStr}`, boxX + boxWidth - 5, boxY + 16, { align: 'right' });
        
        
        // --- 2. TRIP STRIP (Details Bar) ---
        yPos = 45; 
        const stripHeight = 12;
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]); 
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, yPos, contentWidth, stripHeight, 1, 1);
        
        doc.setFillColor(248, 250, 252); 
        doc.rect(margin, yPos, contentWidth, 4.5, 'F');
        doc.line(margin, yPos + 4.5, pageWidth - margin, yPos + 4.5);
        
        const colWidth = contentWidth / 4;
        const col1 = margin + colWidth; 
        const col2 = margin + (colWidth * 2); 
        const col3 = margin + (colWidth * 3);
        
        doc.line(col1, yPos, col1, yPos + stripHeight); 
        doc.line(col2, yPos, col2, yPos + stripHeight); 
        doc.line(col3, yPos, col3, yPos + stripHeight);
        
        const drawStripCell = (label: string, value: string, x: number) => {
            doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(100); 
            doc.text(label, x + 2, yPos + 3);
            doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(0); 
            doc.text(value || '-', x + 2, yPos + 9);
        };
        
        drawStripCell("VEHICLE NUMBER", b.vehicleNumber, margin);
        drawStripCell("INVOICE NO", b.invoiceNo || '-', col1);
        drawStripCell("FROM STATION", b.fromStation, col2);
        drawStripCell("TO STATION", b.toStation, col3);
        
        yPos += stripHeight + 4;

        // --- 3. PARTIES SECTION (WITH ADDRESS) ---
        const partyBoxH = 32; 
        const partyBoxW = (contentWidth / 2) - 1;
        
        // Consignor Box
        doc.roundedRect(margin, yPos, partyBoxW, partyBoxH, 1, 1);
        doc.setFontSize(7); doc.text("CONSIGNOR (SENDER)", margin + 3, yPos + 3.5);
        doc.setFontSize(10); doc.text(b.consignor?.name || '', margin + 3, yPos + 10);
        
        // Address Handling
        doc.setFontSize(8); 
        const cnrAddr = b.consignor?.address || "";
        const cnrLines = doc.splitTextToSize(cnrAddr, partyBoxW - 6);
        doc.text(cnrLines, margin + 3, yPos + 15);
        
        if(b.consignor?.gst) doc.text(`GSTIN: ${b.consignor.gst}`, margin + 3, yPos + 29);

        // Consignee Box
        const cneX = margin + partyBoxW + 2;
        doc.roundedRect(cneX, yPos, partyBoxW, partyBoxH, 1, 1);
        doc.setFontSize(7); doc.text("CONSIGNEE (RECEIVER)", cneX + 3, yPos + 3.5);
        doc.setFontSize(10); doc.text(b.consignee?.name || '', cneX + 3, yPos + 10);
        
        // Address Handling
        doc.setFontSize(8); 
        const cneAddr = b.consignee?.address || "";
        const cneLines = doc.splitTextToSize(cneAddr, partyBoxW - 6);
        doc.text(cneLines, cneX + 3, yPos + 15);
        
        if(b.consignee?.gst) doc.text(`GSTIN: ${b.consignee.gst}`, cneX + 3, yPos + 29);
        
        yPos += partyBoxH + 4;

        // --- 4. GOODS TABLE ---
        autoTable(doc, {
            startY: yPos,
            head: [['PKGS', 'DESCRIPTION OF GOODS', 'WEIGHT', 'RATE', 'AMOUNT (Rs)']],
            body: [[b.itemDetails?.packages || '', b.itemDetails?.description || '', b.itemDetails?.weight || '', b.itemDetails?.rate || '', `Rs. ${b.freight?.amount.toLocaleString()}`]],
            theme: 'grid',
            headStyles: { fillColor: BRAND_COLOR as [number, number, number], textColor: 255 },
            styles: { fontSize: 9 },
        });

        // --- 5. FOOTER SECTION & CALCULATIONS ---
        const footerStartY = (doc as any).lastAutoTable.finalY + 10;
        
        // Remarks (Left)
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text("REMARKS:", margin, footerStartY);
        doc.setFont("helvetica", "normal");
        const rems = doc.splitTextToSize(b.remarks || "N/A", 100);
        doc.text(rems, margin, footerStartY + 5);
        
        // Value of Goods
        if (b.declaredValue) {
            doc.setFontSize(9); doc.setFont("helvetica", "bold");
            doc.text(`Invoice Value: Rs. ${b.declaredValue.toLocaleString()}`, margin, footerStartY + 12);
        }
        
        // Driver Info
        doc.setFontSize(8); doc.setFont("helvetica", "bold");
        doc.text(`DRIVER: ${b.driverName || '-'} ${b.driverMobile ? '('+b.driverMobile+')' : ''}`, margin, footerStartY + 18);

        // Terms & Conditions (Bottom Left)
        doc.setFontSize(7); doc.setFont("helvetica", "bold");
        doc.text("TERMS & CONDITIONS:", margin, footerStartY + 26);
        doc.setFont("helvetica", "normal");
        const terms = [
            "1. Goods are transported at owner's risk.",
            "2. Service tax payable by consignor/consignee.",
            "3. All disputes subject to local jurisdiction.",
            "4. No responsibility for leakage/breakage."
        ];
        terms.forEach((term, index) => {
            doc.text(term, margin, footerStartY + 30 + (index * 3));
        });

        // Totals (Right)
        const totalsX = pageWidth - margin - 60;
        let totalY = footerStartY;
        const drawTot = (l: string, v: string) => {
            doc.setFontSize(9); doc.setFont("helvetica", "bold");
            doc.text(l, totalsX, totalY);
            doc.text(v, pageWidth - margin, totalY, { align: 'right' });
            totalY += 6;
        };

        const labour = b.freight.labour || 0;
        const kanta = b.freight.kanta || 0;
        const otherCh = b.freight.otherCh || 0;
        const stCh = b.freight.stCh || 0;
        const basicFreight = b.freight.amount || 0;
        
        // Calculate Accurate Grand Total
        const grandTotal = basicFreight + labour + kanta + otherCh + stCh;
        const advance = b.freight.advance || 0;
        const balance = grandTotal - advance;

        drawTot("Basic Freight:", `Rs. ${basicFreight.toLocaleString()}`);
        if(labour > 0) drawTot("Labour Charges:", `Rs. ${labour.toLocaleString()}`);
        if(kanta > 0) drawTot("Kanta/Weight:", `Rs. ${kanta.toLocaleString()}`);
        if(stCh > 0) drawTot("Statistical Ch:", `Rs. ${stCh.toLocaleString()}`);
        if(otherCh > 0) drawTot("Other Charges:", `Rs. ${otherCh.toLocaleString()}`);
        
        // Divider line for total
        doc.setLineWidth(0.1);
        doc.line(totalsX, totalY - 4, pageWidth - margin, totalY - 4);
        
        drawTot("Grand Total:", `Rs. ${grandTotal.toLocaleString()}`);
        drawTot("Advance Paid:", `Rs. ${advance.toLocaleString()}`);
        
        doc.setFillColor(30, 41, 59); doc.rect(totalsX - 2, totalY - 4, 64, 8, 'F');
        doc.setTextColor(255);
        doc.text("BALANCE DUE:", totalsX, totalY + 1);
        doc.text(`Rs. ${balance.toLocaleString()}`, pageWidth - margin, totalY + 1, { align: 'right' });

        doc.setTextColor(0);
        doc.setFontSize(7);
        doc.text("AUTHORIZED SIGNATORY", pageWidth - margin, pageHeight - 10, { align: 'right' });

        drawPDFFooter(doc);
        sendToNativeApp(doc.output('blob'), `LR-${b.biltyNumber}.pdf`);
        notify("PDF Created", "LR Generated Successfully", "success");
    } catch (e) {
        notify("Error", "PDF Failed", "error");
    }
};
