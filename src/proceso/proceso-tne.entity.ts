import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Alumno } from '../alumno/alumno.entity';

@Entity('proceso_tne')
export class ProcesoTne {
  @PrimaryColumn({ type: 'integer' })
  periodo: number;

  @PrimaryColumn({ type: 'integer' })
  rut_num: number;

  @ManyToOne(() => Alumno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rut_num', referencedColumnName: 'rut_num' })
  alumno: Alumno;

  // Pago
  @Column({ type: 'date', nullable: true })
  fecha_pago?: string | null;

  @Column({ type: 'text', nullable: true })
  tipo_alumno?: string | null;

  // Estado consolidado
  @Column({ type: 'text', nullable: true })
  estado_final?: string | null;

  @Column({ type: 'text', nullable: true })
  pendiente?: string | null;

  // Mínimos JUNAEB
  @Column({ type: 'text', nullable: true })
  proceso_junaeb?: string | null; // FOTOGRAFÍA | REVALIDACIÓN

  @Column({ type: 'text', nullable: true })
  estado_junaeb?: string | null; // TNE_ENTREGADA | ACEPTADA | REVALIDADO | FOTOGRAFIADO | RECHAZADA

  @Column({ type: 'text', nullable: true })
  motivo_rechazo?: string | null;

  @Column({ type: 'text', nullable: true })
  numero_ot?: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_inscripcion?: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_atencion?: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_entrega_u?: string | null;

  // Invitados / Asistentes (mínimos)
  @Column({ type: 'integer', nullable: true })
  lista_retiro?: number | null; // 0/1

  @Column({ type: 'integer', nullable: true })
  retiro_confirmado?: number | null; // 0/1

  @Column({ type: 'integer', nullable: true })
  con_huella?: number | null; // 0/1

  @Column({ type: 'datetime', nullable: true })
  fecha_retiro?: string | null;

  @Column({ type: 'text', nullable: true })
  medio_ingreso?: string | null;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
