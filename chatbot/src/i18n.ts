import type { Context } from 'hono';
import { requestContextFrom } from './context.js';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const translations: Record<string, Record<string, string>> = {
  en: {
    'error.audio_required': 'Audio file is required',
    'error.chat_id_required': 'Chat ID is required',
    'error.message_required': 'A user message or tool approval response is required',
    'error.text_match_required': 'Text to match is required',
    'error.text_files_required': 'Text or files are required',
    'error.invalid_entity_type': 'Invalid entity type',
    'error.messages_required': 'Messages are required',
    'error.invalid_action': 'Invalid action',
    'error.instruction_required': 'Instruction is required',
    'error.content_required': 'Content is required',
    'error.not_found': 'Not found',
    'error.tasks_cannot_delete': 'Tasks cannot be deleted directly. They are removed automatically when their associated chat session is deleted.',
    'error.cannot_change_execution_mode': 'Cannot change execution mode while the task is running.',
    'error.action_not_found': 'Action not found',
  },
  es: {
    'error.audio_required': 'El archivo de audio es obligatorio',
    'error.chat_id_required': 'El ID del chat es obligatorio',
    'error.message_required': 'Se requiere un mensaje de usuario o una respuesta de aprobación de herramienta',
    'error.text_match_required': 'El texto a coincidir es obligatorio',
    'error.text_files_required': 'El texto o los archivos son obligatorios',
    'error.invalid_entity_type': 'Tipo de entidad no válido',
    'error.messages_required': 'Los mensajes son obligatorios',
    'error.invalid_action': 'Acción no válida',
    'error.instruction_required': 'La instrucción es obligatoria',
    'error.content_required': 'El contenido es obligatorio',
    'error.not_found': 'No encontrado',
    'error.tasks_cannot_delete': 'Las tareas no se pueden eliminar directamente. Se eliminan automáticamente cuando se elimina su sesión de chat asociada.',
    'error.cannot_change_execution_mode': 'No se puede cambiar el modo de ejecución mientras la tarea está en curso.',
    'error.action_not_found': 'Acción no encontrada',
  }
};

export function t(key: string, lang: string): string {
  const normalizedLang = lang.toLowerCase();
  const dict = translations[normalizedLang] || translations['en'];
  return dict[key] || key;
}

export function errorJson(c: Context, key: string, status: ContentfulStatusCode = 400) {
  const ctx = requestContextFrom(c);
  return c.json({ error: t(key, ctx.lang) }, status);
}
