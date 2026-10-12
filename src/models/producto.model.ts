import { id } from 'zod/locales';
import db from '../config/database.js';
import { Producto } from '../types/index.js';
import { FiltrosProducto } from '../types/productos.js';

const ProductoModel = {

  // Consulta 1: obtener todos los productos con filtros
  getAll: async (filtros: FiltrosProducto): Promise<Producto[]> => {
    const {min_precio, nombre, orden, limite, pagina } = filtros;

    // 1. Iniciamos la consulta base con knex (Query Builder)
    const query = db('productos as p')
      .select(
        'p.*',
        'c.nombre as categoria_nombre',
        'f.nombre as fabricante_nombre'
      )
      .leftJoin('categorias as c', 'p.id_categoria', 'c.id')
      .leftJoin('fabricantes as f', 'p.id_fabricante', 'f.id')
      .where('p.activo', 1);

    // 2. Filtros dinamicos
    if(min_precio){
      query.where('p.precio', '>=', min_precio);
    }

    if(nombre){
      query.where('p.nombre', 'like', `%${nombre}%`);
    }

    // 3. Ordenamiento
    if(orden === 'caro') {
      query.orderBy('p.precio', 'desc');
    } else if(orden === 'barato') {
      query.orderBy('p.precio', 'asc');
    } else if(orden === 'nombre') {
      query.orderBy('p.nombre', 'asc');
    }

    // 4. Paginacion con '.limit()' y '.offset()'
    const resPorPagina = Number(limite) || 5;
    const pagActual = Number(pagina) || 1;
    const offset = (pagActual - 1) * resPorPagina;

    query.limit(resPorPagina).offset(offset);

    // 5. Ejecutamos la consulta y retornamos el resultado directo
    const productos = await query;
    return productos as Producto[];
  },

  // Consulta 2: obtener un producto por ID
  getById: async (id: number): Promise<Producto | undefined> => {
    const fila = await db<Producto>('productos as p')
      .select(
        'p.*',
        'c.nombre as categoria',
      )
      .leftJoin('categorias as c', 'p.id_categoria', 'c.id')
      .where('p.id','=', id).andWhere('p.activo', '=', 1)
      .first();

    return fila;
  },

  // Consulta 3: para buscar producto por nombre exacto
  getByName: async(nombre: string): Promise<Producto | undefined> => {
    const fila = await db<Producto>('productos')
      .where('nombre', nombre)
      .andWhere('activo', 1)
      .first();

    return fila;
  },

  // Consulta 4: agregar un nuevo producto
  create: async(producto: Omit<Producto, 'id'>): Promise<number | undefined> => {
    const {nombre, precio, stock, id_categoria, id_fabricante} = producto

    const [nuevoId] = await db('productos').insert({
      nombre, precio, stock, id_categoria, id_fabricante, activo: 1
    });

    return nuevoId;
  },

  // Consulta 5: actualizar los datos del producto
  update: async (id:number, datos: Omit<Producto, 'id'>): Promise<number> => {
    const {nombre, precio, stock, id_categoria, id_fabricante} = datos;

    const fila = await db('productos')
      .where('id', id)
      .andWhere('activo', 1)
      .update({nombre, precio, stock, id_categoria, id_fabricante});
    
      return fila;
  },

  // Consulta 6: actualizar un dato en especifico
  updatePartial: async (id:number, campos: Partial<Producto>): Promise<number> => {
    const filas = await db('productos')
      .where('id', id)
      .andWhere('activo', 1)
      .update(campos);
    
    return filas;
  },

  // consulta 7: ocultar un producto
  updateState: async (id: number): Promise<number> => {
    const filas = await db('productos')
      .where('id', id)
      .andWhere('activo', 1)
      .update({activo: 0});

    return filas;
  },

  // Consulta 8: buscar cualquier producto (activo o no)
  getAnyById: async(id: number): Promise<Producto | undefined> => {
    const filas = await db<Producto>('productos as p')
      .select(
        'p.*',
        'c.nombre as categoria'
      )
      .leftJoin('categoria as c', 'p.id_categoria', 'c.id')
      .where('p.id', id)
      .first();

    return filas
  },

  // Consulta 9: cambiar activo a 1 un producto ocultado
  restoreState: async (id:number): Promise<number> => {
    const fila = await db('productos')
      .where('id', id)
      .update({activo: 1});
    
    return fila;
  },

  // Consulta 10: Borrar un producto permanentemente por id
  delete: async (id:number): Promise<number> => {
    const fila = await db('productos')
      .where('id', id)
      .delete();

    return fila;
  },

  // Consulta 11: Borrar todos los productos de la db
  deleteAll: async(): Promise<number> => {
    const filas = await db('productos').del();
    return filas;
  }

}

export default ProductoModel;