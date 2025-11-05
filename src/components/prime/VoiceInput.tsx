import React, { useEffect, useMemo, useRef, useState } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const interimRef = useRef<string>('');

  const SpeechRec = useMemo(
    () => (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition,
    []
  );

  useEffect(() => {
    if (!SpeechRec) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec: SpeechRecognition = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      interimRef.current = transcript;
      onTranscript(transcript);
    };
    rec.onerror = () => {
      setRecording(false);
    };
    rec.onend = () => {
      setRecording(false);
    };
    recognitionRef.current = rec;
  }, [SpeechRec, onTranscript]);

  const start = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      interimRef.current = '';
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const stop = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setRecording(false);
  };

  const toggle = () => {
    if (!supported) return;
    if (recording) stop(); else start();
  };

  const commonProps = supported
    ? {
        onPointerDown: start,
        onPointerUp: stop,
        onPointerLeave: () => recording && stop()
      }
    : {};

  return (
    <button
      type="button"
      onClick={toggle}
      title={supported ? (recording ? 'Stop voice' : 'Start voice') : 'Voice input not supported'}
      aria-pressed={recording}
      className={`w-12 h-12 rounded-full flex items-center justify-center ${supported ? (recording ? 'bg-red-600' : 'bg-white/10 hover:bg-white/15') : 'bg-white/5 cursor-not-allowed'}`}
      {...commonProps}
      disabled={!supported}
    >
      🎤
    </button>
  );
}


