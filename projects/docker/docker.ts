import * as Dockerode from 'dockerode';
import { from, Observable, Observer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { join } from 'path';
import { tmpdir } from 'os';

import { Dockerfile } from './dockerfile';
import { writeFile } from './reactify';

const DOCKERFILE_NAME = 'Dockerfile';

export interface RunOptions {
  container: string;
}

export interface BuildImageOptions {
  imageName: string;
}

export interface BuildImageProgress {
  status: string;
}

export class Docker {

  private delegate: Dockerode = new Dockerode();

  buildImage(options: BuildImageOptions): Observable<BuildImageProgress> {
    return this.createTmpDockerfile().pipe(
      mergeMap(() => this.buildImageDelegate(options.imageName)),
      mergeMap(this.followProgress.bind(this)),
    );
  }

  run(options: RunOptions): Observable<boolean> {
    return this.runDelegate(options);
  }

  private buildImageDelegate(t: string): Observable<ReadableStream> {
    return from<Observable<ReadableStream>>(this.delegate.buildImage({
      context: tmpdir(),
      src: [DOCKERFILE_NAME],
    }, { t }));
  }

  private runDelegate(options: RunOptions): Observable<boolean> {
    return from<Observable<boolean>>(this.delegate.run(options));
  }

  private createTmpDockerfile(): Observable<void> {
    const dockerfilePath = join(tmpdir(), DOCKERFILE_NAME);
    return writeFile(dockerfilePath, Dockerfile);
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
