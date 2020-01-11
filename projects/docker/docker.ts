import * as Dockerode from 'dockerode';
import * as Stream from 'stream';
import { from, Observable, Observer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { join } from 'path';
import { readdirSync } from 'fs';

import { Dockerfile } from './dockerfile';
import { writeFile } from './reactify';
import EventEmitter = NodeJS.EventEmitter;

const DOCKERFILE_NAME = 'Dockerfile';

export interface RunOptions {
  container: string;
  cmd?: string[];
  stream?: Stream[];
  createOptions?: any[];
  startOptions?: any;
}

export interface BuildImageOptions {
  imageName: string;
}

export interface BuildImageProgress {
  stream: string;
}

export class Docker {

  private delegate: Dockerode = new Dockerode();
  private root: string = process.cwd();

  buildImage(options: BuildImageOptions): Observable<BuildImageProgress> {
    return this.createTmpDockerfile(options.imageName).pipe(
      mergeMap(() => this.buildImageDelegate(options.imageName)),
      mergeMap(this.followProgress.bind(this)),
    );
  }

  run(options: RunOptions): Observable<BuildImageProgress> {
    return this.runDelegate(options);
  }

  cleanup(): void {
    // unlinkSync(join(this.root, DOCKERFILE_NAME));
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

  private runDelegate(options: RunOptions): Observable<BuildImageProgress> {
    const defaultOptions = {
      stream: [process.stdout, process.stderr],
      createOptions: { Tty: false },
    };
    const { container, cmd, stream, createOptions, startOptions } = { ...defaultOptions, ...options };

    return new Observable<BuildImageProgress>((observer: Observer<BuildImageProgress>) => {
      const hub: EventEmitter = this.delegate.run(
        container,
        cmd,
        stream,
        createOptions,
        startOptions,
        (err) => observer.error(err.message),
      );

      hub.on('container', (data) => {
        observer.next({ stream: `Container with id: ${data.id} was created` });
        observer.complete();
      });
    });
  }

  private createTmpDockerfile(projectName: string): Observable<void> {
    return writeFile(join(this.root, DOCKERFILE_NAME), Dockerfile(projectName));
  }

  private followProgress(stream: ReadableStream): Observable<boolean> {
    return new Observable<boolean>((observer: Observer<boolean>) => {
      this.delegate.modem.followProgress(stream,
        (err, res) => {
          if (err) {
            observer.error(err);
          }

          if (res) {
            observer.complete();
          }
        },
        (progress) => observer.next(progress),
      );
    });
  }
}
