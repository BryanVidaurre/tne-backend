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
  periodo_tne?: string | null;
  institucion?: string | null;
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

Su tarjeta TNE ha llegado, debe retirarla en la DAE en el siguiente horario: Mañana 9:00 - 13:00   Tarde 14:00 - 16:00.

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad de Tarapacá
`;

    case 'RETIRADA':
      return `
Estimado/a ${nombre},

Registramos que su tarjeta TNE ya fue retirada.

Si esta información no corresponde, le solicitamos comunicarse con la unidad responsable para su revisión.

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad de Tarapacá
`;

    case 'ACEPTADA':
      return `
Estimado/a ${nombre},

La inscipción de su tarjeta TNE ha sido realizada. Ahora debe esperar la aprobación de la fotografía para proceder con la impresión de su TNE. Si aún no se ha tomado la foto, debe acercarse a la oficina de Junaeb (Las Acacias 2006 de 9:00 a 17:00 horas).

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad de Tarapacá
`;

    case 'FOTOGRAFIADO':
      return `
Estimado/a ${nombre},

Su TNE se encuentra en impresión. Cuando llegue, se le notificará por su correo institucional.

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad de Tarapacá
`;

    case 'REVALIDADO':
      return `
Estimado/a ${nombre},

Su TNE se encuentra en impresión. Cuando llegue, se le notificará por su correo institucional.

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad de Tarapacá
`;

    case 'RECHAZADA':
      return `
Estimado/a ${nombre},

Su solicitud TNE figura como RECHAZADA en el reporte de JUNAEB.

Motivo: ${p.motivo_rechazo ?? 'No especificado'}

Le recomendamos acercarse a la unidad responsable para regularizar su situación.

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad de Tarapacá
`;

    case 'SIN_REGISTRO_JUNAEB': {
      const periodoTne = (p.periodo_tne ?? String(p.periodo ?? '')).trim();
      const institucion = (p.institucion ?? '').trim();
      return `
Estimado/a ${nombre},

USTED FIGURA CON UN PASE ${periodoTne} DE LA ${institucion || 'INSTITUCION'}, SOLO DEBE REVALIDAR EL SELLO. SI NO TIENE SU PASE DEBE SOLICITAR UNA REPOSICION DE TARJETA EN JUNAEB (Las acacias 2006, Lunes a viernes de 9:00 a 17:00 horas)

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad de Tarapacá
`;
    }

    default:
      return `
Estimado/a ${nombre},

Su estado de tarjeta TNE fue actualizado en el sistema.

Estado: ${p.estado_final}

RUT: ${rut}
Período: ${p.periodo}

Atentamente,
Dirección de Asuntos Estudiantiles
Universidad de Tarapacá
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
