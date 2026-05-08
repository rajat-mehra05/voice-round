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
  COMMON_GOT_IT,
  INSTALL_IOS_DESCRIPTION,
  INSTALL_IOS_FOOTER,
  INSTALL_IOS_STEP_3_NAME_HINT,
  INSTALL_IOS_TITLE,
} from '@/constants/copy';

interface IosInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// iOS A2HS instructions; SVG glyph (not screenshot) ages cleanly across iOS versions.
function ShareIconGlyph() {
  return (
    <svg
      width="20"
      height="24"
      viewBox="0 0 20 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline-block translate-y-[-1px] align-middle"
    >
      <path d="M10 16V2" />
      <path d="M5 7l5-5 5 5" />
      <path d="M3 12v8a2 2 0 002 2h10a2 2 0 002-2v-8" />
    </svg>
  );
}

export function IosInstallModal({ open, onOpenChange }: IosInstallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{INSTALL_IOS_TITLE}</DialogTitle>
          <DialogDescription>{INSTALL_IOS_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 text-sm font-medium text-black/80">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black bg-neo-secondary text-xs font-bold">
              1
            </span>
            <span>
              Tap the <ShareIconGlyph /> <strong>Share</strong> button in the Safari toolbar.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black bg-neo-secondary text-xs font-bold">
              2
            </span>
            <span>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black bg-neo-secondary text-xs font-bold">
              3
            </span>
            <span>
              {INSTALL_IOS_STEP_3_NAME_HINT} <strong>Add</strong>. The icon appears on your home
              screen.
            </span>
          </li>
        </ol>

        <p className="text-xs font-medium text-black/60">{INSTALL_IOS_FOOTER}</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {COMMON_GOT_IT}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
