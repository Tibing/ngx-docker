export interface DockerBuildSchema {
  project: string;
  buildCommand: string;
  nodeVersion: string;
  verbose: boolean;
}
