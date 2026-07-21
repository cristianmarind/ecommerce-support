import { TicketCategory } from '../../domain/tickets/ticket-category.enum';

export interface ManualContent {
  titulo: string;
  contenido: string[];
}

/**
 * Contenido de los manuales de resolución por categoría — la base de
 * conocimiento que indexa ManualsIndexingService y consulta el RAG. Tipado
 * contra las keys de TicketCategory para que si se agrega/renombra una
 * categoría, TypeScript obligue a mantener este mapa sincronizado.
 */
export const MANUALS_CONTENT: Record<keyof typeof TicketCategory, ManualContent> = {
  BILLING: {
    titulo: 'Manual de Resolucion: FACTURACION',
    contenido: [
      "1. Error de Cobro Duplicado: Si el cliente reporta un cargo doble, verificar el ID de transacción en la pasarela de pagos. Si el estado es 'PENDING', el banco liberará el dinero en 48 horas. Si es 'SUCCESS', generar un reembolso inmediato desde el panel administrador.",
      '2. Modificación de Facturas: Las facturas emitidas no se pueden editar después de 72 horas de la compra. Si el cliente requiere cambios en el RFC o TAX ID, se debe cancelar la factura original y emitir una nota de crédito.',
      '3. Fallo en Pasarela de Pago (Error 502): Indicar al usuario que limpie las cookies o intente con una ventana de incógnito. Si el error persiste, el módulo de Stripe está en mantenimiento y el tiempo de resolución estimado es de 30 minutos.',
    ],
  },
  SHIPPING: {
    titulo: 'Manual de Resolucion: ENVIOS',
    contenido: [
      '1. Paquete Demorado o Estancado: Si el rastreo no muestra actualizaciones por más de 4 días hábiles, abrir un ticket de reclamo interno con DHL/FedEx. Notificar al cliente que recibirá una resolución o un nuevo envío en un plazo máximo de 72 horas.',
      '2. Cambio de Dirección de Entrega: Solo está permitido si el paquete no ha salido del centro de distribución central. Si ya fue recolectado por la paquetería, el cliente debe gestionar el cambio directamente con el transportista usando su código de seguimiento.',
      '3. Cobertura Extendida: Para entregas en zonas rurales o de difícil acceso, el tiempo de entrega estándar se amplía de 3 a 7 días hábiles adicionales. No aplica reembolso por retraso en estas zonas.',
    ],
  },
  RETURNS: {
    titulo: 'Manual de Resolucion: DEVOLUCIONES',
    contenido: [
      '1. Plazo de Devolución Estándar: El cliente tiene un máximo de 30 días naturales a partir de la fecha de entrega para solicitar una devolución. El artículo debe conservar sus etiquetas originales y no mostrar señales de uso.',
      "2. Costo de la Guía de Retorno: Si la devolución es por un defecto de fábrica o error de empaque, la empresa absorbe el costo. Si es por insatisfacción o cambio de talla, se descontarán $5 USD del reembolso final por concepto de logística inversa.",
      "3. Productos No Retornables: Por motivos de higiene, no se aceptan devoluciones en ropa interior, trajes de baño, cosméticos abiertos ni artículos adquiridos en la sección de 'Liquidación Final'.",
    ],
  },
  TECHNICAL: {
    titulo: 'Manual de Resolucion: TECNICO',
    contenido: [
      "1. Error en Aplicación de Cupones: Si un cupón válido arroja el error 'Código Expirado', verificar que el carrito cumpla con el monto mínimo de compra. Si las reglas son correctas, limpiar la caché de Redis del servidor de checkout.",
      "2. Restablecimiento de Cuentas Bloqueadas: Las cuentas se bloquean tras 5 intentos fallidos de contraseña. El sistema envía automáticamente un enlace de desbloqueo. Si el correo no llega, el agente de soporte puede desbloquearla manualmente cambiando el estado del usuario a 'ACTIVE' en la base de datos.",
      "3. Enlaces de Descarga de Productos Digitales: Los enlaces de productos digitales expiran automáticamente 72 horas después de la compra. Para reactivarlos, buscar la orden de compra y hacer clic en el botón 'Regenerar Token de Descarga'.",
    ],
  },
  GENERAL: {
    titulo: 'Manual de Resolucion: GENERAL',
    contenido: [
      '1. Horarios de Atención al Cliente: El canal de chat en vivo opera de lunes a viernes de 08:00 a 20:00 horas (EST). Fuera de este horario, las consultas se derivan al sistema de tickets por correo electrónico con respuesta en 24 horas.',
      '2. Política de Privacidad de Datos: Está estrictamente prohibido solicitar contraseñas, números completos de tarjetas de crédito o identificaciones oficiales a través del chat de soporte. Usar siempre tokens de validación seguros.',
      "3. Reporte de Fraude o Suplantación: Si se sospecha que una cuenta ha sido comprometida, el agente debe suspender temporalmente el perfil (estado 'SUSPENDED') y escalar el caso de inmediato al equipo de Seguridad Informática.",
    ],
  },
};
