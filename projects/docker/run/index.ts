import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, mapTo, tap } from 'rxjs/operators';

import { DockerRunSchema } from './schema';
import { Docker } from '../docker';

export default createBuilder<json.JsonObject & DockerRunSchema>(
  (schema: DockerRunSchema, context: BuilderContext): Observable<BuilderOutput> => {
    const docker = new Docker();
    const container = resolveProject(schema, context);

    return docker.run({ container }).pipe(
      tap(out => context.logger.info(out.stream || '')),
      mapTo({ success: true }),
      catchError((error) => {
        context.logger.error(`Error: ${error}`);
        return of({ success: false });
      }),
      finalize(() => docker.cleanup()),
    );
  },
);

function resolveProject(schema: DockerRunSchema, context: BuilderContext): string {
  if (schema.project) {
    return schema.project;
  }

  if (context.target) {
    return context.target.project;
  }

  throw new Error(`Please, provide project name for the builder.`);
}
