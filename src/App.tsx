import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileAudio, 
  Languages, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Copy, 
  Mic,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

interface TranscriptionResult {
  detected_language: string;
  original_transcript: string;
  target_language: string;
  translated_transcript: string;
}

const LANGUAGES = [
  { label: 'English', value: 'English' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'French', value: 'French' },
  { label: 'German', value: 'German' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Japanese', value: 'Japanese' },
  { label: 'Korean', value: 'Korean' },
  { label: 'Portuguese', value: 'Portuguese' },
  { label: 'Russian', value: 'Russian' },
  { label: 'Arabic', value: 'Arabic' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'Italian', value: 'Italian' },
  { label: 'Urdu', value: 'Urdu' },
];

// --- Components ---

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': [] },
    multiple: false,
    noClick: isProcessing,
    noKeyboard: isProcessing
  } as any);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const recordedFile = new File([audioBlob], "recording.wav", { type: 'audio/wav' });
        setFile(recordedFile);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setResult(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("targetLanguage", targetLanguage);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process audio on the server.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error("Processing error:", err);
      setError(err.message || "An error occurred while processing the audio.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-orange-500/30">
      {/* Background Atmosphere */}
      <div className="atmosphere" />

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 gradient-text">
              Linguist Audio
            </h1>
            <p className="text-white/50 text-lg md:text-xl font-light tracking-wide max-w-xl mx-auto">
              Advanced audio transcription and translation powered by Gemini.
            </p>
          </motion.div>
        </header>

        <div className="grid gap-8">
          {/* Controls Section */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="glass-card rounded-3xl p-8 md:p-12 overflow-hidden relative"
          >
            {/* Language Selection */}
            <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Languages className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Target Language</p>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="bg-transparent text-white text-lg font-medium focus:outline-none cursor-pointer hover:text-orange-400 transition-colors"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value} className="bg-[#1a1a1a]">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {file && (
                <button
                  onClick={clearAll}
                  className="text-white/40 hover:text-white text-xs uppercase tracking-widest font-semibold transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Upload Area */}
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  {...getRootProps()}
                  className={cn(
                    "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-500 py-16 px-8 text-center",
                    isDragActive ? "border-orange-500 bg-orange-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/5"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
                      <Upload className="w-12 h-12 text-white/20 group-hover:text-orange-500 transition-colors relative z-10" />
                    </div>
                    <div>
                      <p className="text-xl font-medium mb-2">Drop audio here or browse</p>
                      <p className="text-white/40 text-sm">WAV, MP3, M4A up to 20MB</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="file-ready"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-8 py-8"
                >
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 w-full max-w-md">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <FileAudio className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>

                  <button
                    onClick={processAudio}
                    disabled={isProcessing}
                    className="glow-button w-full max-w-md bg-orange-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        Transcribe & Translate
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording Button */}
            <div className="mt-12 flex justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={cn(
                  "flex items-center gap-3 px-8 py-4 rounded-full border transition-all duration-500",
                  isRecording 
                    ? "bg-red-500/10 border-red-500 text-red-500 recording-pulse" 
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                )}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5 fill-current" />
                    <span className="font-bold tracking-widest uppercase text-xs">Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span className="font-bold tracking-widest uppercase text-xs">Record Audio</span>
                  </>
                )}
              </button>
            </div>
          </motion.section>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4"
              >
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                <p className="text-red-200 text-sm leading-relaxed">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <AnimatePresence>
            {result && (
              <motion.section
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-2 gap-6"
              >
                {/* Original Transcript */}
                <div className="glass-card rounded-3xl p-8 relative group">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Original Transcript</p>
                      <p className="text-xs text-orange-500 font-medium">{result.detected_language}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.original_transcript)}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xl leading-relaxed font-serif text-white/90">
                    {result.original_transcript}
                  </p>
                </div>

                {/* Translated Transcript */}
                <div className="glass-card rounded-3xl p-8 relative group border-orange-500/20">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Translation</p>
                      <p className="text-xs text-orange-500 font-medium">{result.target_language}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.translated_transcript)}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xl leading-relaxed font-serif text-white/90">
                    {result.translated_transcript}
                  </p>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center">
          <p className="text-white/20 text-xs uppercase tracking-[0.2em] font-medium">
            Powered by Gemini 3 Flash • Full Stack Architecture
          </p>
        </footer>
      </main>
    </div>
  );
}
