'use client';

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  DragEvent,
  ChangeEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CornerDownLeft,
  Loader2,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Mic,
  MicOff,
  UploadCloud,
} from 'lucide-react';
import { uploadAndExtractAction, type UploadActionResult } from '../actions';
import { toast } from 'sonner';
import { useSpeech } from '@/hooks/use-speech';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  extractedText: string;
}

interface ChatInputProps {
  isLoading: boolean;
  onSend: (prompt: string) => void;
}

const MAX_HEIGHT = 200;

export function ChatInput({ isLoading, onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; pct: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleSpeechResult = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setInterimText('');
    } else {
      setInterimText(transcript);
    }
  }, []);

  const handleSpeechError = useCallback((err: string) => toast.error(err), []);

  const { isListening, isSupported, toggleListening } = useSpeech({
    onResult: handleSpeechResult,
    onError: handleSpeechError,
  });

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text, interimText]);

  const displayValue = isListening && interimText ? `${text} ${interimText}` : text;

  const submitMessage = useCallback(() => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isLoading || isUploading) return;

    if (isListening) toggleListening();

    let finalPrompt = trimmed;
    for (const att of attachments) {
      if (att.extractedText) {
        finalPrompt += `\n\n<document title="${att.name}">\n${att.extractedText}\n</document>`;
      } else if (att.type.startsWith('image/')) {
        finalPrompt += `\n\n[Attached Image: ${att.name} - ${att.url}]`;
      }
    }

    onSend(finalPrompt);
    setText('');
    setInterimText('');
    setAttachments([]);
  }, [text, attachments, isLoading, isUploading, isListening, toggleListening, onSend]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitMessage();
      }
    },
    [submitMessage],
  );

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      if (isListening && interimText) setInterimText('');
    },
    [isListening, interimText],
  );

  const processFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the 10MB limit.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress({ name: file.name, pct: 0 });

    // Animated progress while server processes
    let pct = 5;
    const tick = setInterval(() => {
      pct = Math.min(pct + Math.random() * 18, 88);
      setUploadProgress({ name: file.name, pct });
    }, 220);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result: UploadActionResult = await uploadAndExtractAction(formData);
      clearInterval(tick);

      if ('error' in result) {
        toast.error(result.error);
        setUploadProgress(null);
        return;
      }
      setUploadProgress({ name: file.name, pct: 100 });
      toast.success(`"${file.name}" ready`);

      setAttachments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: result.filename,
          type: result.type,
          size: file.size,
          url: result.url,
          extractedText: result.extractedText,
        },
      ]);
    } catch (err) {
      clearInterval(tick);
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setTimeout(() => setUploadProgress(null), 400);
      setIsUploading(false);
    }
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      for (const file of files) {
        await processFile(file);
      }
    },
    [processFile],
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      for (const file of files) await processFile(file);
    },
    [processFile],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const openFilePicker = useCallback(() => {
    if (isUploading) return;
    fileInputRef.current?.click();
  }, [isUploading]);

  const canSubmit =
    (text.trim().length > 0 || attachments.length > 0) && !isLoading && !isUploading;

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="p-3 sm:p-4 bg-background/95 backdrop-blur-md border-t border-border w-full relative z-20"
    >
      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 flex items-center justify-center z-30"
        >
          <div className="flex flex-col items-center gap-1.5 text-primary">
            <UploadCloud className="h-6 w-6" />
            <span className="text-sm font-medium">Drop files to attach</span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1" role="list" aria-label="Attached files">
            {attachments.map((att) => (
              <div
                key={att.id}
                role="listitem"
                className="group flex items-center gap-1.5 bg-card border border-border rounded-lg pl-2.5 pr-1 py-1.5 text-xs text-foreground max-w-full"
              >
                {att.type.startsWith('image/') ? (
                  <ImageIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-blue-500 dark:text-blue-300 flex-shrink-0" aria-hidden />
                )}
                <div className="flex flex-col min-w-0 max-w-[160px]">
                  <span className="truncate font-medium">{att.name}</span>
                  <span className="truncate text-[10px] text-muted-foreground">{formatSize(att.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`Remove ${att.name}`}
                  className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {uploadProgress && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
            <span className="truncate flex-1">Uploading {uploadProgress.name}…</span>
            <span className="tabular-nums">{Math.round(uploadProgress.pct)}%</span>
          </div>
        )}

        <div className="relative flex items-end w-full rounded-xl bg-card border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            multiple
            accept=".pdf,.docx,.txt,.md,.markdown,image/jpeg,image/png,image/gif,image/webp"
            aria-label="Attach files"
          />

          <div className="flex-shrink-0 p-1.5 sm:p-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={isUploading}
              onClick={openFilePicker}
              aria-label="Attach file"
              title="Attach file (or drag and drop)"
              className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            tabIndex={0}
            rows={1}
            value={displayValue}
            onChange={handleTextChange}
            onKeyDown={onKeyDown}
            placeholder={
              isListening
                ? 'Listening…'
                : attachments.length > 0
                ? 'Add a message (optional)…'
                : 'Message Spread AI…'
            }
            aria-label="Message input"
            className={cn(
              'flex-1 min-w-0 !h-auto !min-h-0 resize-none bg-transparent !border-0 !shadow-none !ring-0 text-sm px-1 py-3 placeholder:text-muted-foreground focus-visible:!ring-0',
              isListening ? 'text-primary' : 'text-foreground',
            )}
            style={{ height: '44px', maxHeight: `${MAX_HEIGHT}px` }}
            spellCheck={false}
          />

          <div className="flex items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 flex-shrink-0">
            {isSupported && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={toggleListening}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={isListening}
                className={cn(
                  'h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-colors',
                  isListening
                    ? 'bg-destructive/15 text-destructive hover:bg-destructive/25 animate-pulse'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
            )}

            <Button
              type="button"
              size="icon"
              onClick={submitMessage}
              disabled={!canSubmit}
              aria-label="Send message"
              className="h-8 w-8 sm:h-9 sm:w-9 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/80 mt-0.5">
          Spread AI may make mistakes. Verify important decisions independently.
        </p>
      </div>
    </div>
  );
}
