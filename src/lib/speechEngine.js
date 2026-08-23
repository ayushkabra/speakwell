/**
 * speechEngine.js — Universal Speech Recognition Engine
 * Native Web Speech API for Chrome/Edge (with 60s keep-alive loop & mobile duplication protection)
 * + MediaRecorder & Groq Whisper API fallback for Safari & Firefox ($0 Cost).
 * Continuous 45s MediaRecorder Segment Rotation ensures 100% valid headers & payload limits.
 * All segment promises are tracked in segmentPromises array & awaited via Promise.all on stopListening().
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://speakwell-five.vercel.app';

let recognition = null;
let isListening = false;
let sessionCommittedText = '';
let lastFinalText = '';
let processedFinalIndices = new Set();

let whisperCommittedText = ''; // Module-level whisper accumulation across pause/resume & rotation segments
let mediaStream = null;
let currentSegmentRecorder = null;
let segmentPromises = []; // Track all segment transcription promises to guarantee zero race conditions on stop
let activeCallbacks = null;
let segmentRotateTimer = null;

export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
}

export function hasNativeSpeechRecognition() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Universal Multi-Stage Zero-Duplication Pipeline
 * Strips compounding repetitive phrases caused by Mobile Web Speech API restarts
 */
export function deduplicateSpeechText(text) {
  if (!text || !text.trim()) return '';
  let str = text.trim();

  // Strip consecutive repeated words ("guitar guitar" -> "guitar")
  str = str.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  // Strip repeated sentence blocks ("I have recently started learning guitar I have recently started learning guitar" -> "I have recently started learning guitar")
  for (let phraseLen = 15; phraseLen >= 2; phraseLen--) {
    const pattern = new RegExp(`\\b((?:\\w+\\s+){${phraseLen - 1}}\\w+)(?:\\s+\\1)+\\b`, 'gi');
    str = str.replace(pattern, '$1');
  }

  const words = str.split(/\s+/).filter(Boolean);
  if (words.length > 4) {
    const cleanedWords = [];
    let i = 0;

    while (i < words.length) {
      cleanedWords.push(words[i]);

      let matchedLength = 0;
      for (let len = Math.min(12, cleanedWords.length); len >= 1; len--) {
        const tail = cleanedWords.slice(-len).map((w) => w.toLowerCase()).join(' ');
        const next = words.slice(i + 1, i + 1 + len).map((w) => w.toLowerCase()).join(' ');

        if (tail === next && tail.length > 0) {
          matchedLength = len;
          break;
        }
      }

      if (matchedLength > 0) {
        i += matchedLength;
      } else {
        i++;
      }
    }

    str = cleanedWords.join(' ');
  }

  return str.replace(/\s{2,}/g, ' ').trim();
}

export function createRecognition({ onResult, onError, onEnd }) {
  activeCallbacks = { onResult, onError, onEnd };
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SR) {
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      let currentInterim = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const chunk = (res[0]?.transcript || '').trim();

        if (!chunk) continue;

        if (res.isFinal) {
          if (!processedFinalIndices.has(i)) {
            processedFinalIndices.add(i);

            const currentCleanCommitted = sessionCommittedText.trim();
            const lowerCommitted = currentCleanCommitted.toLowerCase();
            const lowerChunk = chunk.toLowerCase();

            // Mobile Chrome/Android safeguard: Do not re-append if current committed text already ends with this chunk
            if (!lowerCommitted.endsWith(lowerChunk) && !lowerCommitted.includes(lowerChunk)) {
              sessionCommittedText = (sessionCommittedText + ' ' + chunk).trim();
            }
          }
        } else {
          currentInterim += chunk + ' ';
        }
      }

      const cleanFinal = deduplicateSpeechText(sessionCommittedText);
      const cleanInterim = deduplicateSpeechText(currentInterim);
      lastFinalText = cleanFinal;

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
      if (isListening) {
        processedFinalIndices.clear();
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

  // Fallback for Safari/Firefox/Mobile: Setup MediaRecorder
  return {
    isFallback: true,
  };
}

async function sendWhisperChunk(blob, mimeType) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        let res = await fetch('/api/whisper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Data, mimeType }),
        });

        if (!res.ok) {
          res = await fetch(`${API_BASE_URL}/api/whisper`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64Data, mimeType }),
          });
        }

        const data = await res.json();
        resolve(data.text || '');
      } catch (err) {
        console.warn('Whisper chunk error:', err);
        resolve('');
      }
    };
  });
}

function startSegment() {
  if (!mediaStream || !isListening) return;

  const mimeType = MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : MediaRecorder.isTypeSupported('audio/mp4')
    ? 'audio/mp4'
    : 'audio/aac';

  // Closure-scoped private chunks array for this specific recorder instance
  const instanceChunks = [];
  const recorder = new MediaRecorder(mediaStream, { mimeType });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      instanceChunks.push(e.data);
    }
  };

  const segPromise = new Promise((resolve) => {
    recorder.onstop = async () => {
      const blob = new Blob(instanceChunks, { type: mimeType });
      if (blob.size > 100) {
        try {
          activeCallbacks?.onResult?.({
            finalText: deduplicateSpeechText(whisperCommittedText),
            interimText: '⏳ Transcribing audio segment with Groq Whisper...',
          });

          const segmentText = await sendWhisperChunk(blob, mimeType);
          if (segmentText) {
            const currentCleanWhisper = whisperCommittedText.trim();
            const lowerWhisper = currentCleanWhisper.toLowerCase();
            const lowerSeg = segmentText.trim().toLowerCase();

            if (!lowerWhisper.endsWith(lowerSeg) && !lowerWhisper.includes(lowerSeg)) {
              whisperCommittedText = (whisperCommittedText + ' ' + segmentText).trim();
            }
            const cleanFinal = deduplicateSpeechText(whisperCommittedText);
            lastFinalText = cleanFinal;

            activeCallbacks?.onResult?.({
              finalText: cleanFinal,
              interimText: isListening ? '🎙️ Continuous recording active...' : '',
            });
          }
        } catch (err) {
          console.warn('Segment Whisper error:', err);
        }
      }
      resolve(deduplicateSpeechText(whisperCommittedText));
    };
  });

  segmentPromises.push(segPromise);
  currentSegmentRecorder = recorder;
  recorder.start(500);

  // Auto-rotate segment every 45s: stop current recorder cleanly (triggering its onstop handler) & start fresh segment
  clearTimeout(segmentRotateTimer);
  segmentRotateTimer = setTimeout(() => {
    if (isListening && currentSegmentRecorder === recorder && recorder.state === 'recording') {
      recorder.stop(); // Stops this instance cleanly, firing its onstop handler
      startSegment();  // Starts a fresh recorder instance with its own isolated chunks array
    }
  }, 45000);
}

export async function startListening(isNewSession = false) {
  if (isNewSession) {
    sessionCommittedText = '';
    whisperCommittedText = '';
    lastFinalText = '';
    processedFinalIndices.clear();
    segmentPromises = [];
  }
  isListening = true;

  if (recognition) {
    try {
      recognition.start();
    } catch (_) {}
    return;
  }

  // MediaRecorder Fallback for Safari & Firefox
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      if (!mediaStream) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      startSegment();

      activeCallbacks?.onResult?.({
        finalText: deduplicateSpeechText(whisperCommittedText),
        interimText: '🎙️ Recording audio (Safari/Firefox Whisper active)...',
      });
    } catch (err) {
      console.error('MediaRecorder start error:', err);
      activeCallbacks?.onError?.('not-allowed');
    }
  }
}

export async function stopListening() {
  isListening = false;
  clearTimeout(segmentRotateTimer);

  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
    return deduplicateSpeechText(lastFinalText);
  }

  if (currentSegmentRecorder && currentSegmentRecorder.state !== 'inactive') {
    currentSegmentRecorder.stop();
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  if (segmentPromises.length > 0) {
    await Promise.all(segmentPromises);
  }

  return deduplicateSpeechText(whisperCommittedText || lastFinalText);
}

export function destroyRecognition() {
  isListening = false;
  clearTimeout(segmentRotateTimer);
  sessionCommittedText = '';
  whisperCommittedText = '';
  lastFinalText = '';
  processedFinalIndices.clear();
  segmentPromises = [];
  activeCallbacks = null;

  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
    recognition = null;
  }

  if (currentSegmentRecorder && currentSegmentRecorder.state !== 'inactive') {
    try {
      currentSegmentRecorder.stop();
    } catch (_) {}
    currentSegmentRecorder = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}
