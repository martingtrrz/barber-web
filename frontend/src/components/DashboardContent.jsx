import React from "react";
import CitasDelDia from "./CitasDelDia";
// Importamos los nuevos componentes (que crearemos a continuación)
import ClientesManager from "./ClientesManager";
import ServiciosManager from "./ServiciosManager";
import ReportesManager from "./ReportesManager";
import Horarios from "./Horarios";
import Personal from "./Personal";
import CambiarContra from './CambiarContra';
function DashboardContent({ seccion, usuario }) {
  
  // Este switch ahora llama a los componentes importados
  switch (seccion) {
    case "citas":
      return <CitasDelDia usuario={usuario} />;
    case "Editar":
      return <CambiarContra usuario={usuario} />;
    case "clientes":
      return <ClientesManager usuario={usuario} />;
    case "servicios":
      return <ServiciosManager usuario={usuario} />;
    case "reportes":
      return <ReportesManager usuario={usuario} />;
    case "horarios":
      return <Horarios usuario={usuario} />;
    case "personal":
      return <Personal usuario={usuario} />;  
      default:
      return <div><h1>Sección no encontrada</h1></div>;
  }
}

export default DashboardContent;

