import { Languages } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../app/i18n'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

export function LanguagePicker() {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)

  const current =
    supportedLanguages.find((l) => l.code === i18n.language) ??
    supportedLanguages.find((l) => l.code === (i18n.resolvedLanguage ?? 'en')) ??
    supportedLanguages[0]

  return (
    <>
      <button
        className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
        onClick={() => setOpen(true)}
        aria-label={t('lang.switch')}
        type="button"
      >
        <Languages className="h-5 w-5" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t('lang.switch')}>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Current: {current.label}</div>
          <div className="grid grid-cols-2 gap-2">
            {supportedLanguages.map((l) => (
              <Button
                key={l.code}
                variant={i18n.language === l.code ? 'primary' : 'secondary'}
                size="sm"
                onClick={async () => {
                  await i18n.changeLanguage(l.code)
                  setOpen(false)
                }}
              >
                {l.label}
              </Button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}

