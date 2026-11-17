'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const MODAL_SELECTOR = '.harmony-modal-surface, [role="dialog"][aria-modal="true"]'
const FEEDBACK_SELECTOR = '[data-harmony-feedback="error"], [data-harmony-feedback="success"], [role="alert"], .scaleup-alert.error, .scaleup-alert.success'

type Feedback = {
  modal: HTMLElement
  source: HTMLElement
  message: string
  tone: 'error' | 'success'
}

function isPresent(element: HTMLElement): boolean {
  return element.isConnected && element.getClientRects().length > 0 &&
    getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden'
}

function readFeedback(element: HTMLElement): string {
  // Do not copy action labels or buttons from the original inline alert.
  const snapshot = element.cloneNode(true) as HTMLElement
  snapshot.querySelectorAll('button, svg, [aria-hidden="true"]').forEach((node) => node.remove())
  return (snapshot.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1800)
}

function resolveFeedback(): Feedback | null {
  const modals = [...document.querySelectorAll<HTMLElement>(MODAL_SELECTOR)].filter(isPresent)
  if (!modals.length) return null

  // The last visible dialog is the active one when dialogs are nested.
  // Both body-portaled dialogs and legacy dialogs are supported.
  const modal = modals[modals.length - 1]
  const candidates = [...document.querySelectorAll<HTMLElement>(FEEDBACK_SELECTOR)].filter((element) =>
    isPresent(element) && !element.closest(MODAL_SELECTOR) && !element.closest('.harmony-modal-feedback-host'),
  )
  if (!candidates.length) return null

  // Errors have precedence over success notifications while a dialog is open.
  const source = candidates.find((element) => element.dataset.harmonyFeedback === 'error')
    || candidates.find((element) => element.matches('.scaleup-alert.error'))
    || candidates.find((element) => element.getAttribute('role') === 'alert')
    || candidates.find((element) =>
    element.dataset.harmonyFeedback === 'success' || element.matches('.scaleup-alert.success'),
  )
  if (!source) return null

  const tone: Feedback['tone'] = source.dataset.harmonyFeedback === 'success' || source.matches('.scaleup-alert.success')
    ? 'success'
    : 'error'
  const heading = tone === 'error' ? 'Perhatian' : 'Berhasil'
  const message = readFeedback(source).replace(new RegExp(`^${heading}\\s+`, 'i'), '').trim()
  if (!message) return null
  return { modal, source, message, tone }
}

/**
 * Display page-level form feedback inside the currently open modal.
 * Avoids the page's stacking context and stays inside modal keyboard focus scope.
 * This is presentation-only; it never changes the form state or API workflow.
 */
export function HarmonyModalFeedbackLayer() {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [dismissed, setDismissed] = useState<Feedback | null>(null)

  useEffect(() => {
    let frame = 0
    const inspect = () => {
      frame = 0
      const next = resolveFeedback()
      setFeedback((current) => {
        if (current?.modal === next?.modal && current?.source === next?.source &&
            current?.message === next?.message && current?.tone === next?.tone) return current
        return next
      })
      if (next) document.body.setAttribute('data-harmony-feedback-relayed', 'true')
      else document.body.removeAttribute('data-harmony-feedback-relayed')
    }
    const observer = new MutationObserver((mutations) => {
      // Rendering the relayed feedback must not cause a MutationObserver feedback loop.
      if (mutations.every((mutation) => {
        const element = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
        return element?.closest('.harmony-modal-feedback-host')
      })) return
      if (!frame) frame = requestAnimationFrame(inspect)
    })
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden', 'role', 'data-harmony-feedback'],
      subtree: true,
    })
    inspect()
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
      document.body.removeAttribute('data-harmony-feedback-relayed')
    }
  }, [])

  if (!feedback || !feedback.modal.isConnected) return null
  const hidden = dismissed && dismissed.modal === feedback.modal &&
    dismissed.source === feedback.source && dismissed.message === feedback.message
  if (hidden) return null

  const dismiss = () => {
    setDismissed(feedback)
    // Dismiss the original banner using its existing close control, if available.
    const close = [...feedback.source.querySelectorAll<HTMLButtonElement>('button[type="button"], button:not([type])')]
      .find((button) => /tutup|close|dismiss/i.test(`${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''}`))
    close?.click()
  }

  return createPortal(
    <div className="harmony-modal-feedback-host" data-harmony-modal-feedback-host="true">
      <div className={`harmony-modal-feedback-card harmony-modal-feedback-${feedback.tone}`}
        role={feedback.tone === 'error' ? 'alert' : 'status'}
        aria-live={feedback.tone === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true">
        <div className="harmony-modal-feedback-content">
          <strong>{feedback.tone === 'error' ? 'Perhatian' : 'Berhasil'}</strong>
          <p>{feedback.message}</p>
        </div>
        <button type="button" className="harmony-modal-feedback-dismiss" onClick={dismiss} aria-label="Tutup pemberitahuan pada modal">×</button>
      </div>
    </div>,
    feedback.modal,
  )
}
