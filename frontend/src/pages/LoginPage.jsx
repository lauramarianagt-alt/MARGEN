import { useTranslation } from 'react-i18next'

function LoginPage() {
  const { t } = useTranslation()

  return (
    <main className="page">
      <h1>{t('auth.login.title')}</h1>
    </main>
  )
}

export default LoginPage