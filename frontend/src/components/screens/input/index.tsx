import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ClipboardList,
  Link as LinkIcon,
  Mic,
  Square,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AutoGrowTextarea, Input } from '@/components/ui/input';
import { InlineErrorBanner, LoadingOverlay } from '@/components/ui/feedback';
import { cn } from '@/components/ui/utils';
import { useRescale } from '@/context/RescaleContext';
import {
  extractOcrFromImage,
  makeId,
  parseRecipeFull,
  SAMPLE_RECIPE_TEXT,
  scrapeRecipeUrl,
  transcribeVoiceBlob,
} from '@/lib/parser-client';
import { isUnscalableIngredient } from '@/lib/scaler';
import { InputMode } from '@/lib/types';

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

const INPUT_METHODS: Array<{
  mode: InputMode;
  title: string;
  description: string;
  emoji: string;
  icon: LucideIcon;
}> = [
  {
    mode: 'paste',
    emoji: '📋',
    title: 'Paste Text',
    description: 'Type or paste any recipe',
    icon: ClipboardList,
  },
  {
    mode: 'url',
    emoji: '🔗',
    title: 'URL Import',
    description: 'Paste a recipe blog link',
    icon: LinkIcon,
  },
  {
    mode: 'ocr',
    emoji: '📸',
    title: 'Photo / OCR',
    description: 'Snap a dish photo or recipe page',
    icon: Camera,
  },
  {
    mode: 'voice',
    emoji: '🎙️',
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
  } = useRescale();

  const [urlValue, setUrlValue] = useState('');
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

      // Parse ingredients through NLP parser for clean structured review right away
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

  const handleProcessImage = async (file: File) => {
    setLastFile(file);
    setErrorMsg(null);
    setLoadingMsg('Analyzing image & preparing recipe...');
    try {
      const text = await extractOcrFromImage(file);
      setRawInputText(text);
      setLoadingMsg(null);
    } catch {
      setLoadingMsg(null);
      setErrorMsg("Image wasn't clear enough. Try a clearer photo or paste the text.");
    }
  };

  const startVoiceRecording = async () => {
    setErrorMsg(null);
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      const baseText = rawInputText ? `${rawInputText.trim()}\n` : '';

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript;
        }
        setRawInputText(`${baseText}${combined}`.trim());
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
      return;
    }

    // Backend Whisper fallback via MediaRecorder -> POST /voice
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        'Voice recording is not supported in this browser. Try pasting your recipe text instead.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setLoadingMsg('Listening...');
        try {
          const transcript = await transcribeVoiceBlob(audioBlob);
          setRawInputText(
            rawInputText ? `${rawInputText.trim()}\n${transcript}` : transcript
          );
          setLoadingMsg(null);
        } catch {
          setLoadingMsg(null);
          setErrorMsg(
            "Couldn't transcribe audio right now. Try typing or pasting your recipe instead."
          );
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setErrorMsg(
        'Microphone access was blocked. Allow microphone permission or paste your recipe manually.'
      );
    }
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                'group text-left rounded-lg border p-5 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md cursor-pointer',
                active
                  ? 'border-accent bg-accent-soft/45 shadow-sm'
                  : 'border-border bg-surface hover:border-accent/50'
              )}
            >
              <div
                className={cn(
                  'mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                  active
                    ? 'bg-accent text-white'
                    : 'bg-surface-raised text-accent group-hover:bg-accent-soft'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="font-sans text-[16px] font-semibold text-text-primary">
                {method.title}
              </div>
              <p className="mt-0.5 text-[14px] text-text-secondary">
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
                Snap a cooked dish, cookbook page, or screenshot
              </p>
              <p className="mt-1 text-[13px] text-text-secondary">
                Extracts printed/handwritten recipes OR generates the full recipe from any food photo
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void handleProcessImage(f);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void handleProcessImage(f);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" strokeWidth={1.5} />
                  <span>Choose Image</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" strokeWidth={1.5} />
                  <span>Open Camera</span>
                </Button>
              </div>
            </div>

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
                aria-label={isRecording ? 'Stop recording' : 'Start voice dictation'}
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-full transition-all cursor-pointer shadow-accent',
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
                  ? 'Listening — speak your ingredients and steps aloud...'
                  : 'Tap the microphone to dictate your recipe'}
              </p>

              {isRecording && (
                <div className="mt-4 flex items-center justify-center gap-1.5 h-9">
                  {[35, 70, 50, 95, 60, 85, 40, 75, 55, 45].map((height, idx) => (
                    <motion.span
                      key={idx}
                      animate={{ height: ['22%', `${height}%`, '28%'] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        delay: idx * 0.07,
                        ease: 'easeInOut',
                      }}
                      className="w-1.5 rounded-full bg-accent inline-block"
                    />
                  ))}
                </div>
              )}
            </div>

            <AutoGrowTextarea
              placeholder="Your spoken transcript appears here in real time..."
              value={rawInputText}
              onChange={(e) => setRawInputText(e.target.value)}
            />
          </div>
        )}

        {errorMsg && (
          <InlineErrorBanner
            message={errorMsg}
            onRetry={() => {
              if (inputMode === 'url' && urlValue.trim()) {
                void handleFetchUrl();
              } else if (inputMode === 'ocr' && lastFile) {
                void handleProcessImage(lastFile);
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
            disabled={!rawInputText.trim() || Boolean(loadingMsg)}
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
