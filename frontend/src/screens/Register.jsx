import React, { useState } from 'react';
// 1. Importamos useNavigate
import { useNavigate } from 'react-router-dom';
//import './register.css'; // (CSS de ejemplo más abajo)

// URL del endpoint de registro
const API_URL = "http://localhost:3001/api/register";

function Register() {
  // 2. Inicializamos el hook
  const navigate = useNavigate();

  // Estados para el formulario
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [condicion, setCondicion] = useState('');

  // Estados para la UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Limpiar mensajes
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        setIsLoading(false);
        return;
    }

    // Validación simple
    if (!nombre || !edad || !email || !password) {
      setError("Todos los campos (excepto condición especial) son obligatorios.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: nombre,
          edad: edad,
          email: email,
          password: password,
          condicion_especial: condicion
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Éxito: Código de estado HTTP 201 (Created)
        console.log("Registro exitoso. Cliente ID:", data.clientId);
        setSuccess("¡Cuenta creada exitosamente! Redirigiendo a Login...");
        
        // Retraso para que el usuario pueda leer el mensaje de éxito
        setTimeout(() => {
          // 3. Usamos navigate (minúscula)
          navigate("/login"); 
        }, 2000); 

      } else {
        // Error del servidor (ej. 409: Correo ya existe)
        setError(data.error || 'Ocurrió un error desconocido.');
        setIsLoading(false);
      }
    } catch (err) {
      // Error de red o conexión
      console.error("Error de red al registrar:", err);
      setError("No se pudo conectar con el servidor. Inténtalo más tarde.");
      setIsLoading(false);
    }
    // No ponemos setIsLoading(false) aquí si hay éxito, 
    // porque el componente se desmontará al navegar.
  };

  return (
    <div className="register-container">
      <h1 className="register-title">Crear Cuenta</h1>
      <p className="register-subtitle">Únete para agendar tu próxima cita.</p>

      <form className="register-form" onSubmit={handleSubmit}>

        {/* --- MENSAJES DE ESTADO --- */}
        {error && (
          <div className="message error-message">{error}</div>
        )}
        {success && (
          <div className="message success-message">{success}</div>
        )}

        <input 
          type="text" 
          placeholder="Nombre Completo" 
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={isLoading}
          required 
        />
        <input 
          type="number" 
          placeholder="Edad" 
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
          disabled={isLoading}
          required 
        />
        <input 
          type="email" 
          placeholder="Correo Electrónico" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required 
        />
        <input 
          type="password" 
          placeholder="Contraseña de al menos 8 caracteres" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required 
        />
        <input 
          type="text" 
          placeholder="Condición Especial (Opcional)" 
          value={condicion}
          onChange={(e) => setCondicion(e.target.value)}
          disabled={isLoading}
        />
        
        <button 
          type="submit" 
          className="register-btn" 
          disabled={isLoading}
        >
          {isLoading ? "Creando cuenta..." : "Registrarse"}
        </button>
      </form>

      <div className="register-footer">
        <p>
          ¿Ya tienes cuenta?{" "}
          <span 
            className="login-link" 
            onClick={() => !isLoading && navigate("/login")}
          >
            Inicia sesión aquí
          </span>
        </p>
      </div>
    </div>
  );
}

export default Register;
