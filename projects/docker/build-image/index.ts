import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { DockerBuilderSchema } from './schema';
import { Docker } from '../docker';

export default createBuilder<json.JsonObject & DockerBuilderSchema>(
  (schema: DockerBuilderSchema, context: BuilderContext): Observable<BuilderOutput> => {
    const docker = new Docker();
    const imageName = resolveProject(schema, context);

    return docker.buildImage({ imageName }).pipe(
      tap(out => context.logger.info(JSON.stringify(out))),
      map(() => ({ success: true })),
      catchError((err) => {
        context.logger.info(`Error: ${err.stack}`);
        return of(({ success: false }));
      }),
    );
  },
);

function resolveProject(schema: DockerBuilderSchema, context: BuilderContext): string {
  if (schema.project) {
    return schema.project;
  }

  if (context.target) {
    return context.target.project;
  }

  throw new Error(`Please, provide project name for the builder.`);
}
