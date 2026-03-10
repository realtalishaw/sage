import { loadInstanceWrapperConfig } from './config.js';
import { createInstanceWrapperServer } from './server.js';

// The entrypoint is intentionally tiny. All real behavior lives in smaller
// modules so we can later test routing, signing, and OC integration in isolation.
const config = loadInstanceWrapperConfig();
const server = createInstanceWrapperServer(config);

server.listen(config.listenPort, config.listenHost, () => {
  // Logging the boot configuration is useful during early provisioning work,
  // but we only print non-secret values here.
  console.log(
    `[instance-wrapper] listening on http://${config.listenHost}:${config.listenPort} for instance ${config.instanceId}`,
  );
});
