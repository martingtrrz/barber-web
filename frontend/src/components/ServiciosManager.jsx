import React, { useState, useEffect } from 'react';

const API_BASE_URL = "http://localhost:3001/api";

function ServiciosManager() {
    const [servicios, setServicios] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Estado para el formulario
    const [formData, setFormData] = useState({
        nombre: '',
        duracion_minutos: '',
        precio: ''
    });
    const [isEditingId, setIsEditingId] = useState(null); 

    // NUEVO: Estado para controlar la visibilidad del formulario (Acordeón)
    const [formVisible, setFormVisible] = useState(false);

    // 1. Cargar servicios al iniciar
    const fetchServicios = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/servicios`);
            if (!response.ok) throw new Error('No se pudieron cargar los servicios');
            const data = await response.json();
            setServicios(data.servicios || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchServicios();
    }, []);

    // 2. Manejar cambios en el formulario
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 3. Cancelar edición
    const handleCancelEdit = () => {
        setIsEditingId(null);
        setFormData({ nombre: '', duracion_minutos: '', precio: '' });
        setError(null);
        setFormVisible(false); // Cerrar formulario al cancelar
    };

    // 4. Poner un servicio en modo de edición
    const handleSetEdit = (servicio) => {
        // Abrir formulario y scrollear
        setFormVisible(true);
        setTimeout(() => {
             window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        setIsEditingId(servicio.id_servicio);
        setFormData({
            nombre: servicio.nombre,
            duracion_minutos: servicio.duracion_minutos,
            precio: parseFloat(servicio.precio).toFixed(2)
        });
    };

    // 5. Manejar envío (Crear o Actualizar)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        const url = isEditingId
            ? `${API_BASE_URL}/servicios/${isEditingId}` // PUT
            : `${API_BASE_URL}/servicios`; // POST

        const method = isEditingId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al guardar el servicio');

            // Éxito
            handleCancelEdit(); // Resetea el form y lo cierra
            fetchServicios(); 

        } catch (err) {
            setError(err.message);
        }
    };

    // 6. Borrar un servicio
    const handleDelete = async (id_servicio) => {
        if (!window.confirm("¿Estás seguro de que quieres borrar este servicio?")) {
            return;
        }
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/servicios/${id_servicio}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al borrar el servicio');

            fetchServicios(); 

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="admin-manager-container">
            <h1>Gestión de Servicios</h1>
            <p>Añade, edita o elimina los servicios que ofreces en la barbería.</p>
            
            {/* --- TARJETA 1: FORMULARIO (COLAPSABLE) --- */}
            <div className="dashboard-card">
                {/* Cabecera Clickable */}
                <div 
                    onClick={() => setFormVisible(!formVisible)}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        marginBottom: formVisible ? '20px' : '0'
                    }}
                >
                    <h3 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                        {isEditingId ? `✏️ Editando Servicio (ID: ${isEditingId})` : '✂️ Nuevo Servicio'}
                    </h3>
                    <span style={{ 
                        fontSize: '1.2rem', 
                        color: 'var(--color-azul-profundo)',
                        transform: formVisible ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                    }}>
                        ▼
                    </span>
                </div>

                {/* Contenido del Formulario */}
                {formVisible && (
                    <>
                        <hr style={{ border: 0, borderTop: '1px solid #eee', marginBottom: '20px' }} />
                        
                        {error && <p className="mensaje-error">{error}</p>}
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nombre del Servicio:</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Ej. Corte Clásico"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Duración (minutos):</label>
                                    <input
                                        type="number"
                                        name="duracion_minutos"
                                        value={formData.duracion_minutos}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="30"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Precio ($):</label>
                                    <input
                                        type="number"
                                        name="precio"
                                        step="0.01"
                                        value={formData.precio}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
                                <h3></h3>
                                <button type="submit" className="btn-guardar">
                                    {isEditingId ? '💾 Actualizar' : 'Guardar'}
                                </button>
                                {isEditingId && (
                                    <button type="button" className="btn-cancelar" onClick={handleCancelEdit}>
                                        ❌ Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </>
                )}
            </div>

            {/* --- TARJETA 2: LISTA DE SERVICIOS --- */}
            <div className="dashboard-card">
                <h3>📋 Servicios Actuales</h3>
                
                {isLoading && <p style={{ textAlign: 'center', color: '#666' }}>Cargando servicios...</p>}
                
                {!isLoading && servicios.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#999', border: '1px dashed #ccc', borderRadius: '8px' }}>
                        <p>No hay servicios registrados.</p>
                    </div>
                )}

                {!isLoading && servicios.length > 0 && (
                    <div className="admin-table-container" style={{ boxShadow: 'none', border: 'none' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Duración</th>
                                    <th>Precio</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {servicios.map(s => (
                                    <tr key={s.id_servicio}>
                                        <td style={{ fontWeight: 'bold' }}>{s.nombre}</td>
                                        <td>
                                            <span style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.9rem' }}>
                                                ⏱ {s.duracion_minutos} min
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--estado-exito)', fontWeight: 'bold' }}>
                                            ${parseFloat(s.precio).toFixed(2)}
                                        </td>
                                        <td className="acciones">
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button 
                                                    className="btn-editar" 
                                                    onClick={() => handleSetEdit(s)}
                                                    title="Editar"
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button 
                                                    className="btn-borrar" 
                                                    onClick={() => handleDelete(s.id_servicio)}
                                                    title="Borrar"
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ServiciosManager;