import ProductoModel from "../models/producto.model.js";
import CategoriaModel from "../models/categoria.model.js";
import { Producto } from "../types/index.js";
import { FiltrosProducto } from "../types/productos.js";
import { AppError } from "../utils/AppError.js";

const ProductoService = {

  // Service 1: obtener productos procesados
  listaProductos: async(filtros: FiltrosProducto) => {
    const {min_precio, pagina, limite, orden, nombre} = filtros;

    // Validar precio minimo:
    if(min_precio) {
      const precioNum = Number(min_precio);
      if(isNaN(precioNum)) throw new AppError("El precio mínimo debe ser un número válido.", 400);
      if(precioNum < 0) throw new AppError("El precio no puede ser negativo.", 400);
    }

    // Validar paginacion:
    if(pagina) {
      const pagNum = Number(pagina);
      if(isNaN(pagNum) || pagNum <= 0) throw new AppError("La página debe ser un número mayor a 0.", 400);
    }

    // Validar el limite de productos
    if(limite) {
      const limNum = Number(limite);
      if(isNaN(limNum) || limNum <= 0) throw new AppError("El límite debe ser un número positivo.", 400);
      if(limNum > 50) throw new AppError("No puedes solicitar más de 50 productos por página.", 400);
    } 

    // Validar orden:
    const ordenesValidos = ['caro', 'barato', 'nombre'];
    if(orden && !ordenesValidos.includes(orden)) {
      throw new AppError("El tipo de orden no es válido. Usa: caro, barato o nombre.", 400);
    }

    // Validar el nombre
    if(nombre !== undefined) {
      const nombreLimpio = String(nombre).trim();

      if(nombreLimpio.length === 0) throw new AppError("El nombre no puede estar vacio", 400);
      if(nombreLimpio.length > 10) throw new AppError("El nombre es demasiado largo", 400);

      filtros.nombre = nombreLimpio;
    }

    const productos = await ProductoModel.getAll(filtros);

    const hasActiveFilters = Boolean(min_precio || nombre || orden || pagina || limite);

    if(productos.length <= 0 && hasActiveFilters) { 
      throw new AppError("No se encontro ningun producto con los filtros especificados.", 404)
    }

    if(productos.length <= 0) {
      return [];
    }

    return productos.map(p => {
      const datos = p;

      return {
        ...datos,
        estado_stock: p.stock < 5 ? 'Bajo': 'Suficiente'
      }
    });
  },

  // Service 2: obtener productos por el ID
  obtenerProductoID: async (id: string | string[] | undefined) => {
    const idNumerico = Number(id);
    if(isNaN(idNumerico)) throw new AppError("ID no valido", 400)

    const producto = await ProductoModel.getById(idNumerico);
    if(!producto) throw new AppError("Producto no encontrado", 404)

    return producto;
  },

  // Creacion de producto con validacion de negocio
  crearNuevoProducto: async(datos: Producto) => {
    // Verificamos si la categoria existe:
    const existeCat = await CategoriaModel.getById(datos.id_categoria);
    if(!existeCat) throw new AppError("La categoria especificada no existe en el sistema", 404);

    // Verificamos si el nombre ya existe:
    const productoExiste = await ProductoModel.getByName(datos.nombre);
    if(productoExiste) throw new AppError("El nombre del producto ya existe", 400);

    return await ProductoModel.create(datos);
  },

  actualizarProducto: async(id: number, datos: Producto) => {
    // Verificamos si el producto existe:
    const productoActual = await ProductoModel.getById(id);
    if(!productoActual) throw new AppError("El producto que intentas editar no existe.", 404);

    // Verificamos si el nombre ya existe:
    if(datos.nombre !== productoActual.nombre) {
      const duplicado = await ProductoModel.getByName(datos.nombre);
      if(duplicado) throw new AppError("No puedes usar ese nombre, ya pertenece a otro producto.", 400);
    }

    // Verificamos que la categoria actualizada exista:
    const existeCat = await CategoriaModel.getById(datos.id_categoria);
    if(!existeCat) throw new AppError("La categoría especificada no es válida.", 404);

    return await ProductoModel.update(id, datos);
  },

  // Services para validar y actualizar parcialmente un producto
  actualizarParcial: async (id: number, campos: Partial<Producto>) => {
    if(Object.keys(campos).length === 0) throw new AppError("El producto enviado esta vacio", 404)

    const productoActual = await ProductoModel.getById(id);
    if(!productoActual) throw new AppError("No se encontro el producto para actualizar.", 404);

    if(campos.nombre && campos.nombre !== productoActual.nombre) {
      const duplicado = await ProductoModel.getByName(campos.nombre);
      if(duplicado) throw new AppError("El nuevo nombre ya esta en uso.", 400);
    }

    if(campos.id_categoria) {
      const existeCat = await CategoriaModel.getById(campos.id_categoria);
      if(!existeCat) throw new AppError("La categoria no existe", 404);
    }

    return await ProductoModel.updatePartial(id, campos);
  },

  // Services para ocultar un producto al cliente pero no en la db
  ocultarProducto: async (id: number) => {
    const producto =await ProductoModel.getById(id);
    if(!producto) {
      throw new AppError("El producto no existe o ya ha sido ocultado previamente.", 404);
    }

    await ProductoModel.updateState(id);
    return producto;
  },
  
  // Services para mostrar un producto ocultado
  restaurarProducto: async (id: number) => {
    const producto = await ProductoModel.getAnyById(id)
    if(!producto) {
      throw new AppError("El producto no existe en la base de datos.", 404);
    }

    if(producto.activo === 1) {
      throw new AppError("Este producto ya se encuentra activo, no es necesario restaurarlo.", 400);
    }

    await ProductoModel.restoreState(id);

    return producto;
  },

  // Services para eliminar un solo producto
  eliminarProducto: async (id: number) => {
    const producto = await ProductoModel.getAnyById(id);
    if(!producto) throw new AppError("El producto no existe o ya fue eliminado.", 404);

    await ProductoModel.delete(id);
    return producto;
  },

  // Services para eliminar todos los productos
  eliminarTodo: async () => {
    const cantidadBorrada = await ProductoModel.deleteAll();
    if(cantidadBorrada === 0) throw new AppError("La tabla ya esta vacia.", 400);

    return cantidadBorrada;
  }
}

export default ProductoService;