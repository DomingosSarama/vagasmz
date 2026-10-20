import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] hover:border-[var(--accent-green)] transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-1.5 text-xs font-medium min-h-[40px]' : 'px-4 py-2 text-sm font-medium min-h-[44px]'
        }`}
      >
        <Download className="w-4 h-4 text-[var(--accent-green)]" />
        <span>Instalar App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-1.5 text-xs font-medium min-h-[40px]' : 'px-4 py-2 text-sm font-medium min-h-[44px]'
        }`}
      >
        <Smartphone className="w-4 h-4 text-[var(--accent-green)]" />
        <span>{isIOS ? 'Instalar no iPhone' : 'Instalar PWA'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 id="pwa-guide-title" className="text-base font-bold">
                Instalar VagasMZ no iPhone / Telemóvel
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Fechar instruções de instalação"
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>
                O VagasMZ está configurado com <strong>Web App Manifest</strong>, <strong>Service Worker</strong> e <strong>Apple Touch Icon</strong> para utilização offline e modo standalone:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-[var(--text-primary)]">
                <li>
                  No <strong>iPhone (Safari)</strong>: toca no botão <strong>Partilhar</strong> na barra inferior e selecciona <strong>Adicionar ao Ecrã Principal</strong>.
                </li>
                <li>
                  No <strong>Android / Chrome / Edge</strong>: abre a aplicação diretamente numa janela dedicada fora da iframe de pré-visualização e clica no ícone de instalação na barra de endereço.
                </li>
              </ol>
              <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)]">
                Nota de transparência: Dentro da iframe de pré-visualização do Google AI Studio, o evento nativo de instalação pode ser bloqueado pelo navegador; em produção ou URL directo funciona em modo standalone completo.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold min-h-[40px]"
              >
                Compreendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
