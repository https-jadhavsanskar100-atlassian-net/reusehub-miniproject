import { storage, auth } from 'hatchable';
import crypto from 'node:crypto';
export const access='public';
export const methods=['POST'];
const MAX_BYTES=5*1024*1024;
const TYPES=new Set(['image/jpeg','image/png','image/webp']);
export default async function(req,res){
 try{
  const user=await auth.getUser(req);
  if(!user)return res.status(401).json({error:'Sign in to upload listing photos.'});
  const file=(req.files||[]).find(f=>f.field==='file');
  if(!file)return res.status(400).json({error:'Choose a photo first.'});
  if(!TYPES.has(file.contentType))return res.status(415).json({error:'Use a JPG, PNG, or WebP image.'});
  if(!file.buffer||file.buffer.length>MAX_BYTES)return res.status(413).json({error:'Image must be 5 MB or smaller.'});
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.contentType];
  const key='uploads/'+String(user.id)+'/'+crypto.randomUUID()+'.'+ext;
  const url=await storage.put(key,file.buffer,file.contentType);
  return res.status(201).json({key,url});
 }catch(e){console.error('listing image upload',e);return res.status(500).json({error:'Could not upload this photo. Try a smaller image.'})}
}