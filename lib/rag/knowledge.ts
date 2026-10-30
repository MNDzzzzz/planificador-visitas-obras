// Base de conocimiento documental para el sistema RAG (LabQA Copilot)
// Contexto: Empresa de control de calidad de la construcción y ensayos de materiales (Terrassa).

export interface DocumentSection {
  id: string;
  title: string;
  category: 'Hormigón' | 'Geotecnia' | 'Acero y Estructuras' | 'ISO 9001 y Calidad' | 'Operativa y Logística';
  content: string;
  tags: string[];
}

export const technicalDocuments: DocumentSection[] = [
  {
    id: 'DOC-01',
    title: 'Procedimiento de Muestreo de Hormigón Fresco y Ensayo de Consistencia (UNE-EN 12350-2)',
    category: 'Hormigón',
    content: `
OBJETO Y CAMPO DE APLICACIÓN:
Determinación de la consistencia del hormigón fresco mediante el ensayo de asentamiento del Cono de Abrams según la norma UNE-EN 12350-2 y el Código Estructural (Real Decreto 470/2021).

METODOLOGÍA DE TOMA DE MUESTRAS EN OBRA:
1. La toma de muestras debe realizarse a la descarga de la hormigonera, desechando los primeros 0.2 m³ y los últimos 0.2 m³.
2. El cono se llena en tres capas de igual volumen, compactando cada una con 25 golpes de la varilla normalizada de 16 mm.
3. El desmoldeo se ejecuta verticalmente en un tiempo de 2 a 5 segundos.
4. Medición del asentamiento en mm. Tolerancia admisible: ± 20 mm respecto a la consistencia especificada (Fluida: 10-15 cm, Blanda: 6-9 cm).

FABRICACIÓN Y CURADO DE PROBETAS CILÍNDRICAS (15x30 cm):
- Se fabrican series mínimas de 4 probetas por lote (2 para rotura a 7 días como indicador preventivo y 2 para rotura oficial a 28 días según UNE-EN 12390-3).
- Las probetas permanecen en obra protegidas de la evaporación y vibraciones durante las primeras 24 horas (temperatura entre 15ºC y 25ºC).
- Traslado al laboratorio central de Terrassa dentro de las 24-36 horas posteriores al vertido para inmersión inmediata en la cámara húmeda (20ºC ± 2ºC y humedad relativa ≥ 95%).
    `,
    tags: ['hormigón', 'cono de abrams', 'probetas', 'une-en 12350-2', 'rotura', '28 días', 'cámara húmeda', 'terrassa'],
  },
  {
    id: 'DOC-02',
    title: 'Protocolo de Ensayos Geotécnicos y Control de Cimentaciones Superficiales y Profundas',
    category: 'Geotecnia',
    content: `
CRITERIOS DE CONFORMIDAD EN ENSAYOS DE TERRENO:
1. Ensayos de Penetración Dinámica Superpesada (DPSH) según UNE 103801:
   - Se registra el golpeo N20 cada 20 cm de hinca.
   - Si se alcanzan más de 100 golpes en 20 cm se declara rechazo técnico, verificando cota de estrato portante.
2. Ensayos de Carga con Placa (UNE 103807):
   - Diámetro de placa estándar: 300 mm o 600 mm según tamaño máximo de árido.
   - Se calcula el módulo de deformación de primer ciclo (Ev1) y de segundo ciclo (Ev2). La relación Ev2/Ev1 no debe superar 2.2 para rellenos compactados.
3. Control de Armaduras en Cimentaciones:
   - Verificación de recubrimientos mínimos con separadores homologados (mínimo 50 mm en contacto con el terreno, 70 mm en hormigonado directo contra tierras).
   - Comprobación de solapes y atados antes de la autorización del vertido de hormigón.
    `,
    tags: ['geotecnia', 'cimentaciones', 'dpsh', 'placa de carga', 'armaduras', 'recubrimientos', 'terreno'],
  },
  {
    id: 'DOC-03',
    title: 'Sistema de Gestión de la Calidad ISO 9001: Trazabilidad, Ensayos y Cadena de Custodia',
    category: 'ISO 9001 y Calidad',
    content: `
REQUISITOS DEL SISTEMA INTEGRADO DE CALIDAD EN LABORATORIO Y OBRA:
1. Cadena de Custodia:
   - Todo lote de muestras recogido por los técnicos (Carlos Gómez, Laura Martín, Alejandro Ruiz, Sofía Navarro) debe incorporar etiqueta inviolable con código de barras, obra, fecha/hora exacta y firma del jefe de obra.
2. Gestión de No Conformidades (PNC-04):
   - En caso de que la rotura de probetas a 7 días arroje una resistencia inferior al 65% de la fck prevista, se emite una Notificación de Advertencia Temprana al director facultativo de obra.
   - Si la rotura a 28 días resulta inferior a la resistencia de proyecto, se activa de inmediato el protocolo de ensayos no destructivos complementarios: esclerometría (UNE-EN 12504-2), ultrasonidos (UNE-EN 12504-4) o extracción de testigos de hormigón (testigos cilíndricos taladrados UNE-EN 12504-1).
3. Calibración de Prensas de Ensayo:
   - La prensa hidráulica de rotura del laboratorio de Terrassa cuenta con calibración anual certificada por ENAC clase 1.
    `,
    tags: ['iso 9001', 'no conformidad', 'calidad', 'rotura 7 días', 'esclerometría', 'testigos', 'enac', 'laboratorio'],
  },
  {
    id: 'DOC-04',
    title: 'Guía Operativa de Visitas a Obra, Desplazamientos y Seguridad Laboral',
    category: 'Operativa y Logística',
    content: `
NORMATIVA DE JORNADA Y TRASLADOS DE TÉCNICOS:
1. Horario de Jornada Laboral:
   - La jornada oficial de inspección en campo está fijada de 08:00 a 17:00 h (Europe/Madrid). Ningún técnico puede iniciar una visita antes de las 08:00 ni finalizar pasadas las 17:00 h.
2. Margen de Desplazamiento entre Obres Diferentes:
   - Se exige un tiempo de traslado mínimo estricto de 30 minutos entre visitas consecutivas en emplazamientos distintos para garantizar conducción segura, acondicionamiento de equipos de toma de muestras y transporte seguro de probetas con temperatura controlada.
   - Si se encadenan visitas en la misma obra de forma consecutiva, el margen requerido es de 0 minutos.
3. Cancelaciones:
   - Toda visita cancelada pasa inmediatamente a estado 'CANCELLED', liberando la franja horaria del técnico para nuevas urgencias de laboratorio o inspección, manteniéndose registrada en el sistema por exigencia de auditoría ISO 9001.
    `,
    tags: ['desplazamiento', 'jornada laboral', 'seguridad', '30 minutos', 'cancelación', '08:00', '17:00'],
  },
];
