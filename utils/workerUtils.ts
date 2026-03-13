
/**
 * WEB WORKER FOR EXCEL PARSING
 * This runs in a background thread to prevent UI freezing during large file reads.
 */

export const parseExcelInWorker = (fileData: ArrayBuffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    // Worker Code as a String (Blob)
    const workerCode = `
      // Import SheetJS from CDN for Worker environment
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      
      self.onmessage = function(e) {
        try {
          const data = new Uint8Array(e.data);
          
          // Read Workbook - CRITICAL: cellDates: false ensures we get raw numbers/strings
          // This prevents SheetJS from applying local timezone or assuming MM/DD format automatically.
          const workbook = XLSX.read(data, { type: 'array', cellDates: false });
          
          // Get First Sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          // Send back to Main Thread
          postMessage({ success: true, data: jsonData });
        } catch (err) {
          postMessage({ success: false, error: err.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.data);
      } else {
        reject(new Error(e.data.error));
      }
      // Cleanup
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.onerror = (err) => {
      reject(new Error("Worker Error: " + err.message));
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    // Send Data to Worker
    worker.postMessage(fileData);
  });
};
