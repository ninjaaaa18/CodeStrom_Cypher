import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from './productCatalog'
import { ProductArtwork } from './ProductArtwork'

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card">
      <Link
        className="product-card-image-link"
        to={`/products/${product.id}`}
        aria-label={`View ${product.name} details`}
      >
        <ProductArtwork product={product} compact />
        <span className="product-card-image-index" aria-hidden="true">
          {product.category}
        </span>
      </Link>
      <div className="product-card-copy">
        <div className="product-card-heading">
          <div>
            <p className="product-card-category">{product.category}</p>
            <h3>
              <Link to={`/products/${product.id}`}>{product.name}</Link>
            </h3>
          </div>
          <span className="product-card-price">
            ₹{product.price}
            {product.sellingUnit === 'metre'
              ? ' / m'
              : product.sellingUnit === 'pair'
                ? ' / pair'
                : ''}
          </span>
        </div>
        <p className="product-card-availability">
          <span aria-hidden="true" />
          {product.availability}{' '}
          <span className="availability-demo">· not live stock</span>
        </p>
        <Link className="product-card-detail-link" to={`/products/${product.id}`}>
          View details <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
