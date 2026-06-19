'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { uploadAndExtractAction, type UploadActionResult } from '../actions';
import { toast } from 'sonner';
import { useSpeech } from '@/hooks/use-speech';

interface Attachment {
  id: string;
  name: string;
  type: string;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      if (isListening && interimText) setInterimText('');
    },
    [isListening, interimText],
  );

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds the 10MB limit.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const result: UploadActionResult = await uploadAndExtractAction(formData);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success(`"${file.name}" uploaded successfully.`);
      setAttachments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: result.filename,
          type: result.type,
          url: result.url,
          extractedText: result.extractedText,
        },
      ]);
    }

    setIsUploading(false);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const canSubmit =
    (text.trim().length > 0 || attachments.length > 0) && !isLoading && !isUploading;

  return (
    <div className="p-3 sm:p-4 bg-background/95 backdrop-blur-md border-t border-white/10 w-full relative z-20">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1" role="list" aria-label="Attached files">
            {attachments.map((att) => (
              <div
                key={att.id}
                role="listitem"
                className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full pl-2.5 pr-1 py-1 text-xs text-gray-200 max-w-full"
              >
                {att.type.startsWith('image/') ? (
                  <ImageIcon className="h-3 w-3 text-purple-300 flex-shrink-0" aria-hidden />
                ) : (
                  <FileText className="h-3 w-3 text-blue-300 flex-shrink-0" aria-hidden />
                )}
                <span className="max-w-[120px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`Remove ${att.name}`}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end w-full rounded-xl bg-white/5 border border-white/10 focus-within:border-purple-500/40 focus-within:ring-2 focus-within:ring-purple-500/15 transition-all">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt,image/*"
            aria-label="Attach a file"
          />

          {/* Attach button — sits at bottom-left, not absolute to avoid width issues */}
          <div className="flex-shrink-0 p-1.5 sm:p-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              aria-label={isUploading ? 'Uploading file...' : 'Attach file'}
              className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
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
            placeholder={isListening ? 'Listening...' : 'Message Spread AI…'}
            aria-label="Message input"
            className={`flex-1 min-w-0 !h-auto !min-h-0 resize-none bg-transparent !border-0 !shadow-none !ring-0 text-sm px-1 py-3 placeholder:text-gray-500 focus-visible:!ring-0 ${
              isListening ? 'text-purple-200' : 'text-white'
            }`}
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
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25 animate-pulse'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {isListening ? (
                  <Mic className="h-4 w-4" aria-hidden />
                ) : (
                  <MicOff className="h-4 w-4" aria-hidden />
                )}
              </Button>
            )}

            <Button
              type="button"
              size="icon"
              onClick={submitMessage}
              disabled={!canSubmit}
              aria-label="Send message"
              className="h-8 w-8 sm:h-9 sm:w-9 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-0.5">
          Spread AI may make mistakes. Verify important decisions independently.
        </p>
      </div>
    </div>
  );
}
