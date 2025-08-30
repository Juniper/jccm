// Bootstraps Monaco + YAML workers (safe to call multiple times)
export function bootstrapMonacoWorkers() {
    // Avoid re-initializing if hot-reloaded
    if (self.MonacoEnvironment && self.MonacoEnvironment.__jccmBootstrapped) return;

    self.MonacoEnvironment = {
        __jccmBootstrapped: true,
        getWorker(_, label) {
            if (label === 'yaml') {
                return new Worker(
                    new URL('monaco-yaml/yaml.worker.js', import.meta.url),
                    { type: 'module' }
                );
            }
            return new Worker(
                new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
                { type: 'module' }
            );
        },
    };
}