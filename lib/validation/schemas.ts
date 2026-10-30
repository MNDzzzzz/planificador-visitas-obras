import { z } from 'zod';

export const createVisitSchema = z.object({
  technicianId: z.string().min(1, 'Debe seleccionar un técnico.'),
  siteId: z.string().min(1, 'Debe seleccionar una obra.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (debe ser YYYY-MM-DD).'),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (debe ser HH:mm).'),
  durationMinutes: z
    .number({ invalid_type_error: 'La duración debe ser un número entero.' })
    .int('La duración debe ser un número entero en minutos.')
    .positive('La duración debe ser mayor a 0 minutos.')
    .max(540, 'La duración no puede superar una jornada completa (540 minutos).'),
  notes: z.string().optional().nullable(),
});

export const cancelVisitSchema = z.object({
  visitId: z.string().min(1, 'ID de visita requerido.'),
});

export type CreateVisitSchemaType = z.infer<typeof createVisitSchema>;
export type CancelVisitSchemaType = z.infer<typeof cancelVisitSchema>;
