/**
 * Vista de ventas de cacao, caja diaria y directorio de clientes.
 * Permite registrar ventas (con ingreso automático a caja), registrar egresos/gastos,
 * administrar clientes compradores y generar tickets o facturas imprimibles en PDF.
 */
import React, { useEffect, useState } from 'react';
import { Wallet, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Plus, Printer, CheckCircle2, DollarSign, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { Finca, Cliente, Venta, MovimientoCaja, TipoProductoCacao, MetodoPago, CategoriaGasto, EstadoCalidad } from '../types';
import { VoiceHelpButton } from './VoiceHelpButton';
import { voiceAssistant } from '../services/voiceAssistant';

/** Propiedades esperadas por el componente VentasCajaView. */
interface VentasCajaViewProps {
  fincas: Finca[];
  clientes: Cliente[];
  ventas: Venta[];
  caja: MovimientoCaja[];
  onAddVenta: (venta: Omit<Venta, 'id'>) => void;
  onAddGastoCaja: (movimiento: Omit<MovimientoCaja, 'id'>) => void;
  onAddCliente: (cliente: Omit<Cliente, 'id'>) => void;
  currentUserName: string;
  quickOpenSaleModal?: boolean;
  quickOpenExpenseModal?: boolean;
}

export const VentasCajaView: React.FC<VentasCajaViewProps> = ({
  fincas,
  clientes,
  ventas,
  caja,
  onAddVenta,
  onAddGastoCaja,
  onAddCliente,
  currentUserName,
  quickOpenSaleModal = false,
  quickOpenExpenseModal = false
}) => {
  // Estados de navegación interna (subpestañas) y visibilidad de modales
  const [subTab, setSubTab] = useState<'ventas_caja' | 'historial_ventas' | 'clientes'>('ventas_caja');
  const [showSaleModal, setShowSaleModal] = useState(quickOpenSaleModal);
  const [showExpenseModal, setShowExpenseModal] = useState(quickOpenExpenseModal);
  const [showAddClienteModal, setShowAddClienteModal] = useState(false);
  const [printedVentaTicket, setPrintedVentaTicket] = useState<Venta | null>(null);
  const [invoiceVenta, setInvoiceVenta] = useState<Venta | null>(null);

  // Estados del formulario de registro de venta
  const [clienteNombreSale, setClienteNombreSale] = useState<string>(clientes[0]?.nombre || '');
  const [fincaIdSale, setFincaIdSale] = useState<string>(fincas[0]?.id || '');
  const [tipoProdSale, setTipoProdSale] = useState<TipoProductoCacao>('cacao_seco_premium');
  const [kilosVendidos, setKilosVendidos] = useState<string>('150');
  const [precioPorKg, setPrecioPorKg] = useState<string>('22500'); // $22.500 COP
  const [estadoCalidadSale, setEstadoCalidadSale] = useState<EstadoCalidad>('buen_estado');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');

  // Estados del formulario de registro de gasto/egreso en caja
  const [conceptoGasto, setConceptoGasto] = useState<string>('Pago 2 Jornales de Recolección');
  const [montoGasto, setMontoGasto] = useState<string>('160000');
  const [categoriaGasto, setCategoriaGasto] = useState<CategoriaGasto>('pago_jornales');
  const [registradoPor, setRegistradoPor] = useState<string>('Don Jose Ignacio Gómez');

  // Estados del formulario para agregar un nuevo cliente/comprador
  const [nombreClienteNew, setNombreClienteNew] = useState('');
  const [docClienteNew, setDocClienteNew] = useState('');
  const [telClienteNew, setTelClienteNew] = useState('');
  const [tipoClienteNew, setTipoClienteNew] = useState<'cooperativa' | 'intermediario' | 'empresa_chocolate' | 'particular'>('cooperativa');

  // Abre automáticamente el modal de venta cuando se solicita desde un acceso rápido externo
  useEffect(() => {
    if (quickOpenSaleModal) {
      setShowSaleModal(true);
    }
  }, [quickOpenSaleModal]);

  // Abre automáticamente el modal de gasto cuando se solicita desde un acceso rápido externo
  useEffect(() => {
    if (quickOpenExpenseModal) {
      setShowExpenseModal(true);
    }
  }, [quickOpenExpenseModal]);

  // Cálculo automático del total de la venta en pesos colombianos (COP)
  const kilosNum = parseFloat(kilosVendidos) || 0;
  const precioNum = parseFloat(precioPorKg) || 0;
  const totalVentaCOP = kilosNum * precioNum;

  // Totales acumulados de la caja diaria (ingresos, egresos y saldo neto)
  const ingresosCaja = caja.filter(c => c.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
  const egresosCaja = caja.filter(c => c.tipo === 'egreso').reduce((a, b) => a + b.monto, 0);
  const saldoNetoCaja = ingresosCaja - egresosCaja;

  // Formatea un valor numérico como moneda colombiana (COP) sin decimales
  const formatCOP = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(monto);
  };

  // Genera una ventana emergente con el HTML de la factura lista para imprimir o guardar como PDF
  const openInvoiceWindow = (venta: Venta) => {
    const cliente = clientes.find((c) => c.id === venta.clienteId);
    const clienteFactura = cliente?.nombre || venta.clienteNombre || 'Cliente';
    const finca = fincas.find((f) => f.id === venta.fincaId);
    const invoiceHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Factura ${venta.comprobanteNumero || venta.id}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #111827; background: #f7f3e8; }
    .sheet { max-width: 820px; margin: 0 auto; background: white; border: 2px solid #1f2937; border-radius: 18px; padding: 28px; }
    .top { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; border-bottom: 2px solid #d6c7a1; padding-bottom: 16px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 28px; }
    .muted { color: #6b7280; font-size: 12px; }
    table { width:100%; border-collapse: collapse; margin-top: 14px; }
    td { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .right { text-align:right; }
    .total { font-size: 20px; font-weight: 800; border-top: 2px solid #111827; padding-top: 12px; margin-top: 12px; }
    .badge { display:inline-block; padding: 6px 10px; border-radius: 999px; background:#166534; color:white; font-weight:700; font-size:12px; }
    .footer { margin-top: 24px; font-size: 12px; color:#6b7280; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div>
        <div class="badge">FACTURA DE CACAO</div>
        <h1>ADSO Cacao</h1>
        <div class="muted">Sistema de Gestión de Cacao para productor rural</div>
      </div>
      <div class="right">
        <div><strong>No.:</strong> ${venta.comprobanteNumero || venta.id}</div>
        <div><strong>Fecha:</strong> ${venta.fecha}</div>
      </div>
    </div>
    <table>
      <tr><td>Comprador</td><td class="right">${clienteFactura}</td></tr>
      <tr><td>Documento</td><td class="right">${cliente?.documento || 'N/A'}</td></tr>
      <tr><td>Finca</td><td class="right">${finca?.nombre || 'General'}</td></tr>
      <tr><td>Producto</td><td class="right">${venta.tipoProducto}</td></tr>
      <tr><td>Kilos vendidos</td><td class="right">${venta.kilosVendidos} Kg</td></tr>
      <tr><td>Precio por Kg</td><td class="right">${formatCOP(venta.precioPorKg)}</td></tr>
      <tr><td>Método de pago</td><td class="right">${venta.metodoPago}</td></tr>
    </table>
    <div class="total">TOTAL A PAGAR: ${formatCOP(venta.totalVenta)}</div>
    <div class="footer">
      Factura generada por ADSO Cacao. Puedes guardarla como PDF desde la ventana de impresión.
    </div>
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=900,height=900');
    if (!win) return;
    win.document.open();
    win.document.write(invoiceHtml);
    win.document.close();
  };

  // Valida y registra una nueva venta de cacao con comprobante generado y aviso por voz
  const handleRegisterSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (kilosNum <= 0 || precioNum <= 0) return;

    const clienteNombre = clienteNombreSale.trim();
    const clienteObj = clientes.find(c => c.nombre.toLowerCase() === clienteNombre.toLowerCase());
    const nuevaVenta = {
      clienteId: clienteObj?.id || `cli-venta-${Date.now()}`,
      clienteNombre,
      fincaId: fincaIdSale,
      fecha: new Date().toISOString().split('T')[0],
      tipoProducto: tipoProdSale,
      kilosVendidos: kilosNum,
      precioPorKg: precioNum,
      totalVenta: totalVentaCOP,
      estadoCalidad: estadoCalidadSale,
      estadoVenta: 'confirmada' as const,
      metodoPago,
      pagado: true,
      comprobanteNumero: `FAC-${Math.floor(1000 + Math.random() * 9000)}`
    };

    onAddVenta(nuevaVenta);

    voiceAssistant.speak(
      `¡Venta registrada con éxito! Vendiste ${kilosNum} kilos por un valor de ${totalVentaCOP} pesos a ${clienteObj?.nombre || clienteNombre || 'cliente'}. El dinero ingresó automáticamente a la caja diaria.`
    );

    setShowSaleModal(false);
  };

  // Valida y registra un egreso (gasto) en la caja diaria con confirmación por voz
  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoGasto) || 0;
    if (monto <= 0) return;

    onAddGastoCaja({
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'egreso',
      concepto: conceptoGasto,
      monto,
      categoria: categoriaGasto,
      registradoPor: currentUserName
    });

    voiceAssistant.speak(`Gasto registrado en la caja diaria por ${monto} pesos en concepto de ${conceptoGasto}.`);

    setShowExpenseModal(false);
  };

  // Crea un nuevo cliente/comprador en el directorio y limpia el formulario
  const handleCreateCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreClienteNew.trim()) return;

    onAddCliente({
      nombre: nombreClienteNew,
      documento: docClienteNew || 'N/A',
      telefono: telClienteNew || 'Sin teléfono',
      tipoCliente: tipoClienteNew,
      municipio: 'San Vicente de Chucurí'
    });

    voiceAssistant.speak(`Cliente ${nombreClienteNew} guardado en el directorio.`);
    setShowAddClienteModal(false);
    setNombreClienteNew('');
  };

  // Texto descriptivo leído por el botón de ayuda por voz del módulo
  const cajaAudioReadout = `Módulo de ventas y caja diaria. El saldo actual de tu caja es de ${saldoNetoCaja} pesos, con un total de ingresos por ${ingresosCaja} pesos y egresos por ${egresosCaja} pesos. Al registrar una venta, el valor se suma automáticamente a la caja.`;

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      
      {/* Top Header */}
      <div className="bg-gradient-to-r from-lime-950 via-emerald-950 to-stone-950 border-4 border-lime-700 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-lime-400 text-lime-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase">
              DINERO Y VENTAS
            </span>
            <span className="text-lime-200 text-xs font-bold">Tablas: Clientes, Ventas y Caja Diario</span>
          </div>
          <h2 className="text-3xl font-black font-serif text-lime-100 flex items-center gap-2">
            <Wallet className="w-8 h-8 text-lime-300" />
            Ventas y Caja Diaria
          </h2>
          <p className="text-lime-200 text-sm mt-1">
            Registra la venta a cooperativas o compradores y observa el reflejo automático inmediato en el dinero del día.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <VoiceHelpButton
            textToRead={cajaAudioReadout}
            size="md"
          />
          <button
            type="button"
            onClick={() => setShowSaleModal(true)}
            className="px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-emerald-950 font-black text-base flex items-center gap-2 shadow-xl border-2 border-emerald-200 cursor-pointer"
          >
            <TrendingUp className="w-6 h-6 stroke-[3]" />
            <span>+ Registrar Venta</span>
          </button>
        </div>
      </div>

      {/* METRICAS DE CAJA Y BALANCE DEL DÍA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Saldo Neto */}
        <div className="bg-lime-900 text-lime-50 border-4 border-lime-600 p-6 rounded-3xl shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-lime-300 uppercase">Saldo Actual en Caja</span>
            <h3 className="text-3xl sm:text-4xl font-black text-white mt-1">{formatCOP(saldoNetoCaja)}</h3>
            <span className="text-xs font-semibold text-lime-200">Dinero disponible en la finca</span>
          </div>
          <div className="p-3 bg-lime-800 rounded-2xl border-2 border-lime-500 text-lime-200">
            <Wallet className="w-8 h-8" />
          </div>
        </div>

        {/* Ingresos Total */}
        <div className="bg-emerald-50 border-4 border-emerald-600 p-6 rounded-3xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-emerald-900 uppercase">Total Ingresos (+ Ventas)</span>
            <h3 className="text-3xl font-black text-emerald-950 mt-1">{formatCOP(ingresosCaja)}</h3>
            <span className="text-xs font-bold text-emerald-800">Entradas por ventas de cacao</span>
          </div>
          <div className="p-3 bg-emerald-200 rounded-2xl border-2 border-emerald-400 text-emerald-950">
            <ArrowUpRight className="w-8 h-8" />
          </div>
        </div>

        {/* Egresos Total */}
        <div className="bg-rose-50 border-4 border-rose-600 p-6 rounded-3xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-rose-900 uppercase">Total Egresos (- Gastos)</span>
            <h3 className="text-3xl font-black text-rose-950 mt-1">{formatCOP(egresosCaja)}</h3>
            <span className="text-xs font-bold text-rose-800">Pagos de jornales, abonos, fletes</span>
          </div>
          <div className="p-3 bg-rose-200 rounded-2xl border-2 border-rose-400 text-rose-950">
            <ArrowDownRight className="w-8 h-8" />
          </div>
        </div>

      </div>

      {/* SECTOR DE ACCIONES RÁPIDAS Y NAVEGACIÓN SECUNDARIA */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border-3 border-stone-300 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('ventas_caja')}
            className={`px-4 py-2 rounded-xl font-extrabold text-sm border-2 cursor-pointer transition-all ${
              subTab === 'ventas_caja'
                ? 'bg-lime-800 text-white border-lime-950 shadow-md'
                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
            }`}
          >
            💰 Movimientos de Caja y Ventas
          </button>
          <button
            onClick={() => setSubTab('historial_ventas')}
            className={`px-4 py-2 rounded-xl font-extrabold text-sm border-2 cursor-pointer transition-all ${
              subTab === 'historial_ventas'
                ? 'bg-lime-800 text-white border-lime-950 shadow-md'
                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
            }`}
          >
            📋 Historial de Ventas ({ventas.length})
          </button>
          <button
            onClick={() => setSubTab('clientes')}
            className={`px-4 py-2 rounded-xl font-extrabold text-sm border-2 cursor-pointer transition-all ${
              subTab === 'clientes'
                ? 'bg-lime-800 text-white border-lime-950 shadow-md'
                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
            }`}
          >
            👥 Directorio de Clientes ({clientes.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowExpenseModal(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-sm flex items-center gap-1.5 shadow-md border border-rose-900 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>- Registrar Gasto (Jornal/Insumos)</span>
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN SUBTAB */}
      {subTab === 'ventas_caja' || subTab === 'historial_ventas' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TABLA DE VENTAS REALIZADAS */}
          <div className="bg-white border-3 border-stone-300 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
              <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
                {subTab === 'historial_ventas' ? 'Historial de Ventas' : 'Ventas de Cacao Registradas'}
              </h3>
              <VoiceHelpButton
                textToRead="Lista de ventas realizadas. Muestra a qué cliente se vendió y el valor recibido."
                size="sm"
              />
            </div>

            <div className="space-y-3">
              {ventas.length === 0 && (
                <div className="p-4 rounded-2xl border-2 border-dashed border-stone-300 text-center text-sm text-stone-600 font-semibold bg-stone-50">
                  Todavía no hay ventas registradas. Usa “Registrar Venta” para empezar a sumar dinero a la caja.
                </div>
              )}
              {ventas.map((v) => {
                const cliente = clientes.find(c => c.id === v.clienteId);
                const clienteVisible = cliente?.nombre || v.clienteNombre || 'Cliente';
                const finca = fincas.find(f => f.id === v.fincaId);

                return (
                  <div key={v.id} className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-300 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded">
                          {v.comprobanteNumero || 'VENTA'}
                        </span>
                        <h4 className="text-lg font-black text-stone-900 mt-1">{clienteVisible}</h4>
                        <p className="text-xs font-bold text-stone-600">
                          Finca: {finca?.nombre || 'General'} | Fecha: {v.fecha}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-950 block">{formatCOP(v.totalVenta)}</span>
                        <span className="text-xs font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                          {v.kilosVendidos} Kg @ {formatCOP(v.precioPorKg)}/Kg · {v.estadoCalidad === 'mal_estado' ? 'Mal estado' : 'Buen estado'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200 text-xs font-bold text-stone-700">
                      <span>Método: {v.metodoPago.toUpperCase()}</span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setPrintedVentaTicket(v)}
                          className="text-emerald-800 underline hover:text-emerald-950 flex items-center gap-1 cursor-pointer font-black"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Ver Ticket
                        </button>
                        <button
                          onClick={() => setInvoiceVenta(v)}
                          className="text-lime-800 underline hover:text-lime-950 flex items-center gap-1 cursor-pointer font-black"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Factura PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LIBRO DE CAJA DIARIA (INGRESOS Y EGRESOS) */}
          <div className="bg-white border-3 border-stone-300 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
              <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-lime-700" />
                Libro de Caja Diaria (Entradas y Salidas)
              </h3>
              <VoiceHelpButton
                textToRead="Libro de caja diaria. Muestra cada peso ingresado por venta o gastado en la finca."
                size="sm"
              />
            </div>

            <div className="space-y-3">
              {caja.length === 0 && (
                <div className="p-4 rounded-2xl border-2 border-dashed border-stone-300 text-center text-sm text-stone-600 font-semibold bg-stone-50">
                  Aún no hay movimientos en caja. Cuando registres una venta o un gasto, aparecerá aquí.
                </div>
              )}
              {caja.map((mov) => (
                <div 
                  key={mov.id} 
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-between ${
                    mov.tipo === 'ingreso'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        mov.tipo === 'ingreso' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}>
                        {mov.tipo}
                      </span>
                      <span className="text-xs font-bold text-stone-500">{mov.fecha}</span>
                    </div>
                    <p className="font-extrabold text-stone-900 text-sm mt-1">{mov.concepto}</p>
                    <p className="text-[11px] font-semibold text-stone-600">Por: {mov.registradoPor}</p>
                  </div>

                  <div className="text-right font-black text-lg">
                    {mov.tipo === 'ingreso' ? '+' : '-'}{formatCOP(mov.monto)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* DIRECTORIO DE CLIENTES */
        <div className="bg-white border-3 border-stone-300 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
            <div>
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                <Users className="w-7 h-7 text-lime-800" />
                Clientes y Compradores de Cacao
              </h3>
              <p className="text-xs text-stone-600 font-bold">
                Cooperativas, intermediarios y compradores frecuentes.
              </p>
            </div>

            <button
              onClick={() => setShowAddClienteModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-lime-700 hover:bg-lime-600 text-white font-black text-sm flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              + Agregar Cliente
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-stone-50 border-2 border-stone-300 space-y-2">
                <span className="bg-amber-100 text-amber-900 text-xs font-black px-2 py-0.5 rounded uppercase">
                  {c.tipoCliente}
                </span>
                <h4 className="text-lg font-black text-stone-900">{c.nombre}</h4>
                <p className="text-xs text-stone-600 font-semibold">NIT/CC: {c.documento}</p>
                <p className="text-xs text-stone-600 font-semibold">📞 Tel: {c.telefono}</p>
                <p className="text-xs text-stone-600 font-semibold">📍 {c.municipio}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR VENTA (REQUISITO CLAVE Y AUTOMATIZACIÓN DE CAJA) */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-emerald-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b-2 border-emerald-100 pb-2">
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-7 h-7 text-emerald-700" />
                Registrar Nueva Venta de Cacao
              </h3>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="p-1 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSale} className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-extrabold text-stone-800 mb-1">
                  1. ¿A quién le vendiste? (Escribe el nombre del comprador):
                </label>
                <input
                  list="clientes-venta"
                  value={clienteNombreSale}
                  onChange={(e) => setClienteNombreSale(e.target.value)}
                  placeholder="Ej: Cooperativa Cacaotera, Juan Pérez..."
                  className="w-full p-3 rounded-2xl border-2 border-stone-300 font-bold text-lg text-stone-900 bg-white"
                />
                <datalist id="clientes-venta">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </div>

              {/* Finca de Origen */}
              <div>
                <label className="block text-sm font-extrabold text-stone-800 mb-1">
                  2. ¿De qué finca proviene el cacao?:
                </label>
                <select
                  value={fincaIdSale}
                  onChange={(e) => setFincaIdSale(e.target.value)}
                  className="w-full p-3 rounded-2xl border-2 border-stone-300 font-bold text-base text-stone-900 bg-white"
                >
                  {fincas.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Kilos y Precio por Kg */}
              <div>
                <span className="block text-sm font-extrabold text-stone-800 mb-2">Estado del producto:</span>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['buen_estado', 'Buen estado'],
                    ['mal_estado', 'Mal estado']
                  ] as const).map(([value, label]) => (
                    <label key={value} className={`p-3 rounded-2xl border-2 font-black cursor-pointer ${estadoCalidadSale === value ? 'bg-emerald-100 border-emerald-600 text-emerald-950' : 'bg-stone-50 border-stone-300 text-stone-700'}`}>
                      <input
                        type="radio"
                        name="estado-calidad-venta"
                        value={value}
                        checked={estadoCalidadSale === value}
                        onChange={() => setEstadoCalidadSale(value)}
                        className="mr-2"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Kilos y Precio por Kg */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-extrabold text-stone-800 mb-1">
                    Kilos Vendidos (Kg):
                  </label>
                  <input
                    type="number"
                    required
                    step="1"
                    value={kilosVendidos}
                    onChange={(e) => setKilosVendidos(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-emerald-500 font-black text-2xl text-emerald-950"
                  />
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-stone-800 mb-1">
                    Precio por Kg ($ COP):
                  </label>
                  <input
                    type="number"
                    required
                    step="500"
                    value={precioPorKg}
                    onChange={(e) => setPrecioPorKg(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-emerald-500 font-black text-2xl text-emerald-950"
                  />
                </div>
              </div>

              {/* Total Calculado Automático */}
              <div className="bg-emerald-950 text-emerald-100 p-4 rounded-2xl border-2 border-emerald-500 text-center">
                <span className="block text-xs font-bold text-emerald-300 uppercase">VALOR TOTAL DE LA VENTA</span>
                <span className="text-3xl font-black text-emerald-200 block mt-1">{formatCOP(totalVentaCOP)}</span>
                <span className="text-xs text-emerald-300 font-semibold block mt-1">
                  ⚡ Se sumará automáticamente a la caja diaria de hoy.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-4 py-3 rounded-2xl bg-stone-200 font-bold text-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg border-2 border-emerald-900 shadow-xl cursor-pointer"
                >
                  ¡Confirmar Venta!
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR GASTO EN CAJA */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-rose-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
              <ArrowDownRight className="w-6 h-6 text-rose-600" />
              Registrar Salida de Dinero / Gasto
            </h3>

            <form onSubmit={handleRegisterExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800">Concepto del Gasto:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago 2 Jornales de limpia"
                  value={conceptoGasto}
                  onChange={(e) => setConceptoGasto(e.target.value)}
                  className="w-full p-3 rounded-2xl border-2 border-stone-300 font-bold text-base text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800">Monto pagado ($ COP):</label>
                <input
                  type="number"
                  required
                  step="1000"
                  value={montoGasto}
                  onChange={(e) => setMontoGasto(e.target.value)}
                  className="w-full p-3 rounded-2xl border-2 border-rose-400 font-black text-2xl text-rose-950 bg-rose-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800">Categoría:</label>
                <select
                  value={categoriaGasto}
                  onChange={(e) => setCategoriaGasto(e.target.value as CategoriaGasto)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm bg-white"
                >
                  <option value="pago_jornales">Pago de Jornales</option>
                  <option value="insumos_fertilizante">Insumos y Fertilizantes</option>
                  <option value="transporte_flete">Transporte y Fletes</option>
                  <option value="mantenimiento_herramientas">Herramientas y Mantenimiento</option>
                  <option value="alimentacion">Alimentación Trabajo</option>
                  <option value="otros_gastos">Otros Gastos</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-700 text-white font-bold text-sm"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA IMPRIMIR COMPROBANTE DE VENTA */}
      {printedVentaTicket && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-stone-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl font-mono">
            <div className="text-center border-b-2 border-dashed border-stone-400 pb-3">
              <h4 className="text-xl font-black font-sans uppercase">ADSO CACAO</h4>
              <p className="text-xs">COMPROBANTE DE VENTA DE CACAO</p>
              <p className="text-xs">{printedVentaTicket.comprobanteNumero}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span className="font-bold">{printedVentaTicket.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span>Comprador:</span>
                <span className="font-bold">{clientes.find((c) => c.id === printedVentaTicket.clienteId)?.nombre || printedVentaTicket.clienteNombre || 'Cliente'}</span>
              </div>
              <div className="flex justify-between">
                <span>Kilos Vendidos:</span>
                <span className="font-bold">{printedVentaTicket.kilosVendidos} Kg</span>
              </div>
              <div className="flex justify-between">
                <span>Precio / Kg:</span>
                <span className="font-bold">{formatCOP(printedVentaTicket.precioPorKg)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-b py-2 my-2">
                <span>TOTAL RECAUDADO:</span>
                <span>{formatCOP(printedVentaTicket.totalVenta)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setPrintedVentaTicket(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 font-bold text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs flex items-center gap-1"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISTA PREVIA Y GENERACIÓN DE FACTURA PDF */}
      {invoiceVenta && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-lime-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-lime-100 pb-2">
              <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-lime-700" />
                Factura Lista
              </h3>
              <button
                type="button"
                onClick={() => setInvoiceVenta(null)}
                className="p-1 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="bg-lime-50 border-2 border-lime-200 rounded-2xl p-4 space-y-2 text-sm font-bold text-stone-800">
              <p><span className="text-stone-500">Comprador:</span> {clientes.find((c) => c.id === invoiceVenta.clienteId)?.nombre || invoiceVenta.clienteNombre || 'Cliente'}</p>
              <p><span className="text-stone-500">Factura:</span> {invoiceVenta.comprobanteNumero}</p>
              <p><span className="text-stone-500">Fecha:</span> {invoiceVenta.fecha}</p>
              <p><span className="text-stone-500">Kilos:</span> {invoiceVenta.kilosVendidos} Kg</p>
              <p><span className="text-stone-500">Total:</span> {formatCOP(invoiceVenta.totalVenta)}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInvoiceVenta(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 font-bold text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => openInvoiceWindow(invoiceVenta)}
                className="px-5 py-2 rounded-xl bg-lime-700 text-white font-bold text-sm flex items-center gap-1"
              >
                <Printer className="w-4 h-4" />
                Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR CLIENTE */}
      {showAddClienteModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-black text-stone-900">Agregar Nuevo Comprador/Cliente</h3>
            <form onSubmit={handleCreateCliente} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800">Nombre / Razón Social:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cooperativa Cacaotera"
                  value={nombreClienteNew}
                  onChange={(e) => setNombreClienteNew(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800">Cédula / NIT:</label>
                <input
                  type="text"
                  placeholder="Ej: 900.123.456-1"
                  value={docClienteNew}
                  onChange={(e) => setDocClienteNew(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800">Teléfono:</label>
                <input
                  type="text"
                  placeholder="Ej: 310 123 4567"
                  value={telClienteNew}
                  onChange={(e) => setTelClienteNew(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClienteModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold text-sm"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
