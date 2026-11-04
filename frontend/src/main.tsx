import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { About, Settings } from './pages/AboutSettings'
import { Categories, Enquiries, Products } from './pages/CrudPages'
import { PublicLayout } from './components/PublicLayout'
import { AboutPage, ContactPage, Home, NotFound, ProductDetail, ProductsPage } from './pages/PublicPages'
import './styles.css'
import './home.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useRealtimeSync } from './hooks/useRealtimeSync'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 2 } } })
function App() { useRealtimeSync(); return <Routes><Route element={<PublicLayout />}><Route path="/" element={<Home />} /><Route path="/products" element={<ProductsPage />} /><Route path="/products/:slug" element={<ProductDetail />} /><Route path="/about" element={<AboutPage />} /><Route path="/contact" element={<ContactPage />} /><Route path="*" element={<NotFound />} /></Route><Route path="/admin/login" element={<Login />} /><Route path="/admin/forgot-password" element={<ForgotPassword />} /><Route path="/admin/reset-password" element={<ResetPassword />} /><Route element={<ProtectedRoute />}><Route element={<AdminLayout />}><Route path="/admin" element={<Dashboard />} /><Route path="/admin/categories" element={<Categories />} /><Route path="/admin/products" element={<Products />} /><Route path="/admin/about" element={<About />} /><Route path="/admin/enquiries" element={<Enquiries />} /><Route path="/admin/settings" element={<Settings />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes> }
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><HelmetProvider><QueryClientProvider client={queryClient}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></HelmetProvider></ErrorBoundary></React.StrictMode>)
