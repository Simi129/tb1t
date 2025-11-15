import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  @Index()
  telegram_id: number;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn()
  created_at: Date;
}