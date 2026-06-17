'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CornerDownLeft, Loader2, Paperclip, X, FileText, Image as ImageIcon, Mic, MicOff } from 'lucide-react';
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

  // Auto-resize textarea to content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
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

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  }, [submitMessage]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Clear interim transcript when user manually types
    if (isListening && interimText) setInterimText('');
  }, [isListening, interimText]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
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

  const canSubmit = (text.trim().length > 0 || attachments.length > 0) && !isLoading && !isUploading;

  return (
    <div className="p-3 sm:p-4 bg-background/80 backdrop-blur-2xl border-t border-white/10 w-full relative z-20">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">

        {/* Attachment Pills */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 pb-1" role="list" aria-label="Attached files">
            {attachments.map((att) => (
              <div
                key={att.id}
                role="listitem"
                className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full pl-3 pr-1 py-1 text-xs text-gray-200 shadow-sm"
              >
                {att.type.startsWith('image/') ? (
                  <ImageIcon className="h-3 w-3 text-purple-400" aria-hidden />
                ) : (
                  <FileText className="h-3 w-3 text-blue-400" aria-hidden />
                )}
                <span className="max-w-[140px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`Remove ${att.name}`}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end w-full rounded-xl bg-white/5 border border-white/10 overflow-hidden focus-within:ring-1 focus-within:ring-purple-500/40 transition-all shadow-lg">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt,image/*"
            aria-label="Attach a file"
          />

          {/* Attach button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label={isUploading ? 'Uploading file...' : 'Attach file'}
            className="absolute left-2 bottom-2 h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg z-10 transition-colors flex-shrink-0"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          {/* Message Input */}
          <Textarea
            ref={textareaRef}
            tabIndex={0}
            rows={1}
            value={displayValue}
            onChange={handleTextChange}
            onKeyDown={onKeyDown}
            placeholder={isListening ? 'Listening...' : 'Message Spread AI...'}
            aria-label="Message input"
            className={`min-h-[52px] w-full resize-none bg-transparent pl-12 pr-24 py-3.5 focus-visible:ring-0 border-0 text-sm placeholder:text-gray-500 transition-colors ${
              isListening ? 'text-purple-300' : 'text-white'
            }`}
            spellCheck={false}
          />

          {/* Voice button */}
          {isSupported && (
            <div className="absolute right-12 bottom-2 z-10">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={toggleListening}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={isListening}
                className={`h-9 w-9 transition-all rounded-lg ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 animate-pulse'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Send button */}
          <div className="absolute right-2 bottom-2 z-10">
            <Button
              type="button"
              size="icon"
              onClick={submitMessage}
              disabled={!canSubmit}
              aria-label="Send message"
              className="h-9 w-9 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-1">
          Spread AI may make mistakes. Verify important decisions independently.
        </p>
      </div>
    </div>
  );
}
