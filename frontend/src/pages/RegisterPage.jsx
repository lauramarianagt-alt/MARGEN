import { useTranslation } from 'react-i18next'

function RegisterPage() {
  const { t } = useTranslation()

  return (
    <main className="page">
      <h1>{t('auth.register.title')}</h1>
    </main>
  )
}

export default RegisterPage