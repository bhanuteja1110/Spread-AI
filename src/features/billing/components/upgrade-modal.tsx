'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, CheckCircle2 } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#080b12] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <Zap className="h-7 w-7 text-purple-400" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold tracking-tight">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-center text-gray-400 text-sm mt-2">
            You&apos;ve reached your free daily limit of 50 messages. Upgrade to unlock unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 space-y-4 px-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-medium text-gray-200">Unlimited daily messages</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-medium text-gray-200">Priority NVIDIA Vision processing</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-medium text-gray-200">100MB Deep Analysis Documents</span>
          </div>
        </div>

        <DialogFooter className="sm:justify-stretch flex-col gap-2">
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors shadow-lg">
            Upgrade for $20/month
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-gray-400 hover:text-white transition-colors">
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
