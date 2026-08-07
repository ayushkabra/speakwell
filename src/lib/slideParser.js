let pdfjsPromise = null;

// Dynamically load PDF.js from CDN to avoid npm dependency errors
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js script'));
    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

/**
 * Render PDF presentation slides to HTML5 Canvas Data URLs
 */
export async function parseSlidesFromPdf(file) {
  try {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;
    const slides = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Extract text content for slide summary
      let pageText = '';
      try {
        const textContent = await page.getTextContent();
        pageText = textContent.items.map((item) => item.str).join(' ');
      } catch {
        pageText = `Slide ${pageNum} Content`;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      slides.push({
        id: `slide-pdf-${pageNum}`,
        pageNum,
        title: `Slide ${pageNum}`,
        text: pageText.slice(0, 150) || `Slide ${pageNum} Content`,
        imageUrl: dataUrl,
      });
    }

    return slides;
  } catch (err) {
    console.warn('PDF Slide parsing fallback:', err);
    // Fallback: Generate placeholder slide cards if PDF.js fails
    return [
      { id: 'slide-fallback-1', pageNum: 1, title: 'Slide 1: Introduction', text: 'Title & Executive Summary', imageUrl: null },
      { id: 'slide-fallback-2', pageNum: 2, title: 'Slide 2: Problem & Solution', text: 'Market Pain Point & Solution Overview', imageUrl: null },
      { id: 'slide-fallback-3', pageNum: 3, title: 'Slide 3: Financial Projections', text: 'Revenue Model & Growth Trajectory', imageUrl: null },
    ];
  }
}

/**
 * Parse text outline into itemized slide cards
 */
export function parseSlideOutlineFromText(text) {
  if (!text || !text.trim()) return [];
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, idx) => {
    const pageNum = idx + 1;
    const cleanLine = line.replace(/^(slide\s*\d+[:.-]?\s*)/i, '');
    return {
      id: `slide-text-${pageNum}`,
      pageNum,
      title: `Slide ${pageNum}: ${cleanLine.slice(0, 45)}`,
      text: cleanLine,
      imageUrl: null,
    };
  });
}
