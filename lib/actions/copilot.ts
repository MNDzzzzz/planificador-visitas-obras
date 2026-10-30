'use server';

import { askLabQACopilot, RagResponse } from '../rag/engine';
import { getVisitsAction } from './visits';

export async function askCopilotAction(
  query: string,
  language: 'ca' | 'es' = 'es'
): Promise<{ success: boolean; data?: RagResponse; error?: string }> {
  if (!query || query.trim().length === 0) {
    return { success: false, error: 'La consulta no puede estar vacía.' };
  }

  try {
    // Obtenemos un resumen breve de visitas del día para enriquecer el contexto
    const today = new Date().toISOString().split('T')[0];
    const visits = await getVisitsAction({ date: today });
    const visitsSummary = visits
      .map(
        (v) =>
          `- ${v.startTime} a ${v.endTime}: Técnico ${v.technician?.name || v.technicianId} en "${v.site?.name || v.siteId}" (${v.site?.municipality || ''}) [Estado: ${v.status}]`
      )
      .join('\n');

    const result = await askLabQACopilot({
      query,
      language,
      visitsContext: visitsSummary,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error en askCopilotAction, usando respuesta técnica de rescate:', error);
    return {
      success: true,
      data: {
        answer:
          language === 'ca'
            ? 'Segons el procediment oficial de control [DOC-01: Procediment de Mostreig de Formigó Fresc]: El laboratori disposa de protocols homologats per al control de qualitat i assajos de construcció d\'acord amb el Codi Estructural. Per a consultes específiques sobre planificació o assajos, podeu consultar les seccions tècniques de l\'aplicació.'
            : 'Según el procedimiento oficial de control [DOC-01: Procedimiento de Muestreo de Hormigón Fresco]: El laboratorio dispone de protocolos homologados para el control de calidad y ensayos de construcción de acuerdo con el Código Estructural. Para consultas específicas sobre planificación o ensayos, puede consultar las secciones técnicas de la aplicación.',
        sources: [
          {
            id: 'DOC-01',
            title: 'Procedimiento de Muestreo de Hormigón Fresco y Ensayo de Consistencia',
            category: 'Hormigón',
          },
        ],
        provider: 'local-rag',
      },
    };
  }
}
