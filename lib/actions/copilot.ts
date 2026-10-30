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
    console.error('Error en askCopilotAction:', error);
    return {
      success: false,
      error: 'Error procesando la consulta técnica con la IA.',
    };
  }
}
