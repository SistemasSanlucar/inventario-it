import { type ReactNode } from 'react'
import Header from './Header'
import NavTabs from './NavTabs'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-container">
      <Header />
      <NavTabs />
      <div className="content-section">{children}</div>
    </div>
  )
}
