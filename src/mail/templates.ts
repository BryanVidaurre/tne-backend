import { rutToDisplay } from '../common/rut.util';

type EstadoEmailParams = {
  nombre: string;
  rut_num: number;
  rut_dv?: string | null;
  periodo: number;

  estado_final: string; // RETIRADA | LISTA_RETIRO_U | EN_PROCESO_* | RECHAZADA | SIN_REGISTRO_JUNAEB
  pendiente?: string | null;

  proceso_junaeb?: string | null; // FOTOGRAFÍA | REVALIDACIÓN
  estado_junaeb?: string | null; // TNE ENTREGADA | ACEPTADA | REVALIDADO | FOTOGRAFIADO | RECHAZADA (según tu fuente)
  motivo_rechazo?: string | null;

  fecha_entrega_u?: string | null;
  fecha_retiro?: string | null;
  medio_ingreso?: string | null;
};

export function buildEstadoEmail(p: EstadoEmailParams) {
  const rut = rutToDisplay(p.rut_num, p.rut_dv);
  const nombre = (p.nombre || 'Estudiante').trim();

  const headerTitle = getHeaderTitle(p.estado_final);
  const badge = getBadge(p.estado_final);

  const infoRows: Array<{ k: string; v: string }> = [];
  infoRows.push({ k: 'Periodo', v: escapeHtml(String(p.periodo)) });
  infoRows.push({ k: 'RUT', v: escapeHtml(rut) });

  if (p.proceso_junaeb)
    infoRows.push({ k: 'Proceso JUNAEB', v: escapeHtml(p.proceso_junaeb) });
  if (p.estado_junaeb)
    infoRows.push({ k: 'Estado JUNAEB', v: escapeHtml(p.estado_junaeb) });

  if (p.fecha_entrega_u)
    infoRows.push({
      k: 'Recepción en Universidad',
      v: formatDateSafe(p.fecha_entrega_u),
    });

  if (p.estado_final === 'RETIRADA') {
    infoRows.push({
      k: 'Retiro registrado',
      v: `${formatDateTimeSafe(p.fecha_retiro)}${p.medio_ingreso ? ` (${escapeHtml(p.medio_ingreso)})` : ''}`,
    });
  }

  if (p.estado_final === 'LISTA_RETIRO_U') {
    infoRows.push({
      k: 'Acción requerida',
      v: 'Acercarse a retirar la tarjeta (según indicaciones de la universidad).',
    });
    if (p.pendiente)
      infoRows.push({ k: 'Pendiente', v: escapeHtml(p.pendiente) });
  }

  if (
    p.estado_final === 'EN_PROCESO_FOTO' ||
    p.estado_final === 'EN_PROCESO_REVALIDACION'
  ) {
    if (p.pendiente)
      infoRows.push({ k: 'Pendiente', v: escapeHtml(p.pendiente) });
  }

  if (p.estado_final === 'RECHAZADA') {
    infoRows.push({ k: 'Resultado', v: 'Solicitud rechazada' });
    if (p.motivo_rechazo)
      infoRows.push({ k: 'Motivo', v: escapeHtml(p.motivo_rechazo) });
  }

  const message = buildMessageBlock(p);

  const footerNote = `
    <div style="margin-top:18px;font-size:12px;line-height:1.4;color:#6b7280;">
      <div>Este correo es informativo. Los plazos y estados pueden actualizarse con nuevas cargas del sistema.</div>
      <div style="margin-top:8px;">Si no reconoces este mensaje, puedes ignorarlo.</div>
    </div>
  `;

  return `
  <div style="background:#f6f7fb;padding:24px 12px;">
    <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      
      <div style="padding:16px 18px;background:#111827;border-radius:14px;">
        <div style="font-size:12px;letter-spacing:.08em;color:#c7d2fe;text-transform:uppercase;">TNE · Estado de tu tarjeta</div>
        <div style="margin-top:6px;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(headerTitle)}</div>
        <div style="margin-top:10px;display:inline-block;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;${badge}">
          ${escapeHtml(p.estado_final)}
        </div>
      </div>

      <div style="margin-top:14px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;">
        <div style="font-size:14px;line-height:1.6;">
          <div>Hola <b>${escapeHtml(nombre)}</b>,</div>
          <div style="margin-top:6px;">Te informamos el estado de tu tarjeta TNE según registros del proceso.</div>
        </div>

        ${message}

        <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:14px;">
          <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Detalle</div>
          ${renderKeyValueTable(infoRows)}
        </div>

        ${footerNote}
      </div>

      <div style="text-align:center;margin-top:10px;font-size:11px;color:#9ca3af;">
        Universidad · Sistema de notificaciones TNE
      </div>
    </div>
  </div>`;
}

function buildMessageBlock(p: EstadoEmailParams) {
  // Mensajes claros y accionables por estado (sin “si recibiste esto fue un error” agresivo)
  if (p.estado_final === 'RETIRADA') {
    return `
      <div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#ecfdf5;border:1px solid #a7f3d0;">
        <div style="font-weight:700;color:#065f46;">Retiro confirmado</div>
        <div style="margin-top:6px;color:#065f46;font-size:13px;line-height:1.5;">
          Registramos el retiro de tu tarjeta. Si esto no corresponde, contacta al área responsable para revisión.
        </div>
      </div>`;
  }

  if (p.estado_final === 'LISTA_RETIRO_U') {
    return `
      <div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
        <div style="font-weight:700;color:#1d4ed8;">Tarjeta disponible para retiro</div>
        <div style="margin-top:6px;color:#1e3a8a;font-size:13px;line-height:1.5;">
          Tu tarjeta se encuentra en la universidad para retiro. Revisa horarios y requisitos (cédula, huella u otros) según indicación institucional.
        </div>
      </div>`;
  }

  if (p.estado_final === 'EN_PROCESO_FOTO') {
    return `
      <div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;">
        <div style="font-weight:700;color:#9a3412;">En proceso (fotografía)</div>
        <div style="margin-top:6px;color:#7c2d12;font-size:13px;line-height:1.5;">
          Tu solicitud está en trámite de fotografía. Te avisaremos cuando existan novedades relevantes (por ejemplo, tarjeta disponible o retiro confirmado).
        </div>
      </div>`;
  }

  if (p.estado_final === 'EN_PROCESO_REVALIDACION') {
    return `
      <div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;">
        <div style="font-weight:700;color:#9a3412;">En proceso (revalidación)</div>
        <div style="margin-top:6px;color:#7c2d12;font-size:13px;line-height:1.5;">
          Tu revalidación está en trámite. Te notificaremos cuando cambie a estado final.
        </div>
      </div>`;
  }

  if (p.estado_final === 'RECHAZADA') {
    const motivo = p.motivo_rechazo
      ? `<div style="margin-top:8px;"><b>Motivo:</b> ${escapeHtml(p.motivo_rechazo)}</div>`
      : '';
    return `
      <div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;">
        <div style="font-weight:700;color:#991b1b;">Solicitud rechazada</div>
        <div style="margin-top:6px;color:#7f1d1d;font-size:13px;line-height:1.5;">
          El registro indica rechazo en el proceso.${motivo}
          <div style="margin-top:8px;">Si corresponde, acércate a regularizar o corregir información según orientación institucional.</div>
        </div>
      </div>`;
  }

  if (p.estado_final === 'SIN_REGISTRO_JUNAEB') {
    return `
      <div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#f3f4f6;border:1px solid #e5e7eb;">
        <div style="font-weight:700;color:#374151;">Sin registro en JUNAEB (por ahora)</div>
        <div style="margin-top:6px;color:#374151;font-size:13px;line-height:1.5;">
          Con tu pago registrado en el periodo, aún no aparece información asociada en el reporte disponible. Esto puede deberse a desfases de actualización.
          <div style="margin-top:8px;">Te notificaremos cuando el sistema reciba un estado actualizado.</div>
        </div>
      </div>`;
  }

  return `
    <div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#f3f4f6;border:1px solid #e5e7eb;">
      <div style="font-weight:700;color:#374151;">Actualización de estado</div>
      <div style="margin-top:6px;color:#374151;font-size:13px;line-height:1.5;">
        El estado de tu tarjeta fue actualizado en el sistema.
      </div>
    </div>`;
}

function getHeaderTitle(estado_final: string) {
  switch (estado_final) {
    case 'RETIRADA':
      return 'Tarjeta retirada';
    case 'LISTA_RETIRO_U':
      return 'Tarjeta disponible para retiro';
    case 'EN_PROCESO_FOTO':
      return 'Solicitud en proceso (fotografía)';
    case 'EN_PROCESO_REVALIDACION':
      return 'Solicitud en proceso (revalidación)';
    case 'RECHAZADA':
      return 'Solicitud rechazada';
    case 'SIN_REGISTRO_JUNAEB':
      return 'Sin registro en JUNAEB';
    default:
      return 'Estado de tu tarjeta';
  }
}

function getBadge(estado_final: string) {
  // estilos inline para evitar CSS externo
  switch (estado_final) {
    case 'RETIRADA':
      return 'background:#10b981;color:#062f20;';
    case 'LISTA_RETIRO_U':
      return 'background:#2563eb;color:#ffffff;';
    case 'RECHAZADA':
      return 'background:#ef4444;color:#ffffff;';
    case 'SIN_REGISTRO_JUNAEB':
      return 'background:#6b7280;color:#ffffff;';
    default:
      return 'background:#f59e0b;color:#111827;';
  }
}

function renderKeyValueTable(rows: Array<{ k: string; v: string }>) {
  const items = rows
    .filter((r) => r.v && String(r.v).trim() !== '')
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;width:210px;color:#6b7280;font-size:12px;">${escapeHtml(r.k)}</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;font-size:13px;color:#111827;">${r.v}</td>
      </tr>
    `,
    )
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <tbody>
        ${items}
      </tbody>
    </table>`;
}

function escapeHtml(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v);
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );
}

function formatDateSafe(v?: string | null) {
  if (!v) return '-';
  return escapeHtml(String(v));
}

function formatDateTimeSafe(v?: string | null) {
  if (!v) return '-';
  return escapeHtml(String(v));
}
