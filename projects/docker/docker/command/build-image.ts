import { json } from '@angular-devkit/core';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { from, Observable, Observer } from 'rxjs';
import * as Dockerode from 'dockerode';
import { mergeMap } from 'rxjs/operators';
import { existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

import { Command, CommandExecutionProgress, runCommand } from '../command';
import { DockerBuildSchema } from '../../build-image/schema';
import { writeFile } from '../reactify';
import { Dockerfile } from '../dockerfile';


export function createBuildImageBuilder() {
  return createBuilder<json.JsonObject & DockerBuildSchema>(
    (schema: DockerBuildSchema, context: BuilderContext): Observable<BuilderOutput> => {
      return runCommand({ schema, context, command: new BuildImageCommand() });
    },
  );
}

const DOCKERFILE_NAME = 'Dockerfile';

export interface BuildImageOptions {
  imageName: string;
  buildCommand: string;
  verbose: boolean;
}

export class BuildImageCommand implements Command<DockerBuildSchema> {

  private delegate: Dockerode = new Dockerode();
  private root: string = process.cwd();

  execute(schema: DockerBuildSchema, context: BuilderContext): Observable<CommandExecutionProgress> {
    const imageName: string = this.createImageName(schema, context);
    return this.buildImage({ imageName, buildCommand: schema.buildCommand, verbose: schema.verbose });
  }

  cleanup(): void {
    const dockerfile = join(this.root, DOCKERFILE_NAME);

    if (existsSync(dockerfile)) {
      unlinkSync(dockerfile);
    }
  }

  private buildImage(options: BuildImageOptions): Observable<CommandExecutionProgress> {
    return this.createTmpDockerfile(options.imageName, options.buildCommand).pipe(
      mergeMap(() => this.buildImageDelegate(options.imageName)),
      mergeMap((stream: ReadableStream) => this.followProgress(stream, options.verbose)),
    );
  }

  private buildImageDelegate(t: string): Observable<ReadableStream> {
    const ignore = ['node_modules', '.git', '.gitignore', '.idea', '.editorconfig'];
    const files: string[] = readdirSync(process.cwd())
      .filter((file: string) => !ignore.includes(file));
    files.push(DOCKERFILE_NAME);

    return from<Observable<ReadableStream>>(this.delegate.buildImage({
      context: this.root,
      src: files,
    }, { t }));
  }

  private createTmpDockerfile(projectName: string, buildCommand: string): Observable<void> {
    return writeFile(join(this.root, DOCKERFILE_NAME), Dockerfile(projectName, buildCommand));
  }

  private followProgress(stream: ReadableStream, verbose: boolean): Observable<CommandExecutionProgress> {
    return new Observable<CommandExecutionProgress>((observer: Observer<CommandExecutionProgress>) => {
      this.delegate.modem.followProgress(stream,
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
