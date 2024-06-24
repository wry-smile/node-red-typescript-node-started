export enum MQTTInOperation {
  UpperCase = "upper",
  LowerCase = "lower",
}

export interface MQTTInOptions {
  operation: string;
}
