
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LedgerAccount, LedgerTransaction } from '../types';
import { sendToNativeApp } from './helpers';
import { drawPDFHeader, drawPDFFooter, COLORS } from './pdfGenerator';

export const generateLedgerPDF = (account: LedgerAccount, transactions: LedgerTransaction[], businessDetails: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // 1. Draw Shared Header
    let currentY = drawPDFHeader(doc, "LEDGER ACCOUNT STATEMENT", businessDetails);

    // 2. Draw Account Summary Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, pageWidth - 28, 25, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.SECONDARY[0], COLORS.SECONDARY[1], COLORS.SECONDARY[2]);
    doc.text(account.name, 20, currentY + 8);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Type: ${account.type} | Mobile: ${account.mobile || 'N/A'}`, 20, currentY + 14);
    
    // Net Balance Indicator
    const bal = account.balance;
    const isDue = bal > 0; // Positive means Receivable (Dr)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    doc.setTextColor(isDue ? 22 : 220, isDue ? 163 : 38, isDue ? 74 : 38); 
    doc.text(`Net Balance: Rs. ${Math.abs(bal).toLocaleString()} ${isDue ? 'Dr (Receivable)' : 'Cr (Payable)'}`, pageWidth - 20, currentY + 12, { align: 'right' });

    currentY += 35;

    // 3. Prepare Table Data
    const tableData = transactions.map(t => [
        t.date,
        t.description,
        t.type === 'DEBIT' ? `Rs. ${t.amount.toLocaleString()}` : '-',
        t.type === 'CREDIT' ? `Rs. ${t.amount.toLocaleString()}` : '-'
    ]);

    // Add Opening Balance Row
    if (account.openingBalance !== 0) {
        tableData.unshift([
            '-',
            'OPENING BALANCE (B/F)',
            account.openingBalance > 0 ? `Rs. ${Math.abs(account.openingBalance).toLocaleString()}` : '-',
            account.openingBalance < 0 ? `Rs. ${Math.abs(account.openingBalance).toLocaleString()}` : '-'
        ]);
    }

    // 4. Generate Table
    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Particulars', 'Debit (Dr)', 'Credit (Cr)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.PRIMARY, textColor: 255, fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.SECONDARY },
        columnStyles: { 
            0: { cellWidth: 25 },
            2: { halign: 'right', textColor: [220, 38, 38] as [number, number, number], fontStyle: 'bold' }, // Debit Red
            3: { halign: 'right', textColor: [22, 163, 74] as [number, number, number], fontStyle: 'bold' }  // Credit Green
        },
        foot: [['', 'CLOSING BALANCE', bal > 0 ? `Rs. ${Math.abs(bal).toLocaleString()}` : '', bal < 0 ? `Rs. ${Math.abs(bal).toLocaleString()}` : '']],
        footStyles: { fillColor: COLORS.ACCENT, textColor: COLORS.TEXT_MAIN, fontStyle: 'bold' }
    });

    drawPDFFooter(doc);

    // 5. Output
    const blob = doc.output('blob');
    sendToNativeApp(blob, `Ledger_${account.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};
