import {defineConfig} from 'vite';
// Relative assets preserve GitHub Pages repository subpaths. No local API proxy.
export default defineConfig({base:'./',server:{host:'127.0.0.1'},preview:{host:'127.0.0.1'}});
