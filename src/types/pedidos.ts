// 1. Entidades base de la BD
export interface Pedido {
  id?: number;
  id_usuario: number;
  fecha?: string;
  estado: 'completado' | 'pendiente' | 'cancelado';
}

export interface DetallePedido {
  id?: number;
  id_pedido: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

// 2. DTOs de respuestas para consultas

// Para lista plana de pedidos
export interface PedidoResumen {
  pedido_id: number;
  fecha: string;
  estado: string;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_email: string;
}

// Item de producto dentro de un pedido
export interface DetallePedidoItem {
  detalle_id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

// Pedido completo con sus productos
export interface PedidoConDetalles {
  pedido_id: number;
  fecha: string;
  estado: string;
  usuario_id: number;
  cliente_nombre: string;
  cliente_email: string;
  total_pedido: number;
  detalles: DetallePedidoItem[];
}

// 3. DTO para creacion de pedido 
export interface CrearPedidoItemInput {
  id_producto: number;
  cantidad: number;
}

export interface CrearPedidoInput {
  id_usuario: number;
  items: CrearPedidoItemInput[];
}

// 4. Interfaces para reportes adaptadas
export interface ReportePedidoUsuario {
  usuario_id: number;
  usuario_nombre: string;
  usuario_email: string;
  pedidos_completados: number;
  pedidos_cancelados: number;
  total_gastado: number;
}

export interface ReportePedidoProducto {
  producto_id: number;
  producto_nombre: string;
  unidades_vendidas: number;
  total_recaudado: number;
}

export interface ReportePedidoCategoria {
  categoria_id: number;
  categoria_nombre: string;
  unidades_vendidas: number;
  total_recaudado: number;
}

export interface ReportePedidoPorDia {
  fecha: string;
  total_pedidos: number;
  monto_total: number;
}