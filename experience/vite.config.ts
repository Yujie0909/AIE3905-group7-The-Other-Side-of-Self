import {defineConfig} from 'vite';
// Proxy exists only in the local dev server; the static GitHub Pages build stays independent.
export default defineConfig({base:'./',server:{port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:8788',changeOrigin:false}}}});
