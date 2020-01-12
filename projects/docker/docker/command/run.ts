import { json } from '@angular-devkit/core';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { Observable, Observer } from 'rxjs';
import * as Dockerode from 'dockerode';
import { EventEmitter } from 'events';
import * as Stream from 'stream';

import { Command, CommandExecutionProgress, runCommand } from '../command';
import { DockerRunSchema } from '../../run/schema';


export function createRunBuilder() {
  return createBuilder<json.JsonObject & DockerRunSchema>(
    (schema: DockerRunSchema, context: BuilderContext): Observable<BuilderOutput> => {
      return runCommand({ schema, context, command: new RunCommand() });
    },
  );
}

export interface RunOptions {
  container: string;
  port: number;
  cmd?: string[];
  stream?: Stream[];
  createOptions?: any[];
  startOptions?: any;
}

export class RunCommand implements Command<DockerRunSchema> {

  private dockerode: Dockerode = new Dockerode();

  execute(schema: DockerRunSchema, context: BuilderContext): Observable<CommandExecutionProgress> {
    const container: string = this.createContainerName(schema, context);
    const port: number = schema.port;
    return this.runDelegate({ container, port });
  }

  cleanup(): void {
    // no need to cleanup after running image
  }

  private runDelegate(options: RunOptions): Observable<CommandExecutionProgress> {
    const defaultOptions = {
      stream: [process.stdout, process.stderr],
      createOptions: {
        Tty: false,
        ExposedPorts: { '80/tcp': {} },
        Hostconfig: {
          PortBindings: { '80/tcp': [{ HostPort: `${options.port}` }] },
        },
      },
      cmd: [],
    };
    const { container, cmd, stream, createOptions, startOptions } = { ...defaultOptions, ...options };

    return new Observable<CommandExecutionProgress>((observer: Observer<CommandExecutionProgress>) => {
      const hub: EventEmitter = this.dockerode.run(
        container,
        cmd,
        stream,
        createOptions,
        startOptions,
        (err) => observer.error(err.message),
      );

      hub.on('start', (data) => {
        observer.next({ stream: `Container with id: ${data.id} up and running` });
        observer.complete();
      });
    });
  }

  private createContainerName(schema: DockerRunSchema, context: BuilderContext): string {
    if (schema.project) {
      return schema.project;
    }

    if (context.target) {
      return context.target.project;
    }

    throw new Error(`Please, provide project name for the builder.`);
  }
}
