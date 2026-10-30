// Tipos y contratos unificados para el Planificador de Visitas a Obras

export type VisitStatusType = 'SCHEDULED' | 'CANCELLED';

export interface TechnicianDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  color: string;
}

export interface SiteDTO {
  id: string;
  name: string;
  municipality: string;
  address: string;
}

export interface VisitDTO {
  id: string;
  technicianId: string;
  technician?: TechnicianDTO;
  siteId: string;
  site?: SiteDTO;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  endTime: string; // HH:mm
  status: VisitStatusType;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVisitInput {
  technicianId: string;
  siteId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  notes?: string | null;
}

export type ValidationErrorCode =
  | 'OUTSIDE_WORKING_HOURS'
  | 'TECHNICIAN_OVERLAP'
  | 'INSUFFICIENT_TRAVEL_TIME'
  | 'INVALID_DURATION'
  | 'INVALID_TIME_FORMAT';

export interface ValidationSuccess {
  isValid: true;
}

export interface ValidationFailure {
  isValid: false;
  code: ValidationErrorCode;
  message: string;
  rule: 'RULE_A' | 'RULE_B' | 'RULE_C';
  details?: {
    conflictingVisitId?: string;
    conflictingSiteName?: string;
    conflictingInterval?: string;
    requiredGapMinutes?: number;
    actualGapMinutes?: number;
    direction?: 'PREVIOUS' | 'NEXT';
  };
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  rule?: 'RULE_A' | 'RULE_B' | 'RULE_C';
  code?: ValidationErrorCode;
  details?: unknown;
}
