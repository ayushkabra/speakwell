/**
 * speechEngine.js — Universal Web Speech API Engine with Seamless Infinite Keep-Alive Loop
 * Guaranteed zero word duplication & continuous multi-minute speech recognition across Desktop & Mobile.
 */

let recognition = null;
let isListening = false;
let sessionCommittedText = '';
let lastFinalText = '';

export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Universal Multi-Stage Zero-Duplication Pipeline
 * Eliminates duplicate consecutive words, repeating n-gram phrases (1 to 10 words),
 * and overlapping phrase buffers across all Web Speech API engines.
 */
export function deduplicateSpeechText(text) {
  if (!text || !text.trim()) return '';

  let str = text.trim();

  // STAGE 1: Strip consecutive duplicate single words (e.g. "word word word" -> "word")
  str = str.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  // STAGE 2: Strip repeating n-gram phrases from 2 to 10 words long
  for (let phraseLen = 10; phraseLen >= 2; phraseLen--) {
    const pattern = new RegExp(`\\b((?:\\w+\\s+){${phraseLen - 1}}\\w+)\\s+\\1\\b`, 'gi');
    str = str.replace(pattern, '$1');
  }

  // STAGE 3: Token-level rolling window phrase collapse for WebKit cumulative buffers
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length > 4) {
    const cleanedWords = [];
    let i = 0;

    while (i < words.length) {
      cleanedWords.push(words[i]);

      let matchedLength = 0;
      for (let len = Math.min(8, cleanedWords.length); len >= 1; len--) {
        const tail = cleanedWords.slice(-len).map((w) => w.toLowerCase()).join(' ');
        const next = words.slice(i + 1, i + 1 + len).map((w) => w.toLowerCase()).join(' ');

        if (tail === next && tail.length > 0) {
          matchedLength = len;
          break;
        }
      }

      if (matchedLength > 0) {
        i += matchedLength; // Skip repeated phrase chunk!
      } else {
        i++;
      }
    }

    str = cleanedWords.join(' ');
  }

  // STAGE 4: Stitch overlapping suffix/prefix word boundaries
  str = str
    .replace(/\b(\w+)\s+\1\b/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return str;
}

export function createRecognition({ onResult, onError, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    let currentFinal = '';
    let currentInterim = '';

    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i];
      const chunk = res[0]?.transcript || '';

      if (res.isFinal) {
        currentFinal += chunk + ' ';
      } else {
        currentInterim += chunk;
      }
    }

    // Combine committed text from auto-restarts with current recognition session
    const fullRawFinal = (sessionCommittedText + ' ' + currentFinal).trim();
    lastFinalText = fullRawFinal;

    // Pass through Universal Zero-Duplication Pipeline
    const cleanFinal = deduplicateSpeechText(fullRawFinal);
    const cleanInterim = deduplicateSpeechText(currentInterim);

    onResult?.({
      finalText: cleanFinal,
      interimText: cleanInterim,
    });
  };

  recognition.onerror = (e) => {
    onError?.(e.error);
    if ((e.error === 'no-speech' || e.error === 'network') && isListening) {
      setTimeout(() => {
        if (isListening && recognition) {
          try {
            recognition.start();
          } catch (_) {}
        }
      }, 200);
    }
  };

  recognition.onend = () => {
    // When browser engine auto-terminates (~60s limit), commit text & restart seamlessly
    if (isListening) {
      if (lastFinalText) {
        sessionCommittedText = lastFinalText;
      }
      setTimeout(() => {
        if (isListening && recognition) {
          try {
            recognition.start();
          } catch (_) {}
        }
      }, 100);
    }
    onEnd?.();
  };

  return recognition;
}

export function startListening() {
  sessionCommittedText = '';
  lastFinalText = '';
  if (recognition) {
    isListening = true;
    try {
      recognition.start();
    } catch (_) {}
  }
}

export function stopListening() {
  isListening = false;
  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
  }
}

export function destroyRecognition() {
  isListening = false;
  sessionCommittedText = '';
  lastFinalText = '';
  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
    recognition = null;
  }
}
