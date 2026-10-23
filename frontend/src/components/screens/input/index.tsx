import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ClipboardList,
  Link as LinkIcon,
  Mic,
  Plus,
  Square,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AutoGrowTextarea, Input } from '@/components/ui/input';
import { InlineErrorBanner, LoadingOverlay } from '@/components/ui/feedback';
import { cn } from '@/components/ui/utils';
import { useRescale } from '@/context/RescaleContext';
import {
  extractOcrFromImages,
  makeId,
  parseRecipeFull,
  SAMPLE_RECIPE_TEXT,
  scrapeRecipeUrl,
  transcribeVoiceBlob,
} from '@/lib/parser-client';
import { isUnscalableIngredient } from '@/lib/scaler';
import { InputMode } from '@/lib/types';

const MAX_OCR_IMAGES = 5;

interface SelectedImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

/**
 * Android Chrome's SpeechRecognition engine emits cumulative transcripts across
 * results[] (e.g. ["noodles", "noodles and", "noodles and egg"]). Deduplicate
 * overlapping cumulative segments cleanly so words never double up.
 */
function dedupeSpeechResults(results: SpeechRecognitionEventLike['results']): string {
  const segments: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const piece = (results[i][0]?.transcript || '').trim();
    if (!piece) continue;
    const prev = segments[segments.length - 1];
    if (prev) {
      const prevLow = prev.toLowerCase();
      const pieceLow = piece.toLowerCase();
      if (pieceLow === prevLow) {
        continue;
      }
      if (pieceLow.startsWith(prevLow)) {
        segments[segments.length - 1] = piece;
        continue;
      }
      if (prevLow.startsWith(pieceLow)) {
        continue;
      }
    }
    segments.push(piece);
  }
  return segments.join(' ').replace(/\s+/g, ' ').trim();
}

function getBestAudioRecorderMime(): { mimeType: string; filename: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: '', filename: 'recording.webm' };
  }
  const candidates: Array<{ mimeType: string; filename: string }> = [
    { mimeType: 'audio/webm;codecs=opus', filename: 'recording.webm' },
    { mimeType: 'audio/webm', filename: 'recording.webm' },
    { mimeType: 'audio/mp4', filename: 'recording.m4a' },
    { mimeType: 'audio/ogg;codecs=opus', filename: 'recording.ogg' },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', filename: 'recording.webm' };
}

const INPUT_METHODS: Array<{
  mode: InputMode;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    mode: 'paste',
    title: 'Paste Text',
    description: 'Type or paste any recipe',
    icon: ClipboardList,
  },
  {
    mode: 'url',
    title: 'URL Import',
    description: 'Paste a recipe blog link',
    icon: LinkIcon,
  },
  {
    mode: 'ocr',
    title: 'Photo / OCR',
    description: 'Select up to 5 dish or recipe photos',
    icon: Camera,
  },
  {
    mode: 'voice',
    title: 'Voice Input',
    description: 'Speak your recipe aloud',
    icon: Mic,
  },
];

export function InputScreen() {
  const navigate = useNavigate();
  const {
    rawInputText,
    setRawInputText,
    inputMode,
    setInputMode,
    setReviewDraft,
    pushToast,
  } = useRescale();

  const [urlValue, setUrlValue] = useState('');
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedImageItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([
    22, 28, 24, 32, 26, 30, 22, 28, 25, 22,
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup object URLs & active audio streams on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  const formatRecordClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleFetchUrl = async () => {
    if (!urlValue.trim()) return;
    setErrorMsg(null);
    setLoadingMsg('Fetching your recipe...');
    try {
      const scraped = await scrapeRecipeUrl(urlValue.trim());
      const formattedText = [
        scraped.title,
        `Serves ${scraped.servings || 4}`,
        '',
        'Ingredients:',
        ...(scraped.ingredients || []),
        '',
        'Instructions:',
        ...(scraped.instructions || []).map((s, idx) => `${idx + 1}. ${s}`),
      ].join('\n');

      setRawInputText(formattedText);

      const parsed = await parseRecipeFull(formattedText);
      setReviewDraft({
        title: scraped.title || parsed.title,
        servings: scraped.servings || parsed.servings,
        ingredients: parsed.ingredients.length
          ? parsed.ingredients
          : (scraped.ingredients || []).map((line) => ({
              id: makeId(),
              raw: line,
              quantity: null,
              unit: '',
              ingredient: line,
              preparation: '',
              unscalable: isUnscalableIngredient(null, '', line, ''),
            })),
        steps: scraped.instructions?.length ? scraped.instructions : parsed.steps,
        rawText: formattedText,
      });
      setLoadingMsg(null);
      navigate('/app/review');
    } catch {
      setLoadingMsg(null);
      setErrorMsg("We couldn't read that URL. Try copying the recipe text instead.");
    }
  };

  const runMultiImageScan = async (items: SelectedImageItem[]) => {
    if (items.length === 0) return;
    setErrorMsg(null);
    setLoadingMsg(
      items.length === 1
        ? 'Analyzing image & preparing recipe...'
        : `Analyzing ${items.length} images & combining recipe...`
    );
    try {
      const text = await extractOcrFromImages(items.map((item) => item.file));
      setRawInputText(text);
      setLoadingMsg(null);
    } catch {
      setLoadingMsg(null);
      setErrorMsg("Image wasn't clear enough. Try clearer photos or paste the text.");
    }
  };

  const handleSelectImages = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const remainingSlots = MAX_OCR_IMAGES - selectedImages.length;

    if (remainingSlots <= 0) {
      pushToast(`Maximum ${MAX_OCR_IMAGES} images allowed. Remove one to add another.`);
      return;
    }

    let acceptedFiles = incoming;
    if (incoming.length > remainingSlots) {
      acceptedFiles = incoming.slice(0, remainingSlots);
      pushToast(`Maximum ${MAX_OCR_IMAGES} images allowed — added ${acceptedFiles.length}.`);
    }

    const newItems: SelectedImageItem[] = acceptedFiles.map((file) => ({
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    const nextList = [...selectedImages, ...newItems];
    setSelectedImages(nextList);
    void runMultiImageScan(nextList);
  };

  const handleRemoveImage = (id: string) => {
    const target = selectedImages.find((item) => item.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);

    const remaining = selectedImages.filter((item) => item.id !== id);
    setSelectedImages(remaining);
    if (remaining.length === 0) {
      setRawInputText('');
      setErrorMsg(null);
    } else {
      void runMultiImageScan(remaining);
    }
  };

  const handleClearAllImages = () => {
    selectedImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedImages([]);
    setRawInputText('');
    setErrorMsg(null);
  };

  const stopAudioMeterAndTimers = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setAudioLevels([22, 28, 24, 32, 26, 30, 22, 28, 25, 22]);
  };

  const startLiveAudioMeter = (stream: MediaStream) => {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        const now = performance.now() / 160;
        const bars = Array.from({ length: 10 }, (_, idx) => {
          const val = dataArray[idx + 1] ?? 0;
          const idleWave = 24 + Math.sin(now + idx * 0.7) * 9;
          const voiceBoost = (val / 255) * 92;
          return Math.min(100, Math.max(18, Math.round(Math.max(idleWave, voiceBoost + 18))));
        });
        setAudioLevels(bars);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      animFrameRef.current = requestAnimationFrame(updateMeter);
    } catch {
      // Ignore meter visualization error gracefully
    }
  };

  const startOfflineSpeechFallback = (baseText: string) => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setErrorMsg(
        'Voice recording is not supported in this browser. Try pasting your recipe text instead.'
      );
      return;
    }

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const cleanTranscript = dedupeSpeechResults(event.results);
      setRawInputText(
        baseText ? `${baseText}\n${cleanTranscript}`.trim() : cleanTranscript
      );
    };
    recognition.onerror = () => {
      setIsRecording(false);
      setErrorMsg(
        'Microphone permission was denied or unavailable. Try pasting the recipe text instead.'
      );
    };
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  const startVoiceRecording = async () => {
    setErrorMsg(null);
    const existingBase = rawInputText.trim();

    // Primary high-accuracy engine across mobile & desktop:
    // Noise-suppressed MediaRecorder -> Groq Whisper Large V3 Turbo (/voice)
    // Eliminates mobile Chrome duplicate-word bugs AND listens continuously across natural pauses!
    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        audioStreamRef.current = stream;

        const { mimeType, filename } = getBestAudioRecorderMime();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        chunksRef.current = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            chunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = async () => {
          stopAudioMeterAndTimers();
          const recordedBlob = new Blob(chunksRef.current, {
            type: recorder.mimeType || mimeType || 'audio/webm',
          });
          if (recordedBlob.size < 300) {
            setErrorMsg(
              "Didn't catch any audio. Tap the mic, speak clearly, then tap stop when done."
            );
            return;
          }

          setLoadingMsg('Transcribing your voice...');
          try {
            const transcript = (await transcribeVoiceBlob(recordedBlob, filename)).trim();
            setLoadingMsg(null);
            if (!transcript) {
              setErrorMsg(
                "Couldn't detect clear speech. Try speaking a bit closer to your microphone."
              );
              return;
            }
            setRawInputText(
              existingBase ? `${existingBase}\n${transcript}` : transcript
            );
          } catch {
            setLoadingMsg(null);
            setErrorMsg(
              "Couldn't transcribe audio right now. Check connection or type your recipe below."
            );
          }
        };

        mediaRecorderRef.current = recorder;
        setRecordSeconds(0);
        recordTimerRef.current = window.setInterval(() => {
          setRecordSeconds((prev) => prev + 1);
        }, 1000);
        startLiveAudioMeter(stream);

        recorder.start(250);
        setIsRecording(true);
        return;
      } catch {
        setErrorMsg(
          'Microphone access was blocked. Allow microphone permission in your browser settings.'
        );
        return;
      }
    }

    startOfflineSpeechFallback(existingBase);
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } else {
      stopAudioMeterAndTimers();
    }
  };

  const handleParseRecipe = async () => {
    if (!rawInputText.trim()) return;
    setErrorMsg(null);
    setLoadingMsg('Reading your recipe...');
    try {
      const parsed = await parseRecipeFull(rawInputText);
      setReviewDraft({
        title: parsed.title,
        servings: parsed.servings,
        ingredients: parsed.ingredients,
        steps: parsed.steps,
        rawText: rawInputText,
      });
      setLoadingMsg(null);
      navigate('/app/review');
    } catch {
      setLoadingMsg(null);
      setErrorMsg('Having trouble with this format. Try editing the text manually.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative"
    >
      <div className="mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Back</span>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="font-sans text-[24px] font-semibold leading-[1.3] text-text-primary">
          Add a Recipe
        </h1>
        <p className="mt-1 text-[16px] text-text-secondary">
          How would you like to start?
        </p>
      </div>

      {/* 2x2 Input Method Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {INPUT_METHODS.map((method) => {
          const Icon = method.icon;
          const active = inputMode === method.mode;
          return (
            <button
              key={method.mode}
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setInputMode(method.mode);
              }}
              className={cn(
                'group text-left rounded-lg border p-3.5 sm:p-5 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md cursor-pointer',
                active
                  ? 'border-accent bg-accent-soft/45 shadow-sm'
                  : 'border-border bg-surface hover:border-accent/50'
              )}
            >
              <div
                className={cn(
                  'mb-2.5 sm:mb-3 inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-md transition-colors',
                  active
                    ? 'bg-accent text-white'
                    : 'bg-surface-raised text-accent group-hover:bg-accent-soft'
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
              </div>
              <div className="font-sans text-[14px] sm:text-[16px] font-semibold text-text-primary leading-snug">
                {method.title}
              </div>
              <p className="mt-0.5 text-[12px] sm:text-[14px] text-text-secondary leading-snug">
                {method.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Mode Workspace Card */}
      <Card className="relative p-5 sm:p-6">
        {loadingMsg && <LoadingOverlay message={loadingMsg} />}

        {inputMode === 'paste' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="recipe-paste-textarea"
                className="text-[14px] font-medium text-text-secondary"
              >
                Recipe Text
              </label>
              <button
                type="button"
                onClick={() => setRawInputText(SAMPLE_RECIPE_TEXT)}
                className="text-[13px] font-medium text-accent hover:underline cursor-pointer"
              >
                Try sample cookie recipe
              </button>
            </div>
            <AutoGrowTextarea
              id="recipe-paste-textarea"
              placeholder="Paste your recipe here..."
              value={rawInputText}
              onChange={(e) => setRawInputText(e.target.value)}
            />
          </div>
        )}

        {inputMode === 'url' && (
          <div className="space-y-4">
            <label
              htmlFor="recipe-url-input"
              className="block text-[14px] font-medium text-text-secondary"
            >
              Recipe Blog or Website URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                id="recipe-url-input"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="https://www.thekitchn.com/french-apple-cake-22943649"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleFetchUrl();
                }}
              />
              <Button
                type="button"
                onClick={handleFetchUrl}
                disabled={!urlValue.trim() || Boolean(loadingMsg)}
                className="shrink-0"
              >
                Fetch Recipe
              </Button>
            </div>
            {rawInputText && (
              <div className="pt-2">
                <p className="mb-2 text-[13px] text-text-muted">
                  Imported recipe preview (editable):
                </p>
                <AutoGrowTextarea
                  value={rawInputText}
                  onChange={(e) => setRawInputText(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {inputMode === 'ocr' && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border bg-surface-raised/60 p-6 text-center">
              <Camera
                className="mx-auto h-9 w-9 text-accent mb-2.5"
                strokeWidth={1.5}
              />
              <p className="text-[15px] font-medium text-text-primary">
                Snap a cooked dish, cookbook pages, or screenshots
              </p>
              <p className="mt-1 text-[13px] text-text-secondary">
                Select up to {MAX_OCR_IMAGES} images — extracts multi-page text OR builds the full recipe from food photos
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  handleSelectImages(files);
                  e.target.value = '';
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  handleSelectImages(files);
                  e.target.value = '';
                }}
              />

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={selectedImages.length >= MAX_OCR_IMAGES || Boolean(loadingMsg)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedImages.length > 0 ? (
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  <span>
                    {selectedImages.length > 0
                      ? `Add Images (${selectedImages.length}/${MAX_OCR_IMAGES})`
                      : 'Choose Images'}
                  </span>
                </Button>
                <Button
                  type="button"
                  disabled={selectedImages.length >= MAX_OCR_IMAGES || Boolean(loadingMsg)}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" strokeWidth={1.5} />
                  <span>Open Camera</span>
                </Button>
              </div>
            </div>

            {/* Selected Images Preview Strip (1 to 5 images max) */}
            {selectedImages.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-medium text-text-secondary">
                    Selected Photos ({selectedImages.length}/{MAX_OCR_IMAGES})
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllImages}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted hover:text-accent cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Clear all</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {selectedImages.map((img, index) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-md border border-border bg-surface-raised"
                    >
                      <img
                        src={img.previewUrl}
                        alt={`Selected recipe photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        aria-label={`Remove image ${index + 1}`}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rawInputText && (
              <div>
                <p className="mb-2 text-[13px] font-medium text-text-secondary">
                  Detected Recipe (edit before parsing if needed):
                </p>
                <AutoGrowTextarea
                  value={rawInputText}
                  onChange={(e) => setRawInputText(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {inputMode === 'voice' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface-raised/60 p-6 text-center">
              <button
                type="button"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={Boolean(loadingMsg)}
                aria-label={isRecording ? 'Stop recording' : 'Start voice dictation'}
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-full transition-all cursor-pointer shadow-accent disabled:opacity-50',
                  isRecording
                    ? 'bg-red-600 text-white scale-105'
                    : 'bg-accent text-white hover:bg-accent-hover hover:-translate-y-[1px]'
                )}
              >
                {isRecording ? (
                  <Square className="h-7 w-7 fill-current" strokeWidth={1.5} />
                ) : (
                  <Mic className="h-8 w-8" strokeWidth={1.5} />
                )}
              </button>

              <p className="mt-3 text-[15px] font-medium text-text-primary">
                {isRecording
                  ? `Listening (${formatRecordClock(recordSeconds)}) — tap stop when finished`
                  : 'Tap the microphone to dictate your recipe or dish'}
              </p>
              <p className="mt-1 text-[13px] text-text-secondary">
                {isRecording
                  ? 'Speak naturally at your own pace — pauses will not cut off your recording'
                  : 'Speak full ingredients & steps, or just name the dish you want to cook'}
              </p>

              {isRecording && (
                <div className="mt-4 flex items-end justify-center gap-1.5 h-[40px]">
                  {audioLevels.map((level, idx) => (
                    <span
                      key={idx}
                      style={{ height: `${Math.round((level / 100) * 38)}px` }}
                      className="w-1.5 rounded-full bg-accent transition-[height] duration-75 ease-out inline-block"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {rawInputText && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-text-secondary">
                    Voice Transcript (editable):
                  </span>
                  <button
                    type="button"
                    onClick={() => setRawInputText('')}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted hover:text-accent cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Clear</span>
                  </button>
                </div>
              )}
              <AutoGrowTextarea
                placeholder="Your spoken words appear here cleanly once you tap stop..."
                value={rawInputText}
                onChange={(e) => setRawInputText(e.target.value)}
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <InlineErrorBanner
            message={errorMsg}
            onRetry={() => {
              if (inputMode === 'url' && urlValue.trim()) {
                void handleFetchUrl();
              } else if (inputMode === 'ocr' && selectedImages.length > 0) {
                void runMultiImageScan(selectedImages);
              } else {
                setErrorMsg(null);
              }
            }}
            onEnterManually={() => {
              setErrorMsg(null);
              setInputMode('paste');
            }}
          />
        )}

        {/* Primary Parse CTA Below All Modes */}
        <div className="mt-6 flex items-center justify-end border-t border-border pt-5">
          <Button
            type="button"
            size="lg"
            disabled={!rawInputText.trim() || Boolean(loadingMsg) || isRecording}
            onClick={handleParseRecipe}
            className="w-full sm:w-auto"
          >
            <span>Parse Recipe</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
