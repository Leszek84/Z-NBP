import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'
import DetailsPage from './pages/DetailsPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/token/:network/:poolAddress" element={<DetailsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
