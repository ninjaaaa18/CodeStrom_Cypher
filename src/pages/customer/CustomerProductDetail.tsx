import { ArrowLeft, ArrowUpRight, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addCustomerCartItem } from '../../features/cart/cartStorage'
import { getProductById } from '../../features/products/productCatalog'
import { ProductArtwork } from '../../features/products/ProductArtwork'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import '../../features/products/productExperience.css'
import './customerProductResponsive.css'

export function CustomerProductDetail() {
  const { id } = useParams()
  const product = getProductById(id)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantityInput, setQuantityInput] = useState('1')
  const [cartFeedback, setCartFeedback] = useState<{
    message: string
    isError: boolean
  } | null>(null)

  if (!product) {
    return (
      <div className="product-page product-detail-page">
        <div className="invalid-product-state">
          <p className="eyebrow">404 / NOT IN THIS EDIT</p>
          <CircleAlert size={27} strokeWidth={1.5} aria-hidden="true" />
          <h1>We couldn’t find that product.</h1>
          <p>
            This link may be out of date, or this style may not be part of the
            demo catalogue.
          </p>
          <Link className="button button-primary" to={CUSTOMER_PATHS.products}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to the catalogue
          </Link>
        </div>
      </div>
    )
  }

  const activeProduct = product
  const hasSizeVariants = product.sizeOptions.length > 1
  const quantity = Number(quantityInput)
  const isQuantityValid =
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    Number.isSafeInteger(Math.round(product.price * 100) * quantity)
  const isVariantValid =
    !hasSizeVariants ||
    (selectedSize !== null && product.sizeOptions.includes(selectedSize))
  const priceInPaise = Math.round(product.price * 100)
  const maxQuantity = Math.floor(Number.MAX_SAFE_INTEGER / priceInPaise)

  function addToCart() {
    if (!isVariantValid || !isQuantityValid) return

    const result = addCustomerCartItem(
      activeProduct.id,
      hasSizeVariants ? selectedSize : null,
      quantity,
    )
    if (result.error) {
      setCartFeedback({ message: result.error, isError: true })
      return
    }

    setCartFeedback({
      message: result.warning
        ? `Added to your device cart. ${result.warning}`
        : 'Added to your device cart. No order or payment has been created.',
      isError: false,
    })
  }

  return (
    <div className="product-page product-detail-page">
      <Link className="detail-back-link" to={CUSTOMER_PATHS.products}>
        <ArrowLeft size={15} aria-hidden="true" /> All demo styles
      </Link>

      <article className="product-detail">
        <div className="product-detail-visual">
          <ProductArtwork product={product} />
          <span className="detail-visual-caption">SWIFTORA / TEXTILE STUDIO</span>
        </div>

        <div className="product-detail-copy">
          <p className="eyebrow">THE SWIFTORA EDIT / {product.category.toUpperCase()}</p>
          <h1>{product.name}</h1>
          <p className="product-detail-price">
            ₹{product.price}
            {product.sellingUnit === 'metre'
              ? ' / metre'
              : product.sellingUnit === 'pair'
                ? ' / pair'
                : ''}
          </p>
          <p className="product-detail-description">{product.description}</p>
          <dl className="product-detail-specs">
            <div>
              <dt>Material</dt>
              <dd>{product.material}</dd>
            </div>
            <div>
              <dt>Colour</dt>
              <dd>{product.color}</dd>
            </div>
            <div>
              <dt>Available sizes</dt>
              <dd>
                {product.sizeOptions.length
                  ? product.sizeOptions.join(' · ')
                  : 'Cut by the metre · no size variants'}
              </dd>
            </div>
            <div>
              <dt>Selling unit</dt>
              <dd>
                {product.sellingUnit === 'metre'
                  ? 'Per metre'
                  : product.sellingUnit === 'pair'
                    ? 'Per pair'
                    : 'Per piece'}
              </dd>
            </div>
          </dl>
          <div className="detail-availability">
            <span className="availability-indicator" aria-hidden="true" />
            <div>
              <strong>{product.availability}</strong>
              <span>Illustrative only · not verified live stock</span>
            </div>
          </div>

          {hasSizeVariants && (
            <fieldset className="product-variant-options">
              <legend>Choose a size</legend>
              <div className="product-variant-list">
                {product.sizeOptions.map((size) => (
                  <label className="product-variant-option" key={size}>
                    <input
                      type="radio"
                      name={`product-size-${product.id}`}
                      value={size}
                      checked={selectedSize === size}
                      onChange={() => {
                        setSelectedSize(size)
                        setCartFeedback(null)
                      }}
                    />
                    <span>{size}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="product-quantity-control">
            <label htmlFor="product-quantity">
              Quantity ({product.sellingUnit === 'metre' ? 'metres' : product.sellingUnit === 'pair' ? 'pairs' : 'pieces'})
            </label>
            <input
              id="product-quantity"
              type="number"
              min="1"
              max={maxQuantity}
              step="1"
              inputMode="numeric"
              value={quantityInput}
              aria-describedby="quantity-help"
              onChange={(event) => {
                setQuantityInput(event.currentTarget.value)
                setCartFeedback(null)
              }}
            />
            <span className="product-quantity-help" id="quantity-help">
              Choose a positive whole number.
            </span>
          </div>

          <button
            className="add-to-cart-button"
            type="button"
            disabled={!isVariantValid || !isQuantityValid}
            onClick={addToCart}
          >
            Add to cart <ArrowUpRight size={16} aria-hidden="true" />
          </button>
          {!isVariantValid && (
            <p className="cart-unavailable-note" id="cart-unavailable-note">
              Select a size before adding this style to your cart.
            </p>
          )}
          {!isQuantityValid && (
            <p className="cart-unavailable-note">
              Enter a positive whole-number quantity that can be calculated safely.
            </p>
          )}
          {cartFeedback && (
            <p
              className={cartFeedback.isError ? 'cart-feedback is-error' : 'cart-feedback'}
              role={cartFeedback.isError ? 'alert' : 'status'}
            >
              {cartFeedback.message}
              {!cartFeedback.isError && (
                <>
                  {' '}
                  <Link to={CUSTOMER_PATHS.cart}>View cart</Link>
                </>
              )}
            </p>
          )}
          <p className="detail-demo-note">
            <span>DEMO PRICE</span>
            <span>
              ₹{product.price}
              {product.sellingUnit === 'metre'
                ? ' / metre'
                : product.sellingUnit === 'pair'
                  ? ' / pair'
                  : ''}{' '}
              · illustrative only
            </span>
          </p>
        </div>
      </article>

      <div className="detail-footnote">
        <span>STYLE NOTES / A SMALL, STATIC DEMO SELECTION</span>
        <Link to={CUSTOMER_PATHS.products}>
          Browse the full catalogue <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
