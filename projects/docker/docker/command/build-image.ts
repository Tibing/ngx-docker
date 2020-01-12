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
  nodeVersion: string;
  verbose: boolean;
}

export class BuildImageCommand implements Command<DockerBuildSchema> {

  private dockerode: Dockerode = new Dockerode();

  execute(schema: DockerBuildSchema, context: BuilderContext): Observable<CommandExecutionProgress> {
    const options: BuildImageOptions = this.createBuildImageOptions(schema, context);
    return this.buildImage(options);
  }

  private buildImage(options: BuildImageOptions): Observable<CommandExecutionProgress> {
    return this.buildImageDelegate(options).pipe(
      mergeMap((stream: ReadableStream) => this.followProgress(stream, options.verbose)),
    );
  }

  private buildImageDelegate(options: BuildImageOptions): Observable<ReadableStream> {
    const sourceArchive: ReadableStream = this.createSourceArchive(options);
    return from<Observable<ReadableStream>>(this.dockerode.buildImage(sourceArchive, { t: options.imageName }));
  }

  private createSourceArchive(options: BuildImageOptions): ReadableStream {
    const ignore = ['node_modules', '.git', '.gitignore', '.idea', '.editorconfig'];
    const files: string[] = readdirSync(process.cwd())
      .filter((f: string) => !ignore.includes(f));

    const p = pack(process.cwd(), { entries: files });
    p.entry({ name: 'Dockerfile' }, Dockerfile(options));
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

  private createBuildImageOptions(schema: DockerBuildSchema, context: BuilderContext): BuildImageOptions {
    const imageName: string = this.createImageName(schema, context);
    const nodeVersion: string = this.resolveNodeVersion(schema);
    return { ...schema, imageName, nodeVersion };
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

  private resolveNodeVersion(schema: DockerBuildSchema): string {
    // @ts-ignore
    // const majorVersion: string = process.version.match(/^v(\d+\.\d+)/)[1].split('.')[0];
    const majorVersion = '12.7-alpine';
    return schema.nodeVersion || majorVersion;
  }
}
