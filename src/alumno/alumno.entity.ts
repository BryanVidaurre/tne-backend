import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('alumno')
export class Alumno {
  @PrimaryColumn({ type: 'integer' })
  rut_num: number; // PK sin DV

  @Column({ type: 'text', nullable: true })
  rut_dv?: string | null;

  @Column({ type: 'text', nullable: true })
  nombre?: string | null;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
