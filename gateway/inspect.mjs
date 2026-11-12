import {Tuya} from './tuya.mjs';
const tuya=new Tuya({clientId:process.env.TUYA_CLIENT_ID,secret:process.env.TUYA_CLIENT_SECRET,region:process.env.TUYA_REGION});
try{console.log(JSON.stringify(await tuya.inspect(process.argv[2]),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
