import { Outlet } from 'react-router-dom'
import { Footer, Header } from '../components/layout'

export default function PublicLayout() {
  return (
    <>
      <Header variant="guest" />
      <Outlet />
      <Footer />
    </>
  )
}
