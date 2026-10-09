import { useTranslation } from 'react-i18next'

function DashboardPage() {
  const { t } = useTranslation()

  return (
    <main className="page">
      <h1>{t('navigation.dashboard')}</h1>
    </main>
  )
}

export default DashboardPage