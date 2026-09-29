export class HealthLivenessDto {
  status!: 'ok';
}

export class HealthReadinessDto {
  status!: 'ready' | 'not_ready';
  database!: 'connected' | 'unavailable';
}
