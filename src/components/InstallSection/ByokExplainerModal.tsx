import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  BYOK_DESKTOP_BODY,
  BYOK_DESKTOP_HEADING,
  BYOK_FOOTER_NOTE,
  BYOK_MODAL_DESCRIPTION,
  BYOK_MODAL_TITLE,
  BYOK_WEB_BODY,
  BYOK_WEB_HEADING,
  BYOK_WEB_RISK_EXTENSIONS,
  BYOK_WEB_RISK_XSS,
  COMMON_GOT_IT,
} from '@/constants/copy';

interface ByokExplainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// BYOK Tauri-vs-PWA tradeoff; opened from desktop secondary CTA + Settings.
export function ByokExplainerModal({ open, onOpenChange }: ByokExplainerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{BYOK_MODAL_TITLE}</DialogTitle>
          <DialogDescription>{BYOK_MODAL_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm font-medium text-black/80">
          <div className="border-2 border-black bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-black/60">
              {BYOK_DESKTOP_HEADING}
            </p>
            <p className="mt-1">{BYOK_DESKTOP_BODY}</p>
          </div>

          <div className="border-2 border-black bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-black/60">
              {BYOK_WEB_HEADING}
            </p>
            <p className="mt-1">{BYOK_WEB_BODY}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              <li>{BYOK_WEB_RISK_XSS}</li>
              <li>{BYOK_WEB_RISK_EXTENSIONS}</li>
            </ul>
          </div>

          <p className="text-xs text-black/60">{BYOK_FOOTER_NOTE}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {COMMON_GOT_IT}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
