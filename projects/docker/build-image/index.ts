import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { DockerBuilderSchema } from './schema';
import { Docker } from '../docker';

export default createBuilder<json.JsonObject & DockerBuilderSchema>(
  (schema: DockerBuilderSchema, context: BuilderContext): Observable<BuilderOutput> => {
    console.log(`Schema: ${JSON.stringify(schema)}`);
    const docker = new Docker();
    return docker.buildImage().pipe(
      tap(out => context.logger.info(`Progress: ${JSON.stringify(out)}`)),
      map(() => ({ success: true })),
      catchError((err) => {
        context.logger.info(`Error: ${err.stack}`);
        return of(({ success: false }));
      }),
    );
  },
);

