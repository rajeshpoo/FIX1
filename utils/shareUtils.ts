
import html2canvas from 'html2canvas';
import { notify } from '../services/firebaseService';

/**
 * Captures a DOM element as an image and triggers the native share dialog.
 * @param elementId The ID of the HTML element to capture (must be visible on screen)
 * @param fileName The default filename for the image
 */
export const shareElementAsImage = async (elementId: string, fileName: string = 'share.jpg') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // 1. Generate Canvas from DOM
    // OPTIMIZATION:
    // - scale: 2.0 (Best balance. 1.0 is blurry, 3.0 crashes Android. 2.0 is HD and stable)
    // - useCORS: true (Required for cross-origin images)
    // - backgroundColor: '#ffffff' (Clean white background)
    // - scrollX/scrollY: 0 (Prevents clipping if user scrolled)
    const canvas = await html2canvas(element, {
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#ffffff', 
      logging: false,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (node) => node.classList.contains('no-print') // Ignore buttons if marked
    });

    // 2. Convert Canvas to Blob (JPEG 90% Quality)
    canvas.toBlob(async (blob) => {
      if (!blob) {
        notify("Error", "Could not generate image", "error");
        return;
      }

      // Ensure filename ends in .jpg
      const cleanFileName = fileName.replace(/\.png$/i, '.jpg');

      // 3. Create File object
      const file = new File([blob], cleanFileName, { type: 'image/jpeg' });

      // 4. Construct Share Data
      const shareData = {
        files: [file],
        title: 'FleetDost Receipt',
        text: 'Receipt Shared via FleetDost'
      };

      // 5. Check & Trigger Share
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share(shareData);
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') {
             console.warn('Share failed, saving to device instead.', shareError);
             downloadImage(canvas, cleanFileName);
          }
        }
      } else {
        // Fallback: Download
        downloadImage(canvas, cleanFileName);
      }
    }, 'image/jpeg', 0.90); // High Quality JPEG

  } catch (err) {
    console.error("Screenshot error:", err);
    notify("Error", "Failed to create receipt image", "error");
  }
};

const downloadImage = (canvas: HTMLCanvasElement, fileName: string) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/jpeg', 0.90);
    document.body.appendChild(link);
    link.click();
    if (document.body.contains(link)) document.body.removeChild(link);
    notify("Saved", "Receipt saved to gallery.", "success");
};
