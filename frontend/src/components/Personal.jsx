import React, { useState, useEffect } from 'react';

// Ajusta el puerto a donde esté corriendo tu backend
const API_URL = 'http://localhost:3001/api/personal';
const API_URL_INACTIVOS = 'http://localhost:3001/api/personal/inactivo';
const API_URL_REGISTRO = 'http://localhost:3001/api/personal/registro'; 

const Personal = () => {
    const [personal, setPersonal] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [notificacion, setNotificacion] = useState('');
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    
    // NUEVO: Estado para controlar la visibilidad del formulario (Acordeón)
    const [formVisible, setFormVisible] = useState(false);

    // --- ESTADOS PARA EL FORMULARIO ---
    const [isEditingId, setIsEditingId] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        rol: 'TRABAJADOR', 
        contrasena: '',
        // Horarios
        hora_entrada: '08:00', 
        hora_salida: '17:00', 
        hora_descanso_inicio: '13:00',
        hora_descanso_fin: '14:00',
        dia_descanso: 'Sábado'
    });

    // 🔄 Obtener lista de personal
    const obtenerPersonal = async (esInactivo = mostrarInactivos) => { 
        setCargando(true);
        setError(null);
        
        const url = esInactivo ? API_URL_INACTIVOS : API_URL;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const data = await response.json();

            let listaPersonal = [];
            if (data.success) {
                listaPersonal = esInactivo ? data.personal_inactivo : data.data;
            }

            if (Array.isArray(listaPersonal)) {
                setPersonal(listaPersonal);
            } else {
                setPersonal([]);
            }
        } catch (err) {
            console.error("Fallo al obtener el personal:", err);
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };
    
    const handleToggleActivos = () => {
        const nuevoEstado = !mostrarInactivos;
        setMostrarInactivos(nuevoEstado);
        // Al cambiar vista, cerramos form y reseteamos edición
        setFormVisible(false);
        handleCancelEdit();
        obtenerPersonal(nuevoEstado); 
    };

    useEffect(() => {
        obtenerPersonal(mostrarInactivos); 
    }, []); 

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            correo: '',
            rol: 'TRABAJADOR',
            contrasena: '',
            hora_entrada: '08:00',
            hora_salida: '17:00',
            hora_descanso_inicio: '13:00',
            hora_descanso_fin: '14:00',
            dia_descanso: 'Sábado'
        });
        setIsEditingId(null);
        setError(null);
    }
    
    const handleCancelEdit = () => {
        resetForm();
        setFormVisible(false); // Cerrar formulario al cancelar
    };

    const handleSetEdit = (persona) => {
        if (!persona.activo && mostrarInactivos) {
             setNotificacion("Solo puedes editar a personal activo, debes activarlo primero.");
             return;
        }
        
        // Abrir formulario y scrollear arriba
        setFormVisible(true);
        setTimeout(() => {
             window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        setIsEditingId(persona.id_personal);
        setFormData(prev => ({
            ...prev, 
            nombre: persona.nombre,
            correo: persona.correo,
            rol: persona.rol,
            contrasena: '' 
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setNotificacion('');

        const esEdicion = isEditingId !== null;
        const url = esEdicion ? `${API_URL}/${isEditingId}` : API_URL_REGISTRO;         
        const method = esEdicion ? 'PUT' : 'POST';

        let body = {
            nombre: formData.nombre,
            correo: formData.correo,
            rol: formData.rol,
        };

        if (!esEdicion) {
            if (!formData.contrasena || formData.contrasena.length < 8) {
                setError("La contraseña es obligatoria (mín. 8 caracteres).");
                return;
            }
            if (!formData.hora_entrada || !formData.hora_salida) {
                setError("La hora de entrada y salida son obligatorias.");
                return;
            }
            
            body.contrasena = formData.contrasena;
            body.hora_entrada = formData.hora_entrada;
            body.hora_salida = formData.hora_salida;
            body.hora_descanso_inicio = formData.hora_descanso_inicio || null;
            body.hora_descanso_fin = formData.hora_descanso_fin || null;
            body.dia_descanso = formData.dia_descanso || null;
        }
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en la solicitud');
            }

            setNotificacion(data.message || `Operación exitosa.`);
            resetForm();
            setFormVisible(false); // Cerrar formulario tras éxito
            obtenerPersonal();  

        } catch (err) {
            setError(err.message);
        }
    };

    const handleInactivar = async (id, nombreActual) => {
        if (!window.confirm(`¿Estás seguro de que quieres INACTIVAR a ${nombreActual}?`)) return;
        try {
            const response = await fetch(`${API_URL}/${id}/activo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: 0 }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.mensaje || 'Error al inactivar');
            setNotificacion(result.mensaje || `Personal ${nombreActual} inactivado.`);
            await obtenerPersonal(); 
        } catch (err) {
            setNotificacion(`Error: ${err.message}`);
        }
    };

    const handleActivar = async (id, nombreActual) => {
        if (!window.confirm(`¿Deseas ACTIVAR nuevamente a ${nombreActual}?`)) return;
        try {
            const response = await fetch(`${API_URL}/${id}/activo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: 1 }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.mensaje || 'Error al activar');
            setNotificacion(result.mensaje || `Personal ${nombreActual} activado.`);
            await obtenerPersonal(); 
        } catch (err) {
            setNotificacion(`Error: ${err.message}`);
        }
    };
    
    useEffect(() => {
        if (notificacion) {
            const timer = setTimeout(() => setNotificacion(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [notificacion]);
    

    // 🧩 Renderizado
    return (
        <div className="admin-manager-container">
            <h1>Gestión de Personal</h1>
            <p>Administra los perfiles, roles y horarios de tu equipo.</p>

            {/* --- TARJETA 1: FORMULARIO (COLAPSABLE) --- */}
            {/* Solo mostramos el formulario si estamos en la vista de Activos */}
            {!mostrarInactivos && (
                <div className="dashboard-card">
                    {/* CABECERA CLICKABLE */}
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
                            {isEditingId ? `✏️ Editando Personal (ID: ${isEditingId})` : '➕ Registrar Nuevo Personal'}
                        </h3>
                        {/* Icono de flecha que rota */}
                        <span style={{ 
                            fontSize: '1.2rem', 
                            color: 'var(--color-azul-profundo)',
                            transform: formVisible ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                        }}>
                            ▼
                        </span>
                    </div>
                    
                    {/* CONTENIDO DEL FORMULARIO */}
                    {formVisible && (
                        <>
                            <hr style={{ border: 0, borderTop: '1px solid #eee', marginBottom: '20px' }} />
                            
                            {error && <p className="mensaje-error">{error}</p>}
                            {notificacion && <p className="mensaje-exito">{notificacion}</p>}
                            
                            <form onSubmit={handleSubmit}>
                                {/* DATOS BÁSICOS */}
                                <h4 style={{fontSize: '1rem', color:'#666', marginBottom:'15px', borderBottom:'1px dashed #ccc', paddingBottom:'5px'}}>Datos de Cuenta</h4>
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
                                        <label htmlFor="rol">Rol:</label>
                                        <select id="rol" name="rol" value={formData.rol} onChange={handleInputChange} required>
                                            <option value="TRABAJADOR">TRABAJADOR</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                    </div>
                                    
                                    {/* Contraseña solo al crear */}
                                    {!isEditingId && (
                                        <div className="form-group">
                                            <label htmlFor="contrasena">Contraseña Temporal:</label>
                                            <input type="password" id="contrasena" name="contrasena" value={formData.contrasena} onChange={handleInputChange} />
                                            <small style={{color:'#888'}}>Mínimo 8 caracteres.</small>
                                        </div>
                                    )}
                                </div>
                                
                                {/* DATOS DE HORARIO (SOLO AL CREAR) */}
                                {!isEditingId && (
                                    <div style={{marginTop: '20px'}}>
                                        <h4 style={{fontSize: '1rem', color:'#666', marginBottom:'15px', borderBottom:'1px dashed #ccc', paddingBottom:'5px'}}>Horario Inicial</h4>
                                        
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="hora_entrada">Entrada:</label>
                                                <input type="time" id="hora_entrada" name="hora_entrada" value={formData.hora_entrada} onChange={handleInputChange} required />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="hora_salida">Salida:</label>
                                                <input type="time" id="hora_salida" name="hora_salida" value={formData.hora_salida} onChange={handleInputChange} required />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="dia_descanso">Día de Descanso:</label>
                                                <select id="dia_descanso" name="dia_descanso" value={formData.dia_descanso} onChange={handleInputChange}>
                                                    <option value="">-- Ninguno --</option>
                                                    <option value="Lunes">Lunes</option>
                                                    <option value="Martes">Martes</option>
                                                    <option value="Miércoles">Miércoles</option>
                                                    <option value="Jueves">Jueves</option>
                                                    <option value="Viernes">Viernes</option>
                                                    <option value="Sábado">Sábado</option>
                                                    <option value="Domingo">Domingo</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="hora_descanso_inicio">Inicio Comida:</label>
                                                <input type="time" id="hora_descanso_inicio" name="hora_descanso_inicio" value={formData.hora_descanso_inicio} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="hora_descanso_fin">Fin Comida:</label>
                                                <input type="time" id="hora_descanso_fin" name="hora_descanso_fin" value={formData.hora_descanso_fin} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="form-actions" style={{marginTop: '25px'}}>
                                    <button type="submit" className="btn-guardar">
                                        {isEditingId ? '💾 Guardar Cambios' : 'Registrar Personal'}
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

            {/* --- TARJETA 2: LISTA DE PERSONAL --- */}
            <div className="dashboard-card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px'}}>
                    <h3 style={{margin: 0, border: 'none'}}>
                        {mostrarInactivos ? '📂 Personal Inactivo (Archivo)' : '👔 Personal Activo'}
                    </h3>
                    <button 
                        onClick={handleToggleActivos}
                        className={mostrarInactivos ? 'btn-guardar' : 'btn-cancelar'} 
                        style={{ fontSize: '0.9rem' }}
                    >
                        {mostrarInactivos ? '⬅️ Ver Activos' : '🗑️ Ver Inactivos'}
                    </button>
                </div>
                
                {/* Mensajes globales si el formulario está cerrado */}
                {!formVisible && (
                    <>
                        {error && <p className="mensaje-error">{error}</p>}
                        {notificacion && <p className="mensaje-exito">{notificacion}</p>}
                    </>
                )}

                {cargando && <p style={{textAlign:'center', color:'#666'}}>Cargando...</p>}

                {!cargando && personal.length === 0 && (
                    <div style={{textAlign:'center', padding:'30px', color:'#999', border:'1px dashed #ccc', borderRadius:'8px'}}>
                        <p>No se encontraron registros de personal {mostrarInactivos ? 'inactivo' : 'activo'}.</p>
                    </div>
                )}

                {!cargando && personal.length > 0 && (
                    <div className="admin-table-container" style={{boxShadow:'none', border:'none'}}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {personal.map((persona) => (
                                    <tr key={persona.id_personal} style={{ backgroundColor: persona.activo ? 'white' : '#f9f9f9' }}>
                                        <td style={{fontWeight:'bold'}}>{persona.nombre}</td>
                                        <td>{persona.correo}</td>
                                        <td>
                                            <span style={{
                                                backgroundColor: persona.rol === 'ADMIN' ? '#e6f7ff' : '#fff7e6',
                                                color: persona.rol === 'ADMIN' ? '#0050b3' : '#d46b08',
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold'
                                            }}>
                                                {persona.rol}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`estado-badge ${persona.activo ? 'estado-completada' : 'estado-cancelada'}`}>
                                                {persona.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="acciones">
                                            {/* Solo se puede editar el personal Activo */}
                                            <button 
                                                className="btn-editar" 
                                                onClick={() => handleSetEdit(persona)}
                                                disabled={!persona.activo} 
                                                title="Editar Datos"
                                                style={{marginRight:'5px'}}
                                            >
                                                ✏️ Editar
                                            </button>
                                            
                                            {persona.activo === 1 ? (
                                                <button
                                                    onClick={() => handleInactivar(persona.id_personal, persona.nombre)}
                                                    className="btn-borrar" 
                                                    title="Inactivar / Dar de baja"
                                                >
                                                    🚫 Eliminar
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleActivar(persona.id_personal, persona.nombre)}
                                                    className="btn-guardar" 
                                                    style={{ backgroundColor: 'var(--estado-exito)' }} 
                                                    title="Reactivar"
                                                >
                                                    🔄
                                                </button>
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
};

export default Personal;