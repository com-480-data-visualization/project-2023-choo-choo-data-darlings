import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        map: 'src/map/map.html',
        network: 'src/network/network.html'
      }
    }
  }
});