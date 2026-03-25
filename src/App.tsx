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
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Languages className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Linguist</h1>
          </div>
          <div className="flex items-center gap-4">
            {(file || result) && (
              <button 
                onClick={clearAll}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                Clear All
              </button>
            )}
            <select 
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-8">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Input Source</h2>
              <div className="space-y-4">
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4",
                    isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white",
                    file && "border-green-500 bg-green-50"
                  )}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <>
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="text-green-600 w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Upload className="text-gray-400 w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Drop audio here or click to browse</p>
                        <p className="text-xs text-gray-500 mt-1">Supports MP3, WAV, M4A, etc.</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400 uppercase">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold transition-all shadow-sm",
                    isRecording 
                      ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" 
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-5 h-5 fill-current" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Record Audio
                    </>
                  )}
                </button>
              </div>
            </section>

            <button
              onClick={processAudio}
              disabled={!file || isProcessing}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2",
                !file || isProcessing 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Transcribe & Translate"
              )}
            </button>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 items-start"
              >
                <AlertCircle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Original Transcript</h2>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                          {result.detected_language}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(result.original_transcript)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[120px]">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {result.original_transcript}
                      </p>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Translated Transcript</h2>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-50 rounded text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                          {result.target_language}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(result.translated_transcript)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm min-h-[120px] ring-1 ring-blue-50">
                      <p className="text-gray-900 leading-relaxed font-medium whitespace-pre-wrap">
                        {result.translated_transcript}
                      </p>
                    </div>
                  </section>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center p-12"
                >
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                    <FileAudio className="text-gray-300 w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to process</h3>
                  <p className="text-gray-500 max-w-xs">
                    Upload an audio file or record your voice to see the transcription and translation here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Powered by Gemini 3 Flash • High Accuracy Transcription
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-medium text-gray-400 hover:text-gray-600">Privacy Policy</a>
            <a href="#" className="text-xs font-medium text-gray-400 hover:text-gray-600">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
