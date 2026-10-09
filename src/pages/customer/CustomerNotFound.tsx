import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'

export function CustomerNotFound() {
  return (
    <section className="placeholder-page not-found-page" aria-labelledby="not-found-title">
      <div className="placeholder-marker">
        <span className="eyebrow">A WRONG TURN</span>
        <span className="placeholder-marker-line" />
        <span className="placeholder-mark" aria-hidden="true">404</span>
      </div>
      <div className="placeholder-content">
        <h1 id="not-found-title">This way<br />doesn’t go anywhere.</h1>
        <p className="placeholder-task">
          We couldn’t find that customer page. Let’s get you back on a clear route.
        </p>
        <Link className="button button-primary placeholder-link" to={CUSTOMER_PATHS.home}>
          <ArrowLeft size={17} aria-hidden="true" /> Back to SWIFTORA
        </Link>
        <Link className="text-link not-found-products" to={CUSTOMER_PATHS.products}>
          Or browse products <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="placeholder-footnote">
        <span>SWIFTORA / CUSTOMER</span>
        <span>PAGE NOT FOUND</span>
      </div>
    </section>
  )
}
