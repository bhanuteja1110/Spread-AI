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
      <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground shadow-2xl">
        <DialogHeader>
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold tracking-tight">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm mt-2">
            You&apos;ve reached your free daily limit of 50 messages. Upgrade to unlock unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 space-y-4 px-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Unlimited daily messages</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Priority NVIDIA Vision processing</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">100MB Deep Analysis Documents</span>
          </div>
        </div>

        <DialogFooter className="sm:justify-stretch flex-col gap-2">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors">
            Upgrade for $20/month
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground hover:text-foreground transition-colors">
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
