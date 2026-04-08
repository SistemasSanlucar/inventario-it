import { T } from '../../i18n'

export default function LoadingScreen() {
  return (
    <div className="global-loading">
      <div className="loading-spinner" />
      <p className="global-loading-text">{T().loading}</p>
    </div>
  )
}
