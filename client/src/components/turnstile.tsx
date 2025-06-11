import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile: any;
  }
}

export function Turnstile({ onSuccess }: { onSuccess: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current!
    if (!container) return

    function render() {
      if (!window.turnstile) return
      const id = window.turnstile.render(container, {
        sitekey: process.env.TURNSTILE_SITE_KEY,
        callback: onSuccess,
      })
      container.dataset.widgetId = String(id)
    }

    if (window.turnstile) {
      render()
      return () => {
        const widgetId = container.dataset.widgetId
        if (widgetId) window.turnstile.remove(widgetId)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = render
    document.head.appendChild(script)

    return () => {
      const widgetId = container.dataset.widgetId
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
      script.remove()
    }
  }, [onSuccess])

  return <div ref={ref} className="cf-turnstile" />
}
