import { rutToDisplay } from '../common/rut.util';

type EstadoEmailParams = {
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
};

export function buildEstadoEmail(p: EstadoEmailParams) {
  const nombre = (p.nombre || 'Estudiante').trim();
  const rut = rutToDisplay(p.rut_num, p.rut_dv);

  const cuerpo = mensajePorEstado(p, nombre, rut);

  return `<pre style="font-family:Arial,Helvetica,sans-serif;font-size:14px;white-space:pre-wrap;line-height:1.5;margin:0;">${escapeHtml(
    cuerpo,
  )}</pre>`;
}

function mensajePorEstado(p: EstadoEmailParams, nombre: string, rut: string) {
  switch (p.estado_final) {
    case 'LISTA_RETIRO_U':
      return `
Estimado/a ${nombre},

Su Tarjeta TNE se encuentra disponible para retiro en la universidad.

Puede acercarse en los horarios informados por la institución, portando su cédula de identidad y cumpliendo los requisitos indicados para el retiro.

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad
`;

    case 'RETIRADA':
      return `
Estimado/a ${nombre},

Registramos que su tarjeta TNE ya fue retirada.

Si esta información no corresponde, le solicitamos comunicarse con la unidad responsable para su revisión.

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad
`;

    case 'ACEPTADA':
      return `
Estimado/a ${nombre},

Su solicitud TNE figura como ACEPTADA en el reporte de JUNAEB.

Esto significa que el trámite fue aprobado y continúa su curso. Le notificaremos cuando la tarjeta se encuentre disponible para retiro en la universidad.

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad
`;

    case 'FOTOGRAFIADO':
      return `
Estimado/a ${nombre},

Su solicitud TNE figura como FOTOGRAFIADO en el reporte de JUNAEB.

El trámite avanza y le notificaremos cuando la tarjeta se encuentre disponible para retiro en la universidad.

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad
`;

    case 'REVALIDADO':
      return `
Estimado/a ${nombre},

Su TNE figura como REVALIDADO en el reporte de JUNAEB.

Le notificaremos si se registra un cambio de estado relevante.

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad
`;

    case 'RECHAZADA':
      return `
Estimado/a ${nombre},

Su solicitud TNE figura como RECHAZADA en el reporte de JUNAEB.

Motivo: ${p.motivo_rechazo ?? 'No especificado'}

Le recomendamos acercarse a la unidad responsable para regularizar su situación.

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad
`;

    case 'SIN_REGISTRO_JUNAEB':
      return `
Estimado/a ${nombre},

A la fecha, su pago se encuentra registrado, pero aún no aparece información asociada en el reporte de JUNAEB.

Esto puede deberse a un desfase de actualización. Le notificaremos cuando el sistema registre un nuevo estado.

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad
`;

    default:
      return `
Estimado/a ${nombre},

Su estado de tarjeta TNE fue actualizado en el sistema.

Estado: ${p.estado_final}

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad
`;
  }
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
