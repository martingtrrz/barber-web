import React from "react";
import { Container } from "react-bootstrap";
import Slider from "./Slider"; // Tu carrusel ya creado
//import "./servicios.css";

// Ejemplo de imágenes y nombres de servicios
import corteImg from "../assets/corteclasico.jpg";
import barbaImg from "../assets/barba.jpg";
import fadeImg from "../assets/fade.jpg";
import afeitadoImg from "../assets/afeitado.jpg";

const serviciosData = [
  { id: 1, nombre: "Corte de Cabello", img: corteImg },
  { id: 2, nombre: "Afeitado y Barba", img: barbaImg },
  { id: 3, nombre: "Fades y Taper", img: fadeImg },
  { id: 4, nombre: "Afeitado", img: afeitadoImg },
];

function Servicios() {
  return (
    <section className="servicios-section">
      <Container>
        <h1 className="servicios-title">Nuestros Servicios</h1>

        {/* Grid de servicios */}
        <div className="servicios-grid">
          {serviciosData.map((servicio) => (
            <div key={servicio.id} className="servicio-card">
              <img src={servicio.img} alt={servicio.nombre} />
              <h3 className="servicio-name">{servicio.nombre}</h3>
            </div>
          ))}
        </div>

        {/* Carrusel de trabajos anteriores */}
        <div className="servicios-slider">
          <h2 className="slider-title">Trabajos Anteriores</h2>
          <Slider />
        </div>
      </Container>
    </section>
  );
}

export default Servicios;
