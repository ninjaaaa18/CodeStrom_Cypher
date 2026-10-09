import { ArrowRight, CircleDashed } from 'lucide-react'
import { Link } from 'react-router-dom'

type CustomerPlaceholderProps = {
  eyebrow: string
  title: string
  task: string
  status: string
  nextLabel: string
  nextTo: string
}

export function CustomerPlaceholder({
  eyebrow,
  title,
  task,
  status,
  nextLabel,
  nextTo,
}: CustomerPlaceholderProps) {
  return (
    <section className="placeholder-page" aria-labelledby="placeholder-title">
      <div className="placeholder-marker">
        <span className="eyebrow">{eyebrow}</span>
        <span className="placeholder-marker-line" />
        <span className="placeholder-mark" aria-hidden="true">S / 01</span>
      </div>
      <div className="placeholder-content">
        <h1 id="placeholder-title">{title}</h1>
        <p className="placeholder-task">{task}</p>
        <div className="not-connected" role="status">
          <CircleDashed size={19} aria-hidden="true" />
          <div>
            <strong>Not connected yet</strong>
            <p>{status}</p>
          </div>
        </div>
        <Link className="button button-primary placeholder-link" to={nextTo}>
          {nextLabel} <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
      <div className="placeholder-footnote">
        <span>SWIFTORA / CUSTOMER</span>
        <span>THIS PAGE IS A FOUNDATION FOR FUTURE INTEGRATION</span>
      </div>
    </section>
  )
}
