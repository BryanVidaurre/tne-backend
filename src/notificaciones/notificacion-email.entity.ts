import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Alumno } from '../alumno/alumno.entity';

@Entity('notificacion_email')
@Index(['periodo', 'rut_num', 'tipo_notificacion'], { unique: true })
export class NotificacionEmail {
  @PrimaryGeneratedColumn()
  notif_id: number;

  @Column({ type: 'integer' })
  periodo: number;

  @Column({ type: 'integer' })
  rut_num: number;

  @ManyToOne(() => Alumno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rut_num', referencedColumnName: 'rut_num' })
  alumno: Alumno;

  @Column({ type: 'text' })
  tipo_notificacion: string; // ENTREGADA_AL_ALUMNO | SIN_REGISTRO_JUNAEB

  @Column({ type: 'integer', default: 0 })
  estado_enviado: number; // 0/1

  @Column({ type: 'datetime', nullable: true })
  sent_at?: string | null;

  @Column({ type: 'text', nullable: true })
  to_email?: string | null;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
