import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import EyeIcon from './EyeIcon.jsx'
export default function DeleteAccountSection() {
  const { t } = useTranslation()
  const { profile, closeAccount } = useAuth()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const ready =
    password.length > 0 &&
    confirmation.trim() === profile?.username &&
    acknowledged
  function cancel() {
    if (busy) return
    setConfirming(false)
    setPassword('')
    setShowPassword(false)
    setError(null)
  }
  async function remove() {
    if (!ready || busy || !confirming) return
    setBusy(true)
    setError(null)
    try {
      await closeAccount({
        password,
        confirmation: confirmation.trim(),
        acknowledged: true,
      })
      setPassword('')
      navigate('/login?accountClosed=true', { replace: true })
    } catch (requestError) {
      setError(
        t(
          requestError.status === 401
            ? 'account.passwordError'
            : 'account.error',
        ),
      )
      setBusy(false)
    }
  }
  return (
    <section className="account-close">
      <h2>{t('account.title')}</h2>
      <p>{t('account.summary')}</p>
      {!expanded ? (
        <button
          type="button"
          className="account-close__toggle"
          onClick={() => setExpanded(true)}
        >
          {t('account.open')}
        </button>
      ) : (
        <form
          className="account-close__form"
          onSubmit={(event) => {
            event.preventDefault()
            if (ready) setConfirming(true)
          }}
        >
          <div className="form-field">
            <label htmlFor="close-account-password">
              {t('account.password')}
            </label>
            <div className="password-field">
              <input
                id="close-account-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                maxLength={256}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={t(
                  showPassword ? 'auth.hidePassword' : 'auth.showPassword',
                )}
                onClick={() => setShowPassword((value) => !value)}
                disabled={busy}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="close-account-confirmation">
              {t('account.confirmation', { username: profile?.username })}
            </label>
            <input
              id="close-account-confirmation"
              autoComplete="off"
              required
              maxLength={30}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={busy}
            />
          </div>
          <label className="account-close__acknowledge">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              disabled={busy}
              required
            />
            <span>{t('account.acknowledge')}</span>
          </label>
          <div className="account-close__actions">
            <button
              type="button"
              className="navigation-button"
              onClick={() => {
                cancel()
                setExpanded(false)
                setConfirmation('')
                setAcknowledged(false)
              }}
              disabled={busy}
            >
              {t('articles.delete.cancel')}
            </button>
            <button
              className="account-close__continue"
              type="submit"
              disabled={!ready || busy}
            >
              {t('account.continue')}
            </button>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('account.confirmTitle')}
        description={t('account.warning')}
        itemName={profile?.username}
        confirmLabel={t('account.confirm')}
        cancelLabel={t('articles.delete.cancel')}
        processingLabel={t('account.processing')}
        isProcessing={busy}
        error={error}
        onConfirm={() => void remove()}
        onCancel={cancel}
      />
    </section>
  )
}
