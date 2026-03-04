import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class CardEntity {
  @PrimaryColumn()
  name: string; // The "Join Key"

  @Column({ nullable: true })
  hp: number;

  @Column({ nullable: true })
  level: number;

  @Column({ nullable: true })
  image: string;
}
