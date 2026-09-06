import sharp from "sharp";
import {resolve} from "node:path";
const [source,implementation,output]=process.argv.slice(2);
if(!source||!implementation||!output)throw new Error("source implementation output required");
const width=390,height=844;
const panels=await Promise.all([source,implementation].map(path=>sharp(resolve(path)).resize(width,height,{fit:"fill"}).png().toBuffer()));
await sharp({create:{width:width*2,height,channels:4,background:"#ffffff"}}).composite(panels.map((input,i)=>({input,top:0,left:i*width}))).png().toFile(resolve(output));
console.log(JSON.stringify({source:await sharp(source).metadata(),implementation:await sharp(implementation).metadata(),comparison:output}));
