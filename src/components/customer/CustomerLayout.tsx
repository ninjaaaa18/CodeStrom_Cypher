import { ArrowUpRight } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'

const navigation = [
  { label: 'Products', to: CUSTOMER_PATHS.products },
  { label: 'Cart', to: CUSTOMER_PATHS.cart },
  { label: 'Checkout', to: CUSTOMER_PATHS.checkout },
  { label: 'Orders', to: CUSTOMER_PATHS.orders },
  { label: 'Magic Mirror', to: CUSTOMER_PATHS.magicMirror },
]

export function CustomerLayout() {
  return (
    <div className="customer-app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="customer-header">
        <NavLink className="brand" to={CUSTOMER_PATHS.home} aria-label="Swiftora home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SWIFTORA</span>
        </NavLink>
        <nav className="customer-nav" aria-label="Customer navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `customer-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <span className="header-note">
          <span aria-hidden="true" />
          CUSTOMER PREVIEW
        </span>
      </header>

      <main id="main-content" className="customer-main">
        <Outlet />
      </main>

      <footer className="customer-footer">
        <NavLink className="footer-brand" to={CUSTOMER_PATHS.home}>
          SWIFTORA
        </NavLink>
        <p>Fast when possible. Honest always.</p>
        <a className="footer-top" href="#main-content">
          Back to top <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
    </div>
  )
}
