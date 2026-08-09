/**
 * scriptSanitizer.js — Intelligent document speech sanitizer & section parser
 * Solves all presentation slide, PDF, and document edge cases for teleprompter rehearsal.
 */

/**
 * Filter out slide junk lines (Table of Contents number sequences, author footers, copyright, etc.)
 */
export function isJunkLine(line) {
  if (!line || !line.trim()) return true;
  const trimmed = line.trim();

  // 1. Table of Contents page index dumps like "1 2 3 4 5 6 7 8 9"
  if (/\b\d+(\s+\d+){3,}\b/.test(trimmed)) return true;

  // 2. Explicit "TABLE OF CONTENTS" or "INDEX" headers with standalone numbers
  if (/^(?:TABLE OF CONTENTS|INDEX|AGENDA|OVERVIEW)\s*[\d\s]*$/i.test(trimmed)) return true;

  // 3. Standalone page numbers or slide counts
  if (/^(?:Page\s*\d+(?:\s*of\s*\d+)?|\d+|\d+\/\d+|Slide\s*\d+)\s*$/i.test(trimmed)) return true;

  // 4. Slide author footers like "-Ayush Kabra", "Confidential", "All Rights Reserved", URLs
  if (/^-(?:[A-Z][a-z]+\s*){1,3}$/i.test(trimmed)) return true;
  if (/^(?:Confidential|All Rights Reserved|Copyright\s*\d*|www\.\S+\.\S+|http\S+)\s*$/i.test(trimmed)) return true;

  // 5. Binary PDF remnants
  if (/\/Contents|\/Resources|%PDF-|endobj|stream/i.test(trimmed)) return true;

  return false;
}

/**
 * Clean bullet icons and formatting artifacts
 */
export function cleanBulletLine(line) {
  if (!line) return '';
  return line
    .replace(/^[●•▪◆➢▶\-\*\u2014\u25AA\u25AB]\s*/, '') // strip bullets
    .replace(/\s*[●•▪◆➢▶]\s*/g, '. ') // replace inline bullets with period
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parses raw extracted text into clean, structured section cards
 */
export function parseDocumentSections(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const rawLines = rawText.split(/\n+|\r+/);
  const cleanLines = [];

  for (let line of rawLines) {
    if (!isJunkLine(line)) {
      const cleaned = cleanBulletLine(line);
      if (cleaned) {
        cleanLines.push(cleaned);
      }
    }
  }

  // Group clean lines into logical section blocks
  const sections = [];
  let currentTitle = 'Introduction';
  let currentBody = [];

  for (let line of cleanLines) {
    // Check if line looks like a title (short line, ending with colon, uppercase, or persona label)
    const isHeading =
      line.length < 50 &&
      (line.endsWith(':') ||
        /^[A-Z0-9\s,&]{3,40}$/.test(line) ||
        /^(?:Market Research|User Personas|Pain Points|Proposed Solution|MVP|Go-to-Market|Key Assumptions|Conclusion|[A-Z]{3,},[A-Za-z]+)/i.test(line));

    if (isHeading && currentBody.length > 0) {
      sections.push({
        id: `sec-${sections.length + 1}`,
        title: currentTitle.replace(/:$/, ''),
        content: currentBody.join(' '),
        enabled: true,
      });
      currentTitle = line;
      currentBody = [];
    } else if (isHeading && currentBody.length === 0) {
      currentTitle = line;
    } else {
      currentBody.push(line);
    }
  }

  if (currentBody.length > 0) {
    sections.push({
      id: `sec-${sections.length + 1}`,
      title: currentTitle.replace(/:$/, ''),
      content: currentBody.join(' '),
      enabled: true,
    });
  }

  return sections.length > 0
    ? sections
    : [
        {
          id: 'sec-1',
          title: 'Main Speech Text',
          content: cleanLines.join(' '),
          enabled: true,
        },
      ];
}

/**
 * Converts array of sections or raw text into a polished, natural spoken speech script
 */
export function convertToSpeechScript(sectionsOrRawText) {
  let text = '';
  if (Array.isArray(sectionsOrRawText)) {
    text = sectionsOrRawText
      .filter((s) => s.enabled)
      .map((s) => `**${s.title}**\n${s.content}`)
      .join('\n\n');
  } else {
    const sections = parseDocumentSections(sectionsOrRawText);
    text = sections
      .filter((s) => s.enabled)
      .map((s) => `**${s.title}**\n${s.content}`)
      .join('\n\n');
  }

  // Final speech formatting polish: ensure proper sentence spacing and period endings
  return text
    .replace(/\s+\./g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/(?<!\.)\n\n/g, '.\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
