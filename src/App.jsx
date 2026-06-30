import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard           from './modules/auth/AuthGuard'
import LoginPage           from './modules/auth/LoginPage'
import Layout              from './shared/Layout'
import HomePage            from './modules/stock/HomePage'
import InventarioPage      from './modules/stock/InventarioPage'
import EntradaStockPage    from './modules/stock/EntradaStockPage'
import SalidaStockPage     from './modules/stock/SalidaStockPage'
import MovimientosPage     from './modules/stock/MovimientosPage'
import ClientesPage        from './modules/clientes/ClientesPage'
import ClienteFormPage     from './modules/clientes/ClienteFormPage'
import ClienteDetallePage  from './modules/clientes/ClienteDetallePage'
import NuevoFiadoPage      from './modules/clientes/NuevoFiadoPage'
import ResumenPage         from './modules/stock/ResumenPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<AuthGuard><Navigate to="/inicio" replace /></AuthGuard>} />

        <Route path="/inicio" element={
          <AuthGuard><Layout><HomePage /></Layout></AuthGuard>
        } />
        <Route path="/inventario" element={
          <AuthGuard><Layout><InventarioPage /></Layout></AuthGuard>
        } />
        <Route path="/entrada" element={
          <AuthGuard><Layout><EntradaStockPage /></Layout></AuthGuard>
        } />
        <Route path="/salida" element={
          <AuthGuard><Layout><SalidaStockPage /></Layout></AuthGuard>
        } />
        <Route path="/historial" element={
          <AuthGuard><Layout><MovimientosPage /></Layout></AuthGuard>
        } />

        <Route path="/resumen" element={
          <AuthGuard><Layout><ResumenPage /></Layout></AuthGuard>
        } />

        {/* Módulo Clientes / Fiado */}
        <Route path="/clientes" element={
          <AuthGuard><Layout><ClientesPage /></Layout></AuthGuard>
        } />
        <Route path="/clientes/nuevo" element={
          <AuthGuard><Layout><ClienteFormPage /></Layout></AuthGuard>
        } />
        <Route path="/clientes/:id" element={
          <AuthGuard><Layout><ClienteDetallePage /></Layout></AuthGuard>
        } />
        <Route path="/clientes/:id/editar" element={
          <AuthGuard><Layout><ClienteFormPage /></Layout></AuthGuard>
        } />
        <Route path="/clientes/:id/fiado" element={
          <AuthGuard><Layout><NuevoFiadoPage /></Layout></AuthGuard>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
