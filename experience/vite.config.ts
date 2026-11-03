import {defineConfig} from 'vite';
// A loopback-only dev server; production assets and GitHub Pages stay unchanged.
export default defineConfig({base:'./',server:{host:'127.0.0.1',port:5173,strictPort:true,cors:false,watch:{ignored:['**/server/**']},fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/server/**','**/*.sqlite*']},proxy:{'/api':{target:'http://127.0.0.1:8788',changeOrigin:false}}},preview:{host:'127.0.0.1'}});
