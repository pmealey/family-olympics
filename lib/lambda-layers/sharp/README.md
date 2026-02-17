# Sharp Lambda layer (Linux)

This folder is used to build a Lambda layer containing **sharp** compiled for Amazon Linux (Lambda runtime).

**One-time setup:** From the project root run:

```bash
npm run build:sharp-layer
```

That installs the Linux x64 build of sharp into `nodejs/node_modules/` here. CDK then packages this folder as a layer so the process-media Lambda can use sharp without Docker.
