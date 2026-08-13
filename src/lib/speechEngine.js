/**
 * speechEngine.js — Universal Speech Recognition Engine
 * Native Web Speech API for Chrome/Edge (with 60s keep-alive loop)
 * + MediaRecorder & Groq Whisper API fallback for Safari & Firefox ($0 Cost).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://speakwell-five.vercel.app';

let recognition = null;
let isListening = false;
let sessionCommittedText = '';
let lastFinalText = '';

let mediaRecorder = null;
let audioChunks = [];
let mediaStream = null;
let activeCallbacks = null;

export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
}

export function hasNativeSpeechRecognition() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Universal Multi-Stage Zero-Duplication Pipeline
 */
export function deduplicateSpeechText(text) {
  if (!text || !text.trim()) return '';
  let str = text.trim();

  str = str.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  for (let phraseLen = 10; phraseLen >= 2; phraseLen--) {
    const pattern = new RegExp(`\\b((?:\\w+\\s+){${phraseLen - 1}}\\w+)\\s+\\1\\b`, 'gi');
    str = str.replace(pattern, '$1');
  }

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
        i += matchedLength;
      } else {
        i++;
      }
    }

    str = cleanedWords.join(' ');
  }

  str = str
    .replace(/\b(\w+)\s+\1\b/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return str;
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

      const fullRawFinal = (sessionCommittedText + ' ' + currentFinal).trim();
      lastFinalText = fullRawFinal;

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

  // Fallback for Safari/Firefox: Setup MediaRecorder
  return {
    isFallback: true,
  };
}

export async function startListening() {
  sessionCommittedText = '';
  lastFinalText = '';
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
      audioChunks = [];
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.start(500);
      activeCallbacks?.onResult?.({
        finalText: '',
        interimText: '🎙️ Recording audio (Safari/Firefox Whisper Fallback active)...',
      });
    } catch (err) {
      console.error('MediaRecorder start error:', err);
      activeCallbacks?.onError?.('not-allowed');
    }
  }
}

export async function stopListening() {
  isListening = false;

  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
    return;
  }

  // Stop MediaRecorder and transcribe via Groq Whisper API
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    return new Promise((resolve) => {
      mediaRecorder.onstop = async () => {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: mimeType });

        if (audioBlob.size > 100) {
          try {
            activeCallbacks?.onResult?.({
              finalText: '',
              interimText: '⏳ Transcribing audio with Groq Whisper...',
            });

            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
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
              const transcribedText = deduplicateSpeechText(data.text || '');
              lastFinalText = transcribedText;

              activeCallbacks?.onResult?.({
                finalText: transcribedText,
                interimText: '',
              });
              resolve(transcribedText);
            };
          } catch (err) {
            console.error('Whisper transcription error:', err);
            resolve('');
          }
        } else {
          resolve('');
        }
      };

      try {
        mediaRecorder.stop();
      } catch (_) {
        resolve('');
      }
    });
  }
}

export function destroyRecognition() {
  isListening = false;
  sessionCommittedText = '';
  lastFinalText = '';
  activeCallbacks = null;

  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
    recognition = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
    } catch (_) {}
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}
