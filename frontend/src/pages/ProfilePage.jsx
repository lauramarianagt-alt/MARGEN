import DeleteAccountSection from '../components/DeleteAccountSection.jsx'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.js'
export default function ProfilePage() {
  const { profile, updateProfile } = useAuth()
  const { t } = useTranslation()
  const [values, setValues] = useState({
    name: profile?.name ?? '',
    surname: profile?.surname ?? '',
    bio: profile?.bio ?? '',
  })
  const [status, setStatus] = useState('idle')
  async function submit(event) {
    event.preventDefault()
    setStatus('saving')
    try {
      await updateProfile(values)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }
  return (
    <main className="page profile-editor-page">
      <header className="article-editor-header">
        <div>
          <p className="page-eyebrow">{t('profile.eyebrow')}</p>
          <h1>{t('profile.title')}</h1>
        </div>
      </header>
      <div className="profile-editor-intro">
        <p>{t('profile.intro')}</p>
        {profile?.username && (
          <Link to={`/${profile.username}`}>{t('profile.view')} ↗</Link>
        )}
      </div>
      <form className="profile-editor-form" onSubmit={submit}>
        <label>
          {t('profile.name')}
          <input
            name="name"
            value={values.name}
            required
            maxLength={80}
            disabled={status === 'saving'}
            onChange={(event) =>
              setValues({ ...values, name: event.target.value })
            }
          />
        </label>
        <label>
          {t('profile.surname')}
          <input
            name="surname"
            value={values.surname}
            required
            maxLength={80}
            disabled={status === 'saving'}
            onChange={(event) =>
              setValues({ ...values, surname: event.target.value })
            }
          />
        </label>
        <label>
          {t('profile.bio')}
          <textarea
            name="bio"
            rows={5}
            value={values.bio}
            maxLength={1500}
            disabled={status === 'saving'}
            onChange={(event) =>
              setValues({ ...values, bio: event.target.value })
            }
          />
        </label>
        {status === 'saved' && <p role="status">{t('profile.saved')}</p>}
        {status === 'error' && <p role="alert">{t('profile.error')}</p>}
        <footer className="profile-editor-actions">
          <button
            type="submit"
            className="profile-editor-save"
            disabled={status === 'saving'}
          >
            {t(status === 'saving' ? 'profile.saving' : 'profile.save')}
          </button>
          <Link className="profile-editor-back" to="/dashboard">
            {t('profile.back')} <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </form>
      <DeleteAccountSection />
    </main>
  )
}
