import fs from 'fs';
import appTools, { defineConfig } from '@modern-js/app-tools';
import DashboardPlugin from '@module-federation/dashboard-plugin';
import ChunkPatchPlugin from './ChunkPatchPlugin';
import AdaptMedusaPlugin from './AdaptMedusaPlugin'


const tokens = fs
  .readFileSync(__dirname + '/../.env')
  .toString('utf-8')
  .split('\n')
  .map(v => v.trim().split('='));
process.env.DASHBOARD_READ_TOKEN = tokens.find(([k]) => k === 'DASHBOARD_READ_TOKEN')[1];
process.env.DASHBOARD_WRITE_TOKEN = tokens.find(([k]) => k === 'DASHBOARD_WRITE_TOKEN')[1];
process.env.DASHBOARD_BASE_URL = tokens.find(([k]) => k === 'DASHBOARD_BASE_URL')[1];
const dashboardURL = `${process.env.DASHBOARD_BASE_URL}/update?token=${process.env.DASHBOARD_WRITE_TOKEN}`;

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  runtime: {
    router: true,
  },
  dev: {
    // set publicPath
    assetPrefix: 'http://localhost:3002/',
  },
  source: {
    // automatically generated asynchronous boundary via Dynamic Import, allowing the page code to consume remote modules generated by the module federation.
    enableAsyncEntry: true,
  },
  server: {
    port: 3002,
  },
  tools: {
    webpack: (config, { webpack, appendPlugins }) => {
      appendPlugins([
        new webpack.container.ModuleFederationPlugin({
          name: 'provider',
          library: { type: 'var', name: 'provider' },
          filename: 'remoteEntry.js',
          exposes: {
            './Button': './src/components/Button',
          },
          shared: {
            react: { singleton: true },
            'react-dom': { singleton: true },
          },
        }),
        // modern.js has default ChunkSplit strategy which will cause remoteEntry chunk can not load normally
        // user can config config.optimization?.splitChunks or delete config.optimization?.splitChunks and then use webpack default ChunkSplit strategy directly
        new ChunkPatchPlugin('provider'),
        new DashboardPlugin({
          versionStrategy: `${Date.now()}`,
          filename: 'dashboard.json',
          dashboardURL,
          metadata: {
            clientUrl: process.env.DASHBOARD_BASE_URL,
            baseUrl: 'http://localhost:3002',
            source: {
              url: 'https://github.com/module-federation/federation-dashboard/tree/master/modernjs/modernjs/provider',
            },
            remote: 'http://localhost:3002/remoteEntry.js',
          },
        }),
        new AdaptMedusaPlugin()
      ]);
      // modern.js set runtimeChunk true by default
      delete config.optimization?.runtimeChunk;

      // only for local script: npm run serve
      config.output!.publicPath = 'http://localhost:3002/';
    },
  },
  plugins: [appTools()],
});
