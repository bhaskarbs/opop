import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import StyleGuidePage from './pages/dev/StyleGuidePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dev/style-guide" element={<StyleGuidePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
