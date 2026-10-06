import db from "../config/database.js";
import { CrearPedidoInput, DetallePedido, Pedido, PedidoConDetalles, PedidoResumen } from "../types/pedidos.js";

export const PedidoModel = {
  // Model 1: obtener todos los pedidos con datos del usuario y sus items
  getAll: async(): Promise<PedidoResumen[]> => {
    const pedidos = await db('pedidos as p')
      .select(
        'p.id as pedido_id',
        'p.fecha',
        'p.estado',
        'u.id as usuario_id',
        'u.nombre as usuario_nombre',
        'u.apellido as usuario_apellido',
        'u.email as usuario_email'
      )
      .innerJoin('usuarios as u', 'p.id_usuario', 'u.id')
      .orderBy('p.id', 'desc');
  
    return pedidos;
  },

  // Model 2: obtener un pedido con la lista completa de sus productos
  getByIdWithDetails: async (id_pedido: number): Promise<PedidoConDetalles | undefined> => {
    const pedido = await db('pedidos as p')
      .select(
        'p.id as pedido_id',
        'p.fecha',
        'p.estado',
        'u.id as usuario_id',
        'u.nombre as cliente_nombre',
        'u.email as cliente_email'
      )
      .innerJoin('usuarios as u', 'p.id_usuario', 'u.id')
      .where('p.id', id_pedido)
      .first();

    if(!pedido) return undefined;

    // Obtenemos todos los productos/detalles asociados a este pedido
    const detalles = await db('detalles_pedidos as dp')
      .select(
        'dp.id as detalle_id',
        'dp.id_producto as producto_id',
        'prod.nombre as producto_nombre',
        'dp.cantidad',
        'dp.precio_unitario',
        db.raw('(dp.cantidad * dp.precio_unitario) as subtotal')
      )
      .innerJoin('productos as prod', 'dp.id_producto', 'prod.id')
      .where('dp.id_pedido', id_pedido);

    const total_pedido = detalles.reduce((acc, item) => acc + Number(item.subtotal), 0);

    return {
      ...pedido,
      total_pedido,
      detalles
    }
  },

  // Model 3: crear un pedido con transaccion ACID
  create: async (datosPedido: CrearPedidoInput): Promise<number> => {
    return await db.transaction(async (trx) => {
      // Paso 1: obtenemos los id de los productos a comprar para consultar stock y precio actual
      const idsProductos = datosPedido.items.map((item) => item.id_producto);

      const productosBD = await trx('productos')
        .select('id', 'nombre', 'precio', 'stock')
        .whereIn('id', idsProductos);

      // Mapeamos los productos para acceso rapido
      const mapaProductos = new Map(productosBD.map((p) => [p.id, p]));

      // Paso 2: validamos la existencia de productos y stock suficiente
      for(const item of datosPedido.items) {
        const prod = mapaProductos.get(item.id_producto);

        if(!prod) {
          throw new Error(`El producto con ID ${item.id_producto} no existe`);
        }

        if(prod.stock < item.cantidad) {
          throw new Error(
            `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}.`
          );
        }
      }

      // Paso 3: insertamos la cabecera del pedido
      const nuevoPedido: Pedido = {
        id_usuario: datosPedido.id_usuario,
        estado: 'completado'
      }
      
      const [pedidoInsertado] = await trx('pedidos')
        .insert(nuevoPedido)
        .returning('id');

      const id_pedido = typeof nuevoPedido == 'object' ? nuevoPedido.id! : pedidoInsertado;
      
      // Paso 4: preparamos e insertamos los detalles y actualizamos el stock de cada producto
      for(const item of datosPedido.items) {
        const prod = mapaProductos.get(item.id_producto)!;

        // Insertamos el detalle usando el precio historico al momento de la compra
        const nuevoDetalle: DetallePedido = {
          id_pedido,
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_unitario: prod.precio
        }
        
        await trx('detalles_pedidos').insert(nuevoDetalle);

        // Descontamos el stock atomicamente
        await trx('productos')
          .where('id', item.id_producto)
          .decrement('stock', item.cantidad);
      }

      // Si todo sale bien, la transaccion se confirma automaticamente el callback
      return id_pedido;
    })
  },

  // Model 4: cancelar un pedido y reponer el stock
  cancel: async (id_pedido: number): Promise<boolean> => {
    return await db.transaction(async (trx) => {
      // Paso 1: Obtenemos el pedido y verificamos el estado
      const pedido = await trx('pedidos')
        .select('id', 'estado')
        .where('id', id_pedido)
        .first();
      
      if(!pedido) throw new Error(`El pedido con ID ${id_pedido} no existe.`);

      if(pedido.estado === 'cancelado') {
        throw new Error(`El pedido con ID ${id_pedido} ya se encuentra cancelado.`);
      }

      // Paso 2: Obtenemos todos los productos comprados en este pedido
      const detalles = await trx('detalles_pedidos')
        .select('id_producto', 'cantidad')
        .where('id_pedido', id_pedido);

      // Paso 3: Reponemos el stock en la tabla de productos
      for(const item of detalles) {
        await trx('productos')
          .where('id', item.id_producto)
          .increment('stock', item.cantidad);
      }

      // Paso 4: Actualizamos el estado del pedido a 'cancelado'
      await trx('pedidos')
        .where('id', id_pedido)
        .update({estado: 'cancelado'});

      return true;
    })
  }
  
  
}
