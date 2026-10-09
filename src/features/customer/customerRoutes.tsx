import { Route, Routes } from 'react-router-dom'
import { CustomerLayout } from '../../components/customer/CustomerLayout'
import { CustomerNotFound } from '../../pages/customer/CustomerNotFound'
import { CustomerPlaceholder } from '../../pages/customer/CustomerPlaceholder'
import { CustomerHome } from '../../pages/customer/CustomerHome'
import { CustomerCart } from '../../pages/customer/CustomerCart'
import { CustomerProductDetail } from '../../pages/customer/CustomerProductDetail'
import { CustomerProducts } from '../../pages/customer/CustomerProducts'
import { CUSTOMER_PATHS } from './customerPaths'

export function CustomerRouteMap() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<CustomerHome />} />
        <Route
          path={CUSTOMER_PATHS.products.slice(1)}
          element={<CustomerProducts />}
        />
        <Route
          path={CUSTOMER_PATHS.productDetail.slice(1)}
          element={<CustomerProductDetail />}
        />
        <Route
          path={CUSTOMER_PATHS.cart.slice(1)}
          element={<CustomerCart />}
        />
        <Route
          path={CUSTOMER_PATHS.checkout.slice(1)}
          element={
            <CustomerPlaceholder
              eyebrow="CHECKOUT"
              title="Checkout"
              task="Review delivery and payment before placing an order."
              status="Checkout is not connected yet. No payment or order submission happens here."
              nextLabel="Return to cart"
              nextTo={CUSTOMER_PATHS.cart}
            />
          }
        />
        <Route
          path={CUSTOMER_PATHS.orders.slice(1)}
          element={
            <CustomerPlaceholder
              eyebrow="ORDER HISTORY"
              title="Your orders"
              task="Review previous orders."
              status="Order history is not connected yet, so no saved orders are shown."
              nextLabel="Back to the home page"
              nextTo={CUSTOMER_PATHS.home}
            />
          }
        />
        <Route
          path={CUSTOMER_PATHS.orderDetail.slice(1)}
          element={
            <CustomerPlaceholder
              eyebrow="ORDER DETAILS"
              title="Order details"
              task="Review the details of a selected order."
              status="Order details and tracking are not connected yet."
              nextLabel="View orders"
              nextTo={CUSTOMER_PATHS.orders}
            />
          }
        />
        <Route
          path={CUSTOMER_PATHS.magicMirror.slice(1)}
          element={
            <CustomerPlaceholder
              eyebrow="MAGIC MIRROR"
              title="A little help finding your fit."
              task="Get help exploring items that suit you."
              status="Magic Mirror is not connected yet. No photos or personal data are collected."
              nextLabel="Browse products"
              nextTo={CUSTOMER_PATHS.products}
            />
          }
        />
        <Route path="*" element={<CustomerNotFound />} />
      </Route>
    </Routes>
  )
}
