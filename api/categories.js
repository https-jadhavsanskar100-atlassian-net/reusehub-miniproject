import { db } from 'hatchable';
export const access = 'public';
export const methods = ['GET'];
export default async function(req,res){
  try{
    const {rows}=await db.query('SELECT id,name,slug,description FROM categories ORDER BY name');
    res.json({categories:rows});
  }catch(e){console.error('categories',e);res.status(500).json({error:'Could not load categories.'});}
}