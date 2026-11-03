import {createApi} from './api.mjs';
const server=createApi();
server.listen(9000,'0.0.0.0',()=>console.log('flow-space-api listening on port 9000'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void server.stopCloud()});
