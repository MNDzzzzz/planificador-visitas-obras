// Base de conocimiento documental para el sistema RAG (LabQA Copilot)
// Empresa técnica de control de calidad de la construcción y ensayos de laboratorio

export interface DocumentSection {
  id: string;
  title: string;
  category: 'Hormigón' | 'Geotecnia' | 'Acero y Estructuras' | 'Acústica' | 'Seguridad y EPIs' | 'Cubiertas y Fachadas' | 'ISO 9001 y Calidad' | 'Operativa y Logística' | 'Instalaciones RITE' | 'Topografía y Estructuras';
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
2. El cono se llena en tres capas de igual volumen, compactando cada una con 25 golpes uniformes de la varilla normalizada de 16 mm con punta semiesférica.
3. El desmoldeo se ejecuta verticalmente con suavidad en un tiempo de 2 a 5 segundos sin movimientos laterales.
4. Medición del asentamiento en milímetros. Tolerancia admisible: ± 20 mm respecto a la consistencia especificada en el albarán (Fluida: 10-15 cm, Blanda: 6-9 cm, Seca: 0-2 cm, Plástica: 3-5 cm).

FABRICACIÓN Y CURADO DE PROBETAS CILÍNDRICAS (15x30 cm):
- Se fabrican series mínimas de 4 probetas por lote (2 para rotura a 7 días como indicador preventivo de resistencia y 2 para rotura oficial a 28 días según UNE-EN 12390-3).
- Las probetas permanecen en obra protegidas de la evaporación y vibraciones durante las primeras 24 horas (temperatura controlada entre 15ºC y 25ºC).
- Traslado al laboratorio central dentro de las 24-36 horas posteriores al vertido para inmersión inmediata en la cámara húmeda (20ºC ± 2ºC y humedad relativa ≥ 95%).
    `,
    tags: ['hormigón', 'cono de abrams', 'probetas', 'une-en 12350-2', 'rotura', '28 días', 'cámara húmeda', 'asentamiento', 'código estructural'],
  },
  {
    id: 'DOC-02',
    title: 'Protocolo de Ensayos Geotécnicos y Control de Cimentaciones Superficiales y Profundas',
    category: 'Geotecnia',
    content: `
CRITERIOS DE CONFORMIDAD EN ENSAYOS DE TERRENO Y CIMENTACIÓN:
1. Ensayos de Penetración Dinámica Superpesada (DPSH) según UNE 103801:
   - Se registra el golpeo N20 cada 20 cm de hinca continua de la puntaza cónica.
   - Si se alcanzan más de 100 golpes en un tramo de 20 cm se declara formalmente rechazo técnico, verificando la cota del estrato portante competente frente al informe geotécnico.
2. Ensayos de Carga con Placa (UNE 103807):
   - Diámetro de placa estándar: 300 mm o 600 mm según tamaño máximo de árido del relleno o explanada.
   - Se determina el módulo de deformación de primer ciclo (Ev1) y de segundo ciclo (Ev2). La relación de compactación Ev2/Ev1 no debe superar 2.2 para rellenos tipo todo-uno o zahorra artificial.
3. Control de Armaduras en Cimentaciones:
   - Verificación estricta de recubrimientos mínimos con separadores de hormigón homologados (mínimo 50 mm en contacto con el terreno, 70 mm en hormigonado directo contra tierras sin hormigón de limpieza).
   - Comprobación de solapes, patillas de anclaje y atados antes de la autorización del vertido de hormigón.
    `,
    tags: ['geotecnia', 'cimentaciones', 'dpsh', 'placa de carga', 'armaduras', 'recubrimientos', 'terreno', 'spt', 'estrato'],
  },
  {
    id: 'DOC-03',
    title: 'Control de Acero Estructural B500SD y Soldeo en Estructuras Metálicas',
    category: 'Acero y Estructuras',
    content: `
CONTROL DE ACERO CORRUGADO PARA HORMIGÓN ARMADO (B500SD):
1. Verificación de Marcado y Certificación:
   - El acero debe ostentar marca de calidad oficialmente reconocida (AENOR o equivalente) y distintivo de soldabilidad especial (SD) según UNE 36065.
2. Ensayos Mecánicos Obligatorios (UNE-EN ISO 15630-1):
   - Límite elástico característico fy ≥ 500 MPa.
   - Resistencia a la tracción fs ≥ 575 MPa, cumpliendo la relación estricta 1.15 ≤ fs/fy ≤ 1.35 para ductilidad en zonas sísmicas.
   - Alargamiento bajo carga máxima Agt ≥ 7.5%.
   - Ensayo de doblado-desdoblado a 90º sin fisuras ni agrietamientos en la zona traccionada.
3. Inspección No Destructiva de Soldaduras en Obra:
   - Inspección visual al 100% de los cordones de soldadura según UNE-EN ISO 17637.
   - Control por Líquidos Penetrantes (UNE-EN ISO 3452-1) o Ultrasonidos (UNE-EN ISO 17640) en uniones a tope críticas y nudos pórtico.
    `,
    tags: ['acero', 'b500sd', 'estructuras', 'soldadura', 'líquidos penetrantes', 'límite elástico', 'ductilidad', 'armaduras'],
  },
  {
    id: 'DOC-04',
    title: 'Ensayos de Aislamiento Acústico en Edificación (CTE DB-HR)',
    category: 'Acústica',
    content: `
METODOLOGÍA DE EVALUACIÓN ACÚSTICA IN SITU:
1. Medición de Aislamiento a Ruido Aéreo entre Recintos (UNE-EN ISO 16283-1):
   - Emisión de ruido rosa o blanco mediante fuente dodecaédrica omnidireccional y amplificador de potencia.
   - Medición de niveles de presión sonora con sonómetro integrador de precisión Clase 1 en recinto emisor y receptor.
   - Determinación del tiempo de reverberación T60 según UNE-EN ISO 3382-2 para cálculo de la diferencia de niveles estandarizada DnT,A (mínimo exigible según CTE DB-HR: 50 dBA entre unidades de uso distintas).
2. Medición de Ruido de Impactos (UNE-EN ISO 16283-2):
   - Uso de máquina de impactos normalizada de cinco martillos de 500 g con caída libre de 40 mm.
   - Nivel de presión de ruido de impactos estandarizado L'nT,w no debe superar 65 dB en recintos habitables protegidos.
    `,
    tags: ['acústica', 'db-hr', 'aislamiento', 'ruido aéreo', 'impactos', 'sonómetro', 'reverberación', 'dnt,a'],
  },
  {
    id: 'DOC-05',
    title: 'Protocolo de Seguridad en Obra y Equipos de Protección Individual (EPIs)',
    category: 'Seguridad y EPIs',
    content: `
MEDIDAS DE PREVENCIÓN Y SEGURIDAD LABORAL VINCULANTES (RD 1627/1997):
1. Equipos de Protección Individual (EPI) de uso obligatorio para todo técnico en visita de obra:
   - Casco de seguridad homologado para la construcción según norma UNE-EN 397 con barbuquejo en trabajos en altura.
   - Calzado de seguridad con puntera de protección (resistencia a impacto 200 J) y plantilla antiperforación según UNE-EN ISO 20345 (categoría S3).
   - Chaleco o prenda reflectante de alta visibilidad Clase 2 según UNE-EN ISO 20471.
   - Gafas de protección ocular frente a salpicaduras químicas de hormigón fresco y partículas según UNE-EN 166.
2. Trabajos con Riesgo Especial de Caída en Altura (> 2 metros):
   - Obligatorio uso de arnés de cuerpo entero UNE-EN 361 amarrado a línea de vida certificada o punto de anclaje UNE-EN 795. Prohibido permanecer en bordes de forjado desprotegidos sin barandilla perimetral de 1.0 m con rodapié de 15 cm.
    `,
    tags: ['seguridad', 'epis', 'prevención', 'casco', 'calzado s3', 'arnés', 'altura', 'protección'],
  },
  {
    id: 'DOC-06',
    title: 'Control de Estanqueidad de Cubiertas Planas e Inclinadas (CTE DB-HS 1)',
    category: 'Cubiertas y Fachadas',
    content: `
PROCEDIMIENTO DE CONTROL DE IMPERMEABILIZACIÓN:
1. Prueba de Estanqueidad por Inundación en Cubiertas Planas:
   - Tapado estanco de todas las bajantes y cazoletas de desagüe mediante balones obturadores neumáticos homologados.
   - Inundación con lámina continua de agua limpia de 5 cm a 10 cm de altura sobre el punto más alto de la cubierta.
   - La prueba debe mantenerse durante un tiempo mínimo ininterrumpido de 48 horas.
   - Inspección diaria de los techos inferiores, juntas de dilatación y encuentros con paramentos verticales para constatar ausencia total de humedades, gotas o filtraciones.
2. Ensayos de Permeabilidad al Aire y Estanqueidad al Agua en Fachadas (UNE-EN 1026 y UNE-EN 1027):
   - Ensayos in situ mediante campana presurizada o rociado uniforme con caudal de 2 l/min por m² durante 30 minutos a presión constante.
    `,
    tags: ['cubiertas', 'estanqueidad', 'impermeabilización', 'inundación', '48 horas', 'filtraciones', 'fachadas', 'cte db-hs1'],
  },
  {
    id: 'DOC-07',
    title: 'Guía Operativa de Visitas a Obra, Desplazamientos y Seguridad Laboral',
    category: 'Operativa y Logística',
    content: `
NORMATIVA DE JORNADA Y TRASLADOS DE TÉCNICOS:
1. Horario de Jornada Laboral:
   - La jornada oficial de inspección en campo está fijada de 08:00 a 17:00 h (Europe/Madrid). Toda visita debe empezar a partir de las 08:00 y concluir a las 17:00 h como máximo.
2. Margen de Desplazamiento entre Obras Diferentes:
   - Se exige un tiempo de traslado mínimo estricto de 30 minutos entre visitas consecutivas en emplazamientos distintos para garantizar conducción prudente, reposición y limpieza de equipos de ensayo (conos, varillas, mazas) y transporte seguro de probetas en cajón con arena amortiguadora.
   - Si se encadenan visitas en la misma obra de forma consecutiva, el margen requerido es de 0 minutos.
3. Cancelaciones:
   - Toda visita cancelada pasa inmediatamente a estado 'CANCELLED', liberando la franja horaria del técnico para nuevas urgencias de laboratorio o inspección, manteniéndose registrada en el sistema por exigencia de auditoría de trazabilidad ISO 9001.
    `,
    tags: ['desplazamiento', 'jornada laboral', 'seguridad', '30 minutos', 'cancelación', '08:00', '17:00', 'logística', 'rutas'],
  },
  {
    id: 'DOC-08',
    title: 'Sistema de Gestión de la Calidad ISO 9001: Trazabilidad, Ensayos y Cadena de Custodia',
    category: 'ISO 9001 y Calidad',
    content: `
REQUISITOS DEL SISTEMA INTEGRADO DE CALIDAD EN LABORATORIO Y OBRA:
1. Cadena de Custodia de Muestras:
   - Todo lote de probetas o áridos recogido por los técnicos debe incorporar etiqueta inviolable con código alfanumérico único, obra de procedencia, fecha y hora exacta de hormigonado y firma de la dirección de obra.
2. Gestión de No Conformidades (PNC-04):
   - Advertencia Temprana: si la rotura preventiva a 7 días no alcanza el 65% del fck previsto, se emite aviso telemático inmediato al Director Facultativo.
   - Dictamen Definitivo a 28 días: si el resultado no cumple el criterio de aceptación del Código Estructural, se abre expediente de No Conformidad con plazo de subsanación de 15 días y activación obligatoria de ensayos no destructivos (esclerometría UNE-EN 12504-2, ultrasonidos UNE-EN 12504-4 o extracción de testigos taladrados UNE-EN 12504-1).
3. Calibración Periódica de Instrumentos:
   - Prensas de compresión calibradas anualmente por entidad acreditada ENAC con precisión Clase 1.
    `,
    tags: ['iso 9001', 'no conformidad', 'calidad', 'rotura 7 días', 'esclerometría', 'testigos', 'enac', 'laboratorio', 'trazabilidad'],
  },
  {
    id: 'DOC-09',
    title: 'Protocolo de Pruebas de Presión Hidráulica en Instalaciones Térmicas (RITE)',
    category: 'Instalaciones RITE',
    content: `
PRUEBAS DE RESISTENCIA Y ESTANQUEIDAD EN TUBERÍAS Y CLIMATIZACIÓN:
1. Preparación de la Red:
   - Desconexión o aislamiento previo de calderas, bombas de calor, vasos de expansión y válvulas de seguridad taradas por debajo de la presión de prueba.
   - Llenado del circuito con agua limpia desde el punto más bajo purgando meticulosamente el aire en los purgadores altos.
2. Presión y Tiempo de Ensayo:
   - La presión de prueba hidráulica en frío debe ser igual a 1.5 veces la presión máxima efectiva de trabajo, con un valor mínimo de 6 bar.
   - Se mantiene la presión durante un lapso mínimo de 2 horas.
   - Criterio de conformidad: la caída de presión en manómetro de precisión (escala 0.1 bar) debe ser nula (0.0 bar) y no debe detectarse fuga ni sudoración en ninguna unión prensada, roscada o soldada.
    `,
    tags: ['rite', 'instalaciones', 'presión hidráulica', 'estanqueidad', 'fontanería', 'climatización', 'tuberías'],
  },
  {
    id: 'DOC-10',
    title: 'Control Dimensional, Replanteo y Tolerancias de Estructuras (UNE-EN 13670)',
    category: 'Topografía y Estructuras',
    content: `
VERIFICACIÓN TOPOGRÁFICA Y GEOMÉTRICA DE ESTRUCTURAS DE HORMIGÓN Y ACERO:
1. Instrumental Topográfico Requerido:
   - Estación total electrónica con distanciómetro láser calibrado con precisión angular igual o inferior a 2 segundos y nivel óptico automático de alta sensibilidad.
2. Tolerancias Admisibles según UNE-EN 13670 (Clase 1 normal):
   - Desplome vertical de pilares y pantallas: máximo h/300 o 15 mm en una planta, y máximo h/500 o 30 mm en la altura total del edificio.
   - Nivelación de forjados: tolerancia de cota ± 15 mm respecto a la rasante de replanteo oficial.
   - Rectitud de alineaciones: desviación no superior a 10 mm en tramos de 10 metros.
3. Procedimiento ante Desviaciones:
   - Si se supera la tolerancia geométrica admisible, se paraliza el montaje de plantas superiores y se exige recálculo estructural firmado por el calculista de la obra.
    `,
    tags: ['topografía', 'control dimensional', 'desplome', 'tolerancias', 'replanteo', 'estación total', 'niveles', 'une-en 13670'],
  },
  {
    id: 'DOC-11',
    title: 'Protocolo de Rutas, Desplazamientos y Logística de Inspección en el Vallès',
    category: 'Operativa y Logística',
    content: `
PROTOCOLO DINÁMICO DE RUTAS Y LOGÍSTICA DE LABORATORIO (VALLÈS Y ÁREA METROPOLITANA):
1. Modelo Dinámico de Traslado (Regla B):
   - El tiempo de desplazamiento entre visitas técnicas se calcula en base a matrices calibradas de tráfico y distancias reales por red viaria (C-58, C-16, AP-7, B-30, C-60).
   - Todo trayecto entre obras distintas incorpora un margen de seguridad logístico obligatorio de +5 minutos (buffer) destinado a aparcamiento, control de accesos a obra, custodia térmica de probetas frescas en cajón amortiguado y limpieza/acondicionamiento del cono de Abrams y varillas normalizadas.
2. Tiempos Calibrados de Referencia en el Vallès:
   - Terrassa <-> Sabadell (C-58, ~10.5 km): 14 min conducción + 5 min buffer = 19 min de traslado mínimo.
   - Terrassa <-> Rubí (C-16, ~11.2 km): 15 min conducción + 5 min buffer = 20 min de traslado mínimo.
   - Terrassa <-> Sant Cugat (C-16/B-30, ~17.8 km): 19 min conducción + 5 min buffer = 24 min de traslado mínimo.
   - Terrassa <-> Granollers (C-155/AP-7, ~31.5 km): 27 min conducción + 5 min buffer = 32 min de traslado mínimo.
   - Sabadell <-> Sant Cugat (AP-7/B-30, ~15.1 km): 17 min conducción + 5 min buffer = 22 min de traslado mínimo.
   - Sabadell <-> Granollers (AP-7, ~22.4 km): 22 min conducción + 5 min buffer = 27 min de traslado mínimo.
   - Granollers <-> Mataró (C-60 Túnel de Parpers, ~17.6 km): 18 min conducción + 5 min buffer = 23 min de traslado mínimo.
   - Barcelona 22@ <-> Sabadell/Terrassa (C-58, ~26-33 km): 26 a 32 min conducción + 5 min buffer = 31 a 37 min de traslado.
3. Consecutividad en la Misma Obra:
   - Si dos visitas se realizan en el mismo emplazamiento, el tiempo de traslado requerido es estrictamente de 0 minutos (continuidad operativa inmediata).
4. Fallback y Casos Especiales:
   - Para municipios no tabulados, el sistema aplica la fórmula geodésica Haversine afectada por un factor de tortuosidad vial de 1.32 más 5 minutos de buffer. En ausencia de coordenadas se aplica el margen preventivo por defecto de 30 minutos.
    `,
    tags: ['rutas', 'valles', 'desplazamiento', 'c-58', 'ap-7', 'c-16', 'c-60', 'terrassa', 'sabadell', 'sant cugat', 'rubi', 'granollers', 'mataro', 'buffer 5 min', 'logistica'],
  },
];
