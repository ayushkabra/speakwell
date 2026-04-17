/**
 * speechEngine.js — Web Speech API wrapper with auto-restart
 */

let recognition = null;
let isListening = false;

export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognition({ onResult, onError, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  // lang = '' → browser uses system language (enables multilingual auto-detect)

  recognition.onresult = (e) => {
    let finalText = '';
    let interimText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalText += t + ' ';
      } else {
        interimText += t;
      }
    }
    onResult?.({ finalText, interimText });
  };

  recognition.onerror = (e) => {
    onError?.(e.error);
    // Auto-restart on no-speech if still recording
    if (e.error === 'no-speech' && isListening) {
      try {
        recognition.stop();
        setTimeout(() => {
          if (isListening) recognition.start();
        }, 300);
      } catch (_) {}
    }
  };

  recognition.onend = () => {
    // Auto-restart for long recordings
    if (isListening) {
      try {
        recognition.start();
      } catch (_) {}
    }
    onEnd?.();
  };

  return recognition;
}

export function startListening() {
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
  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
    recognition = null;
  }
}
