export const CLOCK = Symbol('CLOCK');

export interface IClock {
  now(): Date;
}
