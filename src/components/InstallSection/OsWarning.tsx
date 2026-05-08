import { CopyableCommand } from './CopyableCommand';
import {
  APP_NAME,
  INSTALL_MACOS_FALLBACK_COMMAND,
  INSTALL_OS_WARNING_EYEBROW,
  INSTALL_OS_WARNING_MAC_FALLBACK_LABEL,
} from '@/constants/copy';

// Restricted to the OSes for which a Tauri build exists. The PWA install
// path (mobile + desktop browser) doesn't go through OsWarning at all.
export type TauriOs = 'mac' | 'windows';

interface OsWarningProps {
  platform: TauriOs;
}

export function OsWarning({ platform }: OsWarningProps) {
  const isMac = platform === 'mac';
  return (
    <div className="flex-1 lg:max-w-md">
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-black/50">
        {INSTALL_OS_WARNING_EYEBROW}
      </p>
      <div className="space-y-4 border-l-4 border-black bg-neo-secondary/30 p-6">
        {isMac ? <MacWarning /> : <WindowsWarning />}
      </div>
    </div>
  );
}

function MacWarning() {
  return (
    <>
      <p className="text-sm font-medium text-black/80">
        macOS flags unsigned builds with{' '}
        <span className="font-bold">&ldquo;unidentified developer&rdquo;</span>. Expected for
        open-source apps. In Finder, <span className="font-bold">right-click</span> {APP_NAME} in
        Applications → <span className="font-bold">Open</span> →{' '}
        <span className="font-bold">Open</span>. macOS trusts it from then on.
      </p>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-black/60">
          {INSTALL_OS_WARNING_MAC_FALLBACK_LABEL}
        </p>
        <CopyableCommand command={INSTALL_MACOS_FALLBACK_COMMAND} />
      </div>
    </>
  );
}

function WindowsWarning() {
  return (
    <p className="text-sm font-medium text-black/80">
      Windows SmartScreen flags unsigned builds with{' '}
      <span className="font-bold">&ldquo;Windows protected your PC&rdquo;</span>. Click{' '}
      <span className="font-bold">More info</span> → <span className="font-bold">Run anyway</span>.
      The warning doesn&apos;t appear on future launches.
    </p>
  );
}
