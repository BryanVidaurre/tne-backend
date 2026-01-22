import { rutToDisplay } from '../common/rut.util';

export function buildEstadoEmail(params: {
  nombre: string;
  rut_num: number;
  rut_dv?: string | null;
  periodo: number;
  estado_final: string;
  pendiente?: string | null;
  proceso_junaeb?: string | null;
  estado_junaeb?: string | null;
  motivo_rechazo?: string | null;
  fecha_entrega_u?: string | null;
  fecha_retiro?: string | null;
  medio_ingreso?: string | null;
}) {
  const rut = rutToDisplay(params.rut_num, params.rut_dv);
  const p = params;

  const lines: string[] = [];
  lines.push(`<p>Hola ${escapeHtml(p.nombre || 'estudiante')},</p>`);
  lines.push(`<p><b>Periodo:</b> ${p.periodo}<br/>`);
  lines.push(`<b>RUT:</b> ${rut}<br/>`);
  lines.push(
    `<b>Estado:</b> ${escapeHtml(p.estado_final)}${p.pendiente ? ` (<b>Pendiente:</b> ${escapeHtml(p.pendiente)})` : ''}</p>`,
  );

  if (p.proceso_junaeb || p.estado_junaeb) {
    lines.push(
      `<p><b>JUNAEB:</b> ${escapeHtml(p.proceso_junaeb || '')} ${escapeHtml(p.estado_junaeb || '')}</p>`,
    );
  }
  if (p.motivo_rechazo) {
    lines.push(`<p><b>Motivo rechazo:</b> ${escapeHtml(p.motivo_rechazo)}</p>`);
  }
  if (p.fecha_entrega_u) {
    lines.push(
      `<p><b>Entrega a Universidad:</b> ${escapeHtml(p.fecha_entrega_u)}</p>`,
    );
  }
  if (p.fecha_retiro) {
    lines.push(
      `<p><b>Retiro registrado:</b> ${escapeHtml(p.fecha_retiro)}${p.medio_ingreso ? ` (${escapeHtml(p.medio_ingreso)})` : ''}</p>`,
    );
  }

  lines.push(`<p>Este correo es informativo.</p>`);

  return `
  <div style="font-family:Arial,sans-serif; max-width:600px">
    ${lines.join('\n')}
  </div>`;
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );
}
