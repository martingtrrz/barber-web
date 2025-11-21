import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from "../config";


// Definición del componente principal renombrado a Horarios
const Horarios = () => {
    // --- Estados del Componente ---
    const [horarios, setHorarios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para la funcionalidad de edición en línea
    const [editingId, setEditingId] = useState(null); // id_horario de la fila que se está editando
    const [editingData, setEditingData] = useState({}); // Datos temporales de edición
    const [successMessage, setSuccessMessage] = useState(null); // Mensaje de éxito para el usuario

    const API_URL = `${API_BASE_URL}/horarios`;

    // --- Funciones de Utilidad y Fetching ---

    // Función de utilidad para manejar reintentos de la API (Exponential Backoff)
    const exponentialBackoffFetch = async (url, options, retries = 3, delay = 1000) => {
        let lastError = null;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    return response;
                } else {
                    // No reintentar en caso de errores de cliente/lógica (400, 404)
                    if (response.status === 404 || response.status === 400 || response.status === 401 || response.status === 403) {
                        return response;
                    }
                    lastError = new Error(`Petición fallida con estado ${response.status}`);
                }
            } catch (err) {
                // Errores de red
                lastError = err;
            }

            if (i < retries - 1) {
                console.warn(`Intento fallido. Reintentando en ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
        throw lastError;
    };

    // Función para obtener la lista de horarios
    const fetchHorarios = async () => {
        try {
            setIsLoading(true);
            const response = await exponentialBackoffFetch(API_URL, {});
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.mensaje || 'Error al obtener los datos');
            }

            // 🌟🌟🌟 CORRECCIÓN CLAVE AQUÍ 🌟🌟🌟
            // El backend devuelve { success: true, data: [...] }
            const horariosArray = data.data;

            if (Array.isArray(horariosArray)) {
                setHorarios(horariosArray); 
            } else {
                // En caso de que el backend devuelva un objeto vacío o null en data
                setHorarios([]);
                console.error("La respuesta de la API no contiene un array válido en 'data.data'", data);
            }
            // 🌟🌟🌟 FIN DE LA CORRECCIÓN 🌟🌟🌟

            setError(null);
        } catch (err) {
            console.error("Error al cargar los horarios:", err);
            setError(`No se pudieron cargar los horarios. Detalles: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Handlers de Edición (PUT) ---

    // 1. Inicia el modo de edición para una fila
    const handleEdit = (horario) => {
        // Usar id_horario como clave principal
        const id = horario.id_horario || horario.id_personal; 
        setEditingId(id);
        
        // Carga todos los campos editables
        setEditingData({
            hora_entrada: horario.hora_entrada || '',
            hora_salida: horario.hora_salida || '',
            hora_descanso_inicio: horario.hora_descanso_inicio || '',
            hora_descanso_fin: horario.hora_descanso_fin || '',
            dia_descanso: horario.dia_descanso || '',
        });
        setSuccessMessage(null); // Limpia mensajes de éxito anteriores
    };

    // 2. Maneja los cambios en los campos de entrada
    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditingData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    // 3. Cancela el modo de edición
    const handleCancel = () => {
        setEditingId(null);
        setEditingData({});
    };

    // 4. Ejecuta la petición PUT para actualizar
    const handleUpdate = async (id_horario) => {
        const dataToSend = {};
        // Solo enviar los campos que tienen un valor válido/modificado
        Object.keys(editingData).forEach(key => {
            if (editingData[key] !== undefined && editingData[key] !== null) {
                dataToSend[key] = editingData[key];
            }
        });

        if (Object.keys(dataToSend).length === 0) {
            setSuccessMessage("No se detectaron cambios para guardar.");
            handleCancel();
            return;
        }

        try {
            const response = await exponentialBackoffFetch(
                `${API_URL}/${id_horario}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSend),
                }
            );

            const result = await response.json();

            if (response.ok) {
                setSuccessMessage(result.mensaje || `Horario ${id_horario} actualizado correctamente.`);
                // Actualizar el estado local para reflejar los cambios
                setHorarios(prev => prev.map(h => 
                    (h.id_horario || h.id_personal) === id_horario ? { ...h, ...dataToSend } : h
                ));
                handleCancel();
            } else {
                setError(result.error || result.mensaje || `Error desconocido al actualizar: ${id_horario}`);
            }
        } catch (err) {
            console.error("Error al ejecutar PUT:", err);
            setError(`Error de red al actualizar el horario ${id_horario}: ${err.message}`);
        }
    };

    // --- Handler de Eliminación (DELETE) ---

    // 5. Ejecuta la petición DELETE para eliminar
    const handleDelete = async (id_horario) => {
        setSuccessMessage(null); // Limpia mensajes de éxito anteriores
        setError(null); // Limpia mensajes de error anteriores

        const confirmDelete = window.confirm(`¿Seguro que deseas ELIMINAR el horario con ID ${id_horario}? Esta acción es irreversible.`);
        if (!confirmDelete) return;

        try {
            const response = await fetch(`${API_URL}/${id_horario}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (response.ok) {
                // Eliminar el registro del estado local sin recargar todos los datos
                setHorarios(prev => prev.filter(h => (h.id_horario || h.id_personal) !== id_horario));
                setSuccessMessage(result.mensaje || `Horario ${id_horario} eliminado correctamente.`);
            } else {
                setError(result.error || result.mensaje || `Error al eliminar el horario ${id_horario}`);
            }
        } catch (err) {
            console.error("Error al eliminar el horario:", err);
            setError(`Error de red al eliminar el horario ${id_horario}: ${err.message}`);
        }
    };


    // --- Efectos de Carga y Mensajes ---

    // Efecto para cargar los datos al montar el componente
    useEffect(() => {
        fetchHorarios();
    }, []);
    
    // Ocultar mensaje de éxito después de un tiempo
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 4000); // 4 segundos para visibilidad
            return () => clearTimeout(timer);
        }
    }, [successMessage]);


    // --- Renderizado Condicional ---

    if (isLoading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>⌛ Cargando horarios...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', border: '1px solid red', color: 'red', margin: '20px', borderRadius: '4px', backgroundColor: '#fdd' }}>
                <p style={{ fontWeight: 'bold' }}>🛑 Error al conectar con la API o al procesar datos</p>
                <p>{error}</p>
                <button 
                    onClick={fetchHorarios} 
                    style={{ marginTop: '10px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#ffaaaa', border: '1px solid red', borderRadius: '4px' }}
                >
                    Reintentar Carga
                </button>
            </div>
        );
    }

    // --- Renderizado Principal (Tabla) ---

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                📅 Control de Horarios del Personal
            </h1>

            {/* Mensaje de éxito temporal */}
            {successMessage && (
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#d4edda', 
                    color: '#155724', 
                    border: '1px solid #c3e6cb', 
                    borderRadius: '4px',
                    marginBottom: '15px',
                    fontWeight: 'bold'
                }}>
                    ✅ {successMessage}
                </div>
            )}


            {horarios.length === 0 ? (
                <div style={{ padding: '10px', border: '1px solid #ccc', marginTop: '10px', backgroundColor: '#fefefe' }}>
                    ⚠️ No se encontraron horarios registrados.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        border: '1px solid #333', 
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <thead style={{ backgroundColor: '#e9ecef' }}>
                            <tr>
                                <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'left' }}>
                                    Personal
                                </th>
                                <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'left' }}>
                                    Entrada
                                </th>
                                <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'left' }}>
                                    Salida
                                </th>
                                <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'left' }}>
                                    Inicio Descanso
                                </th>
                                <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'left' }}>
                                    Fin Descanso
                                </th>
                                <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'left' }}>
                                    Día Libre
                                </th>
                                
                                <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'left', width: '200px' }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {horarios.map((horario) => {
                                // Usar id_horario para la clave y la edición (o id_personal como fallback)
                                const id_key = horario.id_horario || horario.id_personal;
                                const isEditing = id_key === editingId;

                                return (
                                    <tr 
                                        key={id_key} 
                                        style={{ backgroundColor: isEditing ? '#fffacd' : (id_key % 2 === 0 ? '#f7f7f7' : 'white') }}
                                    >
                                        <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>
                                            {horario.nombre_personal || 'Personal Desconocido'}
                                        </td>

                                        {/* Hora de Entrada (Editable) */}
                                        <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    name="hora_entrada"
                                                    value={editingData.hora_entrada || ''}
                                                    onChange={handleChange}
                                                    style={{ padding: '4px', width: '90%', border: '1px solid #666' }}
                                                />
                                            ) : (
                                                horario.hora_entrada || 'N/A'
                                            )}
                                        </td>

                                        {/* Hora de Salida (Editable) */}
                                        <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    name="hora_salida"
                                                    value={editingData.hora_salida || ''}
                                                    onChange={handleChange}
                                                    style={{ padding: '4px', width: '90%', border: '1px solid #666' }}
                                                />
                                            ) : (
                                                horario.hora_salida || 'N/A'
                                            )}
                                        </td>

                                        {/* Inicio Descanso (Editable) */}
                                        <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    name="hora_descanso_inicio"
                                                    value={editingData.hora_descanso_inicio || ''}
                                                    onChange={handleChange}
                                                    style={{ padding: '4px', width: '90%', border: '1px solid #666' }}
                                                />
                                            ) : (
                                                horario.hora_descanso_inicio || 'N/A'
                                            )}
                                        </td>

                                        {/* Fin Descanso (Editable) */}
                                        <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    name="hora_descanso_fin"
                                                    value={editingData.hora_descanso_fin || ''}
                                                    onChange={handleChange}
                                                    style={{ padding: '4px', width: '90%', border: '1px solid #666' }}
                                                />
                                            ) : (
                                                horario.hora_descanso_fin || 'N/A'
                                            )}
                                        </td>
                                        
                                        {/* Día Libre (Editable - con un simple input de texto) */}
                                        <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="dia_descanso"
                                                    value={editingData.dia_descanso || ''}
                                                    onChange={handleChange}
                                                    placeholder="Ej: Sábado"
                                                    style={{ padding: '4px', width: '90%', border: '1px solid #666' }}
                                                />
                                            ) : (
                                                horario.dia_descanso || 'N/A'
                                            )}
                                        </td>

                                       
                                        
                                        {/* Columna de Acciones */}
                                        <td style={{ padding: '8px', border: '1px solid #ccc', minWidth: '150px' }}>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    <button 
                                                        onClick={() => handleUpdate(id_key)} 
                                                        style={{ 
                                                            padding: '6px 10px', 
                                                            border: 'none', 
                                                            background: '#28a745', // Verde
                                                            color: 'white', 
                                                            borderRadius: '4px', 
                                                            cursor: 'pointer',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        Guardar Cambios
                                                    </button>
                                                    <button 
                                                        onClick={handleCancel}
                                                        style={{ 
                                                            padding: '6px 10px', 
                                                            border: 'none', 
                                                            background: '#ffc107', // Amarillo
                                                            color: '#333', 
                                                            borderRadius: '4px', 
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <button 
                                                        onClick={() => handleEdit(horario)}
                                                        style={{ 
                                                            padding: '6px 10px', 
                                                            border: 'none', 
                                                            background: '#007bff', // Azul
                                                            color: 'white', 
                                                            borderRadius: '4px', 
                                                            cursor: 'pointer',
                                                            flexGrow: 1
                                                        }}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(id_key)} // **Función de eliminación agregada aquí**
                                                        style={{ 
                                                            padding: '6px 10px', 
                                                            border: 'none', 
                                                            background: '#dc3545', // Rojo
                                                            color: 'white', 
                                                            borderRadius: '4px', 
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                </div>
            )}
        </div>
    );
};

export default Horarios;