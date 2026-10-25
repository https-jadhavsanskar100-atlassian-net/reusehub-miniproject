import { auth, db } from 'hatchable';
export const access = 'public';
export const methods = ['GET','PATCH'];
export default async function(req,res){
  try{
    const user=await auth.getUser(req);
    if(!user)return res.status(401).json({error:'Please sign in first.'});
    const uid=String(user.id);
    if(req.method==='GET'){
      const {rows}=await db.query("SELECT display_name,campus,department,photo_url,account_status,created_at FROM profiles WHERE user_id=$1",[uid]);
      const p=rows[0]||{};
      const profileName=String(p.display_name||'').trim();
      const name=(profileName&&profileName.toLowerCase()!=='student'?profileName:'')||String(user.name||'').trim()||String(user.email||'').split('@')[0]||'Student';
      return res.json({user:{id:user.id,email:user.email,name,campus:p.campus||'',department:p.department||'',photoUrl:p.photo_url||user.image||'',accountStatus:p.account_status||'active',needsProfileName:!profileName||profileName.toLowerCase()==='student'}});
    }
    const body=req.body||{};
    const name=String(body.displayName||'').trim().slice(0,80);
    const campus=String(body.campus||'').trim().slice(0,100);
    const department=String(body.department||'').trim().slice(0,100);
    if(!name)return res.status(400).json({error:'Display name is required.'});
    await db.query('INSERT INTO profiles(user_id,display_name,campus,department,updated_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,campus=EXCLUDED.campus,department=EXCLUDED.department,updated_at=now()',[uid,name,campus,department]);
    return res.json({ok:true,user:{id:user.id,email:user.email,name,campus,department}});
  }catch(e){console.error('account profile',e);res.status(500).json({error:'Could not load or update your profile.'});}
}