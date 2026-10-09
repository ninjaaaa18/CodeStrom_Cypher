import { ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  clearCustomerCart,
  readCustomerCart,
  removeCustomerCartItem,
  setCustomerCartItemQuantity,
  type CartItemRecord,
  type CartReadResult,
} from '../../features/cart/cartStorage'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import { ProductArtwork } from '../../features/products/ProductArtwork'
import { getProductById } from '../../features/products/productCatalog'
import '../../features/products/productExperience.css'

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

function formatPaise(paise: number): string {
  return inrFormatter.format(paise / 100)
}

function getUnitLabel(item: CartItemRecord): string {
  const product = getProductById(item.productId)
  if (!product) return ''
  if (product.sellingUnit === 'metre') return 'per metre'
  if (product.sellingUnit === 'pair') return 'per pair'
  return 'per piece'
}

export function CustomerCart() {
  const [cart, setCart] = useState<CartReadResult>(() => readCustomerCart())
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)
  const subtotalInPaise = cart.items.reduce((total, item) => {
    const product = getProductById(item.productId)
    return total + (product ? Math.round(product.price * 100) * item.quantity : 0)
  }, 0)

  function applyCartResult(result: CartReadResult, successMessage: string) {
    if (result.error) {
      setFeedback(null)
      setCart((current) => ({ ...current, error: result.error }))
      return
    }

    setCart(result)
    setFeedback(successMessage)
  }

  function updateQuantity(item: CartItemRecord, quantity: number) {
    applyCartResult(
      setCustomerCartItemQuantity(item.productId, item.selectedSize, quantity),
      'Cart updated on this device.',
    )
  }

  function removeItem(item: CartItemRecord) {
    applyCartResult(
      removeCustomerCartItem(item.productId, item.selectedSize),
      'Item removed from your device cart.',
    )
  }

  function clearCart() {
    const result = clearCustomerCart()
    if (result.error) {
      applyCartResult(result, '')
      return
    }
    setCart(result)
    setClearConfirmationOpen(false)
    setFeedback('Your device cart has been cleared.')
  }

  function retryRead() {
    setCart(readCustomerCart())
    setFeedback(null)
  }

  return (
    <div className="product-page customer-cart-page">
      <Link className="detail-back-link" to={CUSTOMER_PATHS.products}>
        <ArrowLeft size={15} aria-hidden="true" /> Continue shopping
      </Link>

      <header className="cart-heading">
        <div>
          <p className="eyebrow">SWIFTORA / YOUR DEVICE CART</p>
          <h1>Your edit,<br /><span>gathered here.</span></h1>
        </div>
        <p className="cart-heading-note">
          A local preview of the styles you’ve chosen. Nothing is submitted as an
          order.
        </p>
      </header>

      {cart.error && (
        <div className="cart-storage-message is-error" role="alert">
          <div>
            <strong>Cart storage needs attention.</strong>
            <p>{cart.error}</p>
          </div>
          <button className="cart-text-button" type="button" onClick={retryRead}>
            Try again
          </button>
        </div>
      )}

      {!cart.error && cart.warning && (
        <p className="cart-storage-message" role="alert">{cart.warning}</p>
      )}
      {feedback && !cart.error && (
        <p className="cart-feedback" role="status">{feedback}</p>
      )}

      {!cart.error && cart.items.length === 0 ? (
        <section className="cart-empty-state" aria-labelledby="cart-empty-title">
          <span className="cart-empty-index" aria-hidden="true">S / 02</span>
          <div>
            <p className="eyebrow">A LITTLE ROOM TO BEGIN</p>
            <h2 id="cart-empty-title">Your cart is waiting for a first find.</h2>
            <p>
              Explore the demo edit and add a style to keep it here on this
              device.
            </p>
            <Link className="button button-primary" to={CUSTOMER_PATHS.products}>
              Browse the style edit <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : !cart.error ? (
        <div className="cart-layout">
          <section className="cart-lines-section" aria-labelledby="cart-lines-title">
            <div className="cart-lines-heading">
              <div>
                <p className="eyebrow">SELECTED FOR THE EDIT</p>
                <h2 id="cart-lines-title">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </h2>
              </div>
              {!clearConfirmationOpen ? (
                <button
                  className="cart-text-button"
                  type="button"
                  onClick={() => setClearConfirmationOpen(true)}
                >
                  Clear cart
                </button>
              ) : (
                <div className="cart-clear-confirmation" role="group" aria-label="Confirm clearing cart">
                  <span>Clear all items?</span>
                  <button type="button" onClick={clearCart}>Yes, clear</button>
                  <button type="button" onClick={() => setClearConfirmationOpen(false)}>
                    Keep cart
                  </button>
                </div>
              )}
            </div>

            <ul className="cart-lines">
              {cart.items.map((item) => {
                const product = getProductById(item.productId)
                if (!product) return null
                const sizeDescription =
                  item.selectedSize ??
                  product.sizeOptions[0] ??
                  'Cut by the metre · no size variants'
                const lineTotal =
                  Math.round(product.price * 100) * item.quantity

                return (
                  <li className="cart-line" key={`${item.productId}:${item.selectedSize ?? ''}`}>
                    <div className="cart-line-artwork">
                      <ProductArtwork product={product} compact />
                    </div>
                    <article className="cart-line-details">
                      <p className="product-card-category">{product.category}</p>
                      <h3>{product.name}</h3>
                      <p className="cart-line-material">
                        {product.material} <span aria-hidden="true">/</span> {product.color}
                      </p>
                      <dl className="cart-line-specs">
                        <div>
                          <dt>{product.sizeOptions.length ? 'Size' : 'Cut'}</dt>
                          <dd>{sizeDescription}</dd>
                        </div>
                        <div>
                          <dt>Unit price</dt>
                          <dd>{formatPaise(Math.round(product.price * 100))} {getUnitLabel(item)}</dd>
                        </div>
                      </dl>
                      <div className="cart-line-actions">
                        <div className="cart-quantity-control" aria-label={`Quantity for ${product.name}`}>
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${product.name}`}
                            disabled={item.quantity <= 1}
                            onClick={() => updateQuantity(item, item.quantity - 1)}
                          >
                            <Minus size={15} aria-hidden="true" />
                          </button>
                          <span aria-live="polite">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${product.name}`}
                            onClick={() => updateQuantity(item, item.quantity + 1)}
                          >
                            <Plus size={15} aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          className="cart-remove-button"
                          type="button"
                          onClick={() => removeItem(item)}
                        >
                          <Trash2 size={14} aria-hidden="true" /> Remove
                        </button>
                      </div>
                    </article>
                    <p className="cart-line-total">
                      <span>Line subtotal</span>
                      <strong>{formatPaise(lineTotal)}</strong>
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>

          <aside className="cart-summary" aria-labelledby="cart-summary-title">
            <p className="eyebrow">A CLEAR LITTLE RECAP</p>
            <h2 id="cart-summary-title">Cart summary</h2>
            <dl>
              <div>
                <dt>Items</dt>
                <dd>{totalItems}</dd>
              </div>
              <div className="cart-summary-total">
                <dt>Demo subtotal</dt>
                <dd>{formatPaise(subtotalInPaise)}</dd>
              </div>
            </dl>
            <Link className="cart-checkout-link" to={CUSTOMER_PATHS.checkout}>
              Continue to checkout <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <p className="cart-summary-note">
              Checkout is an informational preview. It will not create an order
              or take payment.
            </p>
            <p className="cart-demo-disclaimer">
              Prices and availability are illustrative only; stock has not been
              verified. This cart is saved only in this browser on this device.
            </p>
          </aside>
        </div>
      ) : (
        <div className="cart-storage-recovery">
          <Link className="button button-primary" to={CUSTOMER_PATHS.products}>
            Continue shopping <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  )
}
