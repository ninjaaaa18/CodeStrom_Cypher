import { BrowserRouter } from 'react-router-dom'
import { CustomerRouteMap } from './features/customer/customerRoutes'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <CustomerRouteMap />
    </BrowserRouter>
  )
}

export default App
