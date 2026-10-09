import { ArrowLeft, ArrowUpRight, CircleAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getProductById } from '../../features/products/productCatalog'
import { ProductArtwork } from '../../features/products/ProductArtwork'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import './customerProductResponsive.css'

export function CustomerProductDetail() {
  const { id } = useParams()
  const product = getProductById(id)

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

          <button
            className="add-to-cart-button"
            type="button"
            disabled
            aria-describedby="cart-unavailable-note"
          >
            Add to cart <ArrowUpRight size={16} aria-hidden="true" />
          </button>
          <p className="cart-unavailable-note" id="cart-unavailable-note">
            Cart integration isn’t available in this preview, so this item can’t
            be added or purchased.
          </p>
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
