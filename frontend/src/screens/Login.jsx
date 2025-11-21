import React, { useState } from "react";
// 1. Importamos 'useNavigate' también para el nuevo link
import { useNavigate } from "react-router-dom"; 
import { API_BASE_URL } from "../config";

const API_URL = `${API_BASE_URL}/login`;  

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); 
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        localStorage.setItem("usuario", JSON.stringify(data.user));
        window.dispatchEvent(new CustomEvent("usuario-login", { detail: data.user }));

        if (data.user.tipo === 'Personal') {
          navigate("/personal/dashboard");
        } else {
          navigate("/Reservar"); 
        }

      } else {
        if (response.status === 401) {
            setError("El correo o la contraseña son incorrectos.");
        } else {
            setError("Ocurrió un problema al iniciar sesión. Inténtalo de nuevo.");
        }
      }
    } catch (err) {
      setError("No pudimos conectar con el servidor. Revisa tu conexión a internet.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Usamos las clases del styles.css nuevo
    <div className="login-container">
      <h1 style={{ marginBottom: '1rem', color: 'var(--color-navy)' }}>Bienvenido</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>Inicia sesión para agendar tu corte.</p>
      
      {/* Usamos la clase 'agendar-form' de styles.css 
        para que los labels se vean bien 
      */}
      <form onSubmit={handleLogin} className="agendar-form">
        {error && <div className="mensaje-error">{error}</div>}
        
        {/* CORREGIDO: Usamos labels para mejor accesibilidad y estilo */ }
        <label htmlFor="email">Correo Electrónico:</label>
        <input 
          id="email"
          type="email" 
          placeholder="ejemplo@correo.com" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          disabled={isLoading}
        />

        <label htmlFor="password">Contraseña:</label>
        <input 
          id="password"
          type="password" 
          placeholder="********" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          disabled={isLoading}
        />

        {/* ================================================ */}
        {/* === AQUÍ AÑADIMOS EL ENLACE DE RECUPERACIÓN === */}
        {/* ================================================ */}
        <div style={{ textAlign: 'right', fontSize: '0.9rem', marginTop: '-5px', marginBottom: '15px' }}>
            <span 
                style={{ color: 'var(--color-rojo-principal)', fontWeight: 'bold', cursor: 'pointer' }} 
                onClick={() => navigate("/RecuperarContra")}
            >
                ¿Olvidaste tu contraseña?
            </span>
        </div>
        
        <button type="submit" className="login-btn" disabled={isLoading}>
          {isLoading ? "Verificando..." : "ENTRAR"}
        </button>
      </form>

      <div style={{ marginTop: '20px', fontSize: '0.9rem' }}>
        ¿Es tu primera vez aquí?{" "}
        <span 
            className="login-link" // Usamos la clase de styles.css
            onClick={() => navigate("/Register")}
        >
            Crea tu cuenta gratis
        </span>
      </div>
    </div>
  );
}

export default Login;