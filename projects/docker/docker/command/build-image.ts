import { json } from '@angular-devkit/core';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { from, Observable, Observer } from 'rxjs';
import * as Dockerode from 'dockerode';
import { mergeMap } from 'rxjs/operators';
import { readdirSync } from 'fs';
import { createGzip } from 'zlib';
import { pack } from 'tar-fs';

import { Command, CommandExecutionProgress, runCommand } from '../command';
import { DockerBuildSchema } from '../../build-image/schema';
import { Dockerfile } from '../dockerfile';


export function createBuildImageBuilder() {
  return createBuilder<json.JsonObject & DockerBuildSchema>(
    (schema: DockerBuildSchema, context: BuilderContext): Observable<BuilderOutput> => {
      return runCommand({ schema, context, command: new BuildImageCommand() });
    },
  );
}

export interface BuildImageOptions {
  imageName: string;
  buildCommand: string;
  verbose: boolean;
}

export class BuildImageCommand implements Command<DockerBuildSchema> {

  private dockerode: Dockerode = new Dockerode();

  execute(schema: DockerBuildSchema, context: BuilderContext): Observable<CommandExecutionProgress> {
    const imageName: string = this.createImageName(schema, context);
    return this.buildImage({ imageName, buildCommand: schema.buildCommand, verbose: schema.verbose });
  }

  private buildImage(options: BuildImageOptions): Observable<CommandExecutionProgress> {
    return this.buildImageDelegate(options.imageName, options.buildCommand).pipe(
      mergeMap((stream: ReadableStream) => this.followProgress(stream, options.verbose)),
    );
  }

  private buildImageDelegate(t: string, buildCommand: string): Observable<ReadableStream> {
    const sourceArchive: ReadableStream = this.createSourceArchive(t, buildCommand);
    return from<Observable<ReadableStream>>(this.dockerode.buildImage(sourceArchive, { t }));
  }

  private createSourceArchive(t: string, buildCommand: string): ReadableStream {
    const ignore = ['node_modules', '.git', '.gitignore', '.idea', '.editorconfig'];
    const files: string[] = readdirSync(process.cwd())
      .filter((f: string) => !ignore.includes(f));

    const p = pack(process.cwd(), { entries: files });
    p.entry({ name: 'Dockerfile' }, Dockerfile(t, buildCommand));
    return p.pipe(createGzip());
  }

  private followProgress(stream: ReadableStream, verbose: boolean): Observable<CommandExecutionProgress> {
    return new Observable<CommandExecutionProgress>((observer: Observer<CommandExecutionProgress>) => {
      this.dockerode.modem.followProgress(stream,
        (err, res) => {
          if (err) {
            observer.error(err);
          }

          if (res) {
            observer.complete();
          }
        },
        (progress) => verbose && observer.next(progress),
      );
    });
  }

  private createImageName(schema: DockerBuildSchema, context: BuilderContext): string {
    if (schema.project) {
      return schema.project;
    }

    if (context.target) {
      return context.target.project;
    }

    throw new Error(`Please, provide project name for the builder.`);
  }
}
