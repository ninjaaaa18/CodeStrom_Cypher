import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  readCustomerCart,
  type CartItemRecord,
  type CartReadResult,
} from '../../features/cart/cartStorage'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import { ProductArtwork } from '../../features/products/ProductArtwork'
import { getProductById } from '../../features/products/productCatalog'
import type { Product } from '../../features/products/productCatalog'
import '../../features/products/productExperience.css'
import './customerCheckout.css'

type DeliveryField =
  | 'fullName'
  | 'mobile'
  | 'email'
  | 'address'
  | 'landmark'
  | 'locality'
  | 'city'
  | 'state'
  | 'pinCode'

type DeliveryDetails = Record<DeliveryField, string>
type DeliveryErrors = Partial<Record<DeliveryField, string>>
type CheckoutLine = { item: CartItemRecord; product: Product }

const fieldLabels: Record<DeliveryField, string> = {
  fullName: 'Full name',
  mobile: 'Indian mobile number',
  email: 'Email address',
  address: 'Address line',
  landmark: 'Landmark (optional)',
  locality: 'Area / locality',
  city: 'City',
  state: 'State',
  pinCode: 'PIN code',
}

const initialDelivery: DeliveryDetails = {
  fullName: '',
  mobile: '',
  email: '',
  address: '',
  landmark: '',
  locality: '',
  city: '',
  state: '',
  pinCode: '',
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

function formatPaise(paise: number): string {
  return inrFormatter.format(paise / 100)
}

function getSizeDescription(item: CartItemRecord, product: Product): string {
  return (
    item.selectedSize ??
    product.sizeOptions[0] ??
    'Cut by the metre · no size variants'
  )
}

function getUnitLabel(product: Product): string {
  if (product.sellingUnit === 'metre') return 'per metre'
  if (product.sellingUnit === 'pair') return 'per pair'
  return 'per piece'
}

function normalizeMobile(value: string): string {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  const mobileDigits =
    digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
  return `+91 ${mobileDigits.slice(0, 5)} ${mobileDigits.slice(5)}`
}

function validateDelivery(details: DeliveryDetails): DeliveryErrors {
  const errors: DeliveryErrors = {}
  const requiredFields: DeliveryField[] = [
    'fullName',
    'mobile',
    'email',
    'address',
    'locality',
    'city',
    'state',
    'pinCode',
  ]

  for (const field of requiredFields) {
    if (!details[field].trim()) errors[field] = `${fieldLabels[field]} is required.`
  }

  const mobileDigits = details.mobile.trim().replace(/\D/g, '')
  const normalizedMobile =
    mobileDigits.length === 12 && mobileDigits.startsWith('91')
      ? mobileDigits.slice(2)
      : mobileDigits
  if (
    details.mobile.trim() &&
    (!/^(?:\+91|91)?[6-9]\d{9}$/.test(
      details.mobile.trim().replace(/[\s()-]/g, ''),
    ) ||
      normalizedMobile.length !== 10 ||
      !/^[6-9]\d{9}$/.test(normalizedMobile))
  ) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number, optionally with +91.'
  }

  if (
    details.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())
  ) {
    errors.email = 'Enter an email address in the format name@example.com.'
  }

  if (details.pinCode.trim() && !/^\d{6}$/.test(details.pinCode.trim())) {
    errors.pinCode = 'Enter a six-digit PIN code.'
  }

  return errors
}

function normalizeDelivery(details: DeliveryDetails): DeliveryDetails {
  return {
    fullName: details.fullName.trim(),
    mobile: normalizeMobile(details.mobile),
    email: details.email.trim().toLowerCase(),
    address: details.address.trim(),
    landmark: details.landmark.trim(),
    locality: details.locality.trim(),
    city: details.city.trim(),
    state: details.state.trim(),
    pinCode: details.pinCode.trim(),
  }
}

export function CustomerCheckout() {
  const [cart, setCart] = useState<CartReadResult>(() => readCustomerCart())
  const [details, setDetails] = useState<DeliveryDetails>(initialDelivery)
  const [errors, setErrors] = useState<DeliveryErrors>({})
  const [reviewDetails, setReviewDetails] = useState<DeliveryDetails | null>(null)
  const fieldRefs = useRef<Partial<Record<DeliveryField, HTMLInputElement>>>({})

  const lines: CheckoutLine[] = cart.items.flatMap((item) => {
    const product = getProductById(item.productId)
    return product ? [{ item, product }] : []
  })
  const subtotalInPaise = lines.reduce(
    (total, { item, product }) =>
      total + Math.round(product.price * 100) * item.quantity,
    0,
  )
  const totalQuantity = lines.reduce((total, { item }) => total + item.quantity, 0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateDelivery(details)
    setErrors(nextErrors)
    const firstInvalid = (Object.keys(nextErrors) as DeliveryField[])[0]
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus()
      return
    }

    setReviewDetails(normalizeDelivery(details))
  }

  function handleChange(field: DeliveryField, value: string) {
    setDetails((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function retryRead() {
    setCart(readCustomerCart())
  }

  function renderField(
    field: DeliveryField,
    options: {
      autoComplete: string
      inputMode?: 'email' | 'numeric' | 'tel' | 'text'
      maxLength?: number
      type?: string
      hint?: string
    },
  ) {
    const errorId = `${field}-error`
    const hintId = `${field}-hint`
    const describedBy = [
      options.hint ? hintId : null,
      errors[field] ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined

    return (
      <div className={`checkout-field${errors[field] ? ' has-error' : ''}`}>
        <label htmlFor={field}>{fieldLabels[field]}</label>
        <input
          ref={(element) => {
            if (element) fieldRefs.current[field] = element
          }}
          id={field}
          name={field}
          type={options.type ?? 'text'}
          value={details[field]}
          autoComplete={options.autoComplete}
          inputMode={options.inputMode}
          maxLength={options.maxLength}
          aria-invalid={Boolean(errors[field])}
          aria-describedby={describedBy}
          onChange={(event) => handleChange(field, event.target.value)}
        />
        {options.hint && <small id={hintId}>{options.hint}</small>}
        {errors[field] && (
          <small id={errorId} className="checkout-field-error">
            {errors[field]}
          </small>
        )}
      </div>
    )
  }

  return (
    <div className="product-page checkout-page">
      <Link className="detail-back-link" to={CUSTOMER_PATHS.cart}>
        <ArrowLeft size={15} aria-hidden="true" /> Return to your cart
      </Link>

      <header className="checkout-heading">
        <div>
          <p className="eyebrow">SWIFTORA / DELIVERY PREVIEW</p>
          <h1>Considered pieces,<br /><span>carefully addressed.</span></h1>
        </div>
        <p>
          Add a delivery address, then review it alongside your selected edit.
          This local preview does not submit an order.
        </p>
      </header>

      <ol className="checkout-steps" aria-label="Checkout progress">
        <li className={reviewDetails ? 'is-complete' : 'is-current'}>
          <span aria-hidden="true">{reviewDetails ? '✓' : '01'}</span>
          Delivery details
        </li>
        <li className={reviewDetails ? 'is-current' : ''}>
          <span aria-hidden="true">{reviewDetails ? '02' : '02'}</span>
          Review
        </li>
      </ol>

      {cart.error && (
        <div className="checkout-storage-error" role="alert">
          <div>
            <strong>Your cart could not be read.</strong>
            <p>{cart.error} Your cart has not been treated as empty.</p>
          </div>
          <button type="button" onClick={retryRead}>
            <RotateCcw size={15} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {!cart.error && cart.warning && (
        <p className="checkout-storage-warning" role="alert">{cart.warning}</p>
      )}

      {!cart.error && lines.length === 0 ? (
        <section className="checkout-empty" aria-labelledby="checkout-empty-title">
          <span className="checkout-index" aria-hidden="true">S / 03</span>
          <div>
            <p className="eyebrow">NOTHING TO REVIEW JUST YET</p>
            <h2 id="checkout-empty-title">Your edit is ready for a first find.</h2>
            <p>Browse the illustrative collection and add a piece to your device cart.</p>
            <Link className="button button-primary" to={CUSTOMER_PATHS.products}>
              Browse the style edit <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : !cart.error ? (
        <div className="checkout-layout">
          <section className="checkout-primary" aria-labelledby="checkout-panel-title">
            {reviewDetails ? (
              <div className="checkout-panel checkout-review">
                <p className="eyebrow">STEP 02 / REVIEW</p>
                <h2 id="checkout-panel-title">Delivery details</h2>
                <p className="checkout-panel-intro">
                  Check that this local preview is addressed correctly.
                </p>
                <address className="checkout-address">
                  <strong>{reviewDetails.fullName}</strong>
                  <span>{reviewDetails.address}</span>
                  {reviewDetails.landmark && <span>{reviewDetails.landmark}</span>}
                  <span>{reviewDetails.locality}, {reviewDetails.city}</span>
                  <span>{reviewDetails.state} — {reviewDetails.pinCode}</span>
                  <span>{reviewDetails.mobile}</span>
                  <span>{reviewDetails.email}</span>
                </address>
                <div className="checkout-review-note">
                  <strong>Review only — no order or payment will be made.</strong>
                  <p>
                    Order submission and payment are not available in Swiftora yet.
                    Your address remains only in this page and is not saved.
                  </p>
                </div>
                <button
                  className="checkout-secondary-button"
                  type="button"
                  onClick={() => setReviewDetails(null)}
                >
                  <ArrowLeft size={16} aria-hidden="true" /> Edit delivery details
                </button>
              </div>
            ) : (
              <form className="checkout-panel" onSubmit={handleSubmit} noValidate>
                <p className="eyebrow">STEP 01 / DELIVERY</p>
                <h2 id="checkout-panel-title">Where should this edit go?</h2>
                <p className="checkout-panel-intro">
                  Your details stay in this page and are not stored.
                </p>

                {Object.keys(errors).length > 0 && (
                  <div className="checkout-error-summary" role="alert">
                    <strong>Please check the highlighted details.</strong>
                    <ul>
                      {(Object.keys(errors) as DeliveryField[]).map((field) => (
                        <li key={field}>
                          <a href={`#${field}`}>{errors[field]}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="checkout-form-grid">
                  {renderField('fullName', { autoComplete: 'name' })}
                  {renderField('mobile', {
                    autoComplete: 'tel',
                    inputMode: 'tel',
                    type: 'tel',
                    hint: '10-digit Indian mobile, with or without +91.',
                  })}
                  {renderField('email', {
                    autoComplete: 'email',
                    inputMode: 'email',
                    type: 'email',
                  })}
                  {renderField('address', {
                    autoComplete: 'address-line1',
                  })}
                  {renderField('landmark', {
                    autoComplete: 'off',
                  })}
                  {renderField('locality', {
                    autoComplete: 'address-level3',
                  })}
                  {renderField('city', {
                    autoComplete: 'address-level2',
                  })}
                  {renderField('state', {
                    autoComplete: 'address-level1',
                  })}
                  {renderField('pinCode', {
                    autoComplete: 'postal-code',
                    inputMode: 'numeric',
                    maxLength: 6,
                  })}
                </div>

                <button className="checkout-primary-button" type="submit">
                  Review delivery details <ArrowRight size={16} aria-hidden="true" />
                </button>
              </form>
            )}
          </section>

          <aside className="checkout-recap" aria-labelledby="checkout-recap-title">
            <div className="checkout-recap-heading">
              <div>
                <p className="eyebrow">YOUR DEVICE CART</p>
                <h2 id="checkout-recap-title">The selected edit</h2>
              </div>
              <span>{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</span>
            </div>
            <ul className="checkout-lines">
              {lines.map(({ item, product }) => {
                const unitPrice = Math.round(product.price * 100)
                const lineTotal = unitPrice * item.quantity
                return (
                  <li
                    className="checkout-line"
                    key={`${item.productId}:${item.selectedSize ?? ''}`}
                  >
                    <div className="checkout-line-artwork">
                      <ProductArtwork product={product} compact />
                    </div>
                    <div className="checkout-line-content">
                      <p className="checkout-line-category">{product.category}</p>
                      <h3>{product.name}</h3>
                      <p className="checkout-line-colour">
                        {getSizeDescription(item, product)} <span aria-hidden="true">/</span>{' '}
                        {product.color}
                      </p>
                      <p className="checkout-line-unit">
                        Qty {item.quantity} · {formatPaise(unitPrice)} {getUnitLabel(product)}
                      </p>
                      <strong className="checkout-line-total">{formatPaise(lineTotal)}</strong>
                    </div>
                  </li>
                )
              })}
            </ul>
            <dl className="checkout-totals">
              <div>
                <dt>Illustrative subtotal</dt>
                <dd>{formatPaise(subtotalInPaise)}</dd>
              </div>
              <div className="checkout-estimated">
                <dt>Estimated total</dt>
                <dd>{formatPaise(subtotalInPaise)}</dd>
              </div>
            </dl>
            <p className="checkout-recap-disclaimer">
              Demo catalogue, prices and availability are illustrative. No delivery
              fee is included; no order or payment is submitted.
            </p>
            <Link className="checkout-cart-link" to={CUSTOMER_PATHS.cart}>
              <ArrowLeft size={15} aria-hidden="true" /> Edit cart
            </Link>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
