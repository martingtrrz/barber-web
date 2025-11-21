import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from "../config";

function ClientesManager() {
    const [clientes, setClientes] = useState([]);
    const [clientesInactivos, setClientesInactivos] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    const [mostrarInactivos, setMostrarInactivos] = useState(false); 
    
    // Estado para el formulario
    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        edad: '',
        condicion_especial: '',
        password: '' 
    });
    const [isEditingId, setIsEditingId] = useState(null); 

    // NUEVO: Estado para controlar la visibilidad del formulario
    const [formVisible, setFormVisible] = useState(false);

    // --- 1. FUNCIÓN PARA CARGAR CLIENTES ACTIVOS ---
    const fetchClientes = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/clientes`);
            if (!response.ok) throw new Error('No se pudieron cargar los clientes activos');
            const data = await response.json();
            setClientes(data.clientes || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- 2. FUNCIÓN PARA CARGAR CLIENTES INACTIVOS ---
    const fetchClientesInactivos = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/clientes-inactivos`); 
            if (!response.ok) throw new Error('No se pudieron cargar los clientes inactivos');
            const data = await response.json();
            setClientesInactivos(data.clientes_inactivos || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchClientes();
        fetchClientesInactivos();
    }, []);
    
    const handleToggleView = () => {
        setMostrarInactivos(prev => !prev);
        // Si cambiamos de vista, cerramos el formulario para evitar confusiones
        setFormVisible(false); 
        handleCancelEdit();
        
        if (mostrarInactivos) {
            fetchClientes();
        } else {
            fetchClientesInactivos();
        }
        setError(null);
        setSuccess(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCancelEdit = () => {
        setIsEditingId(null);
        setFormData({ nombre: '', correo: '', edad: '', condicion_especial: '', password: '' });
        setError(null);
        setFormVisible(false); // Cerrar formulario al cancelar
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        
        const url = isEditingId
            ? `${API_BASE_URL}/clientes/${isEditingId}` // PUT
            : `${API_BASE_URL}/clientes`; // POST

        const method = isEditingId ? 'PUT' : 'POST';

        let body = { ...formData };
        if (isEditingId) {
            delete body.password; 
        } else if (!formData.password || formData.password.length < 8) {
            setError("La contraseña es obligatoria y debe tener al menos 8 caracteres.");
            return;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al guardar el cliente');

            setSuccess(data.message || 'Operación exitosa');
            
            // Resetear UI
            setIsEditingId(null);
            setFormData({ nombre: '', correo: '', edad: '', condicion_especial: '', password: '' });
            setFormVisible(false); // Cerrar formulario tras éxito
            
            fetchClientes(); 
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            setError(err.message);
        }
    };

    const handleSetEdit = (cliente) => {
        if (mostrarInactivos) return; 

        // Abrir formulario y scrollear
        setFormVisible(true);
        setTimeout(() => {
             window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        setIsEditingId(cliente.id_cliente);
        setFormData({
            nombre: cliente.nombre,
            correo: cliente.correo,
            edad: cliente.edad,
            condicion_especial: cliente.condicion_especial || '',
            password: ''
        });
    };

    const handleDelete = async (id_cliente) => {
        if (!window.confirm("¿Seguro que quieres ARCHIVAR este cliente? Se borrarán sus citas futuras y pasará a la lista de inactivos.")) {
            return;
        }
        setError(null);
        setSuccess(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/clientes/${id_cliente}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al borrar el cliente');

            setSuccess(data.message || 'Cliente archivado correctamente');
            
            fetchClientes(); 
            fetchClientesInactivos();
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            setError(err.message);
        }
    };

    const handleRestore = async (id_cliente) => {
        if (!window.confirm("¿Seguro que deseas RESTAURAR a este cliente inactivo?")) {
            return;
        }
        setError(null);
        setSuccess(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/clientes-inactivos/restaurar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_cliente }) 
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al restaurar el cliente');

            setSuccess(data.message || 'Cliente restaurado con éxito.');
            
            fetchClientes(); 
            fetchClientesInactivos();
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            setError(err.message);
        }
    };


    const listaActual = mostrarInactivos ? clientesInactivos : clientes;
    const tituloTabla = mostrarInactivos ? '📂 Clientes Inactivos (Archivo)' : '👥 Clientes Actuales (Activos)';


    return (
        <div className="admin-manager-container">
            <h1>Gestión de Clientes</h1>
            <p>Administra la base de datos de tus clientes.</p>
            
            {/* --- TARJETA 1: FORMULARIO (Solo visible si no estamos en vista de inactivos) --- */}
            {!mostrarInactivos && (
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
                            {isEditingId ? `✏️ Editando Cliente (ID: ${isEditingId})` : '➕ Registrar Nuevo Cliente'}
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

                    {formVisible && (
                        <>
                            <hr style={{ border: 0, borderTop: '1px solid #eee', marginBottom: '20px' }} />
                            
                            {error && <p className="mensaje-error">{error}</p>}
                            {success && <p className="mensaje-exito">{success}</p>}

                            <form onSubmit={handleSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="nombre">Nombre Completo:</label>
                                        <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="correo">Correo Electrónico:</label>
                                        <input type="email" id="correo" name="correo" value={formData.correo} onChange={handleInputChange} required />
                                    </div>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="edad">Edad:</label>
                                        <input type="number" id="edad" name="edad" value={formData.edad} onChange={handleInputChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="condicion_especial">Condición Especial (Opcional):</label>
                                        <input type="text" id="condicion_especial" name="condicion_especial" value={formData.condicion_especial} onChange={handleInputChange} />
                                    </div>
                                </div>

                                {/* Contraseña solo al crear */}
                                {!isEditingId && (
                                    <div className="form-group" style={{ marginTop: '10px' }}>
                                        <label htmlFor="password">Contraseña Temporal:</label>
                                        <input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} required />
                                        <small style={{ color: '#888' }}>Mínimo 8 caracteres.</small>
                                    </div>
                                )}
                                
                                <div className="form-actions" style={{ marginTop: '25px' }}>
                                    <button type="submit" className="btn-guardar">
                                        {isEditingId ? '💾 Actualizar Cliente' : 'Guardar Nuevo'}
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
            )}

            {/* --- TARJETA 2: LISTADO --- */}
            <div className="dashboard-card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px'}}>
                    <h3 style={{ margin: 0, border: 'none' }}>{tituloTabla}</h3>
                    <button 
                        type="button" 
                        className={mostrarInactivos ? "btn-cancelar" : "btn-guardar"} 
                        onClick={handleToggleView}
                        style={{ fontSize: '0.9rem' }}
                    >
                        {mostrarInactivos ? '⬅️ Volver a Clientes Activos' : '🗑️ Ver Archivo'}
                    </button>
                </div>
                
                {/* Mensajes globales si el formulario está cerrado */}
                {!formVisible && (
                    <>
                        {error && <p className="mensaje-error">{error}</p>}
                        {success && <p className="mensaje-exito">{success}</p>}
                    </>
                )}
                
                {isLoading && <p style={{ textAlign: 'center', color: '#666' }}>Cargando clientes...</p>}

                {!isLoading && listaActual.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#999', border: '1px dashed #ccc', borderRadius: '8px' }}>
                        <p>
                            {mostrarInactivos 
                                ? 'No hay clientes archivados.' 
                                : 'No hay clientes activos registrados.'}
                        </p>
                    </div>
                )}

                {!isLoading && listaActual.length > 0 && (
                    <div className="admin-table-container" style={{ boxShadow: 'none', border: 'none' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Edad</th>
                                    <th>Condición</th>
                                    <th>{mostrarInactivos ? 'Baja / Acciones' : 'Acciones'}</th> 
                                </tr>
                            </thead>
                            <tbody>
                                {listaActual.map(c => (
                                    <tr key={c.id_cliente} style={{ backgroundColor: mostrarInactivos ? '#f9f9f9' : 'white' }}>
                                        <td style={{ color: '#666', fontSize: '0.9rem' }}>#{c.id_cliente}</td>
                                        <td style={{ fontWeight: 'bold' }}>{c.nombre}</td>
                                        <td>{c.correo}</td>
                                        <td>{c.edad}</td>
                                        <td>
                                            {c.condicion_especial ? (
                                                <span style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                    {c.condicion_especial}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#ccc' }}>—</span>
                                            )}
                                        </td>
                                        <td className="acciones">
                                            {mostrarInactivos ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                        {c.fecha_eliminacion}
                                                    </div>
                                                    <button 
                                                        className="btn-guardar" 
                                                        onClick={() => handleRestore(c.id_cliente)} 
                                                        title="Restaurar Cliente"
                                                        style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                                                    >
                                                        🔄 Restaurar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <button 
                                                        className="btn-editar" 
                                                        onClick={() => handleSetEdit(c)}
                                                        title="Editar"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button 
                                                        className="btn-borrar" 
                                                        onClick={() => handleDelete(c.id_cliente)}
                                                        title="Archivar"
                                                    >
                                                        🚫 Eliminar
                                                    </button>
                                                </div>
                                            )}
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

export default ClientesManager;