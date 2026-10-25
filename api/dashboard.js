import { db, auth } from 'hatchable';
export const access='public';
export const methods=['GET'];
export default async function(req,res){
 try{const u=await auth.getUser(req);if(!u)return res.status(401).json({error:'Sign in to view your dashboard.'});const uid=String(u.id);
 const [profile,listings,favourites,enquiries,conversations,notifications]=await Promise.all([
 db.query('SELECT display_name,campus,department,photo_url,created_at FROM profiles WHERE user_id=$1',[uid]),
 db.query("SELECT id,title,price,listing_type,condition,status,created_at FROM listings WHERE seller_id=$1 AND status<>'removed' ORDER BY created_at DESC LIMIT 50",[uid]),
 db.query('SELECT count(*)::int AS n FROM favourites WHERE user_id=$1',[uid]),
 db.query("SELECT count(*)::int AS n FROM enquiries WHERE (buyer_id=$1 OR seller_id=$1) AND status='pending'",[uid]),
 db.query('SELECT id,listing_id,last_message,last_message_at FROM conversations WHERE participant_a=$1 OR participant_b=$1 ORDER BY last_message_at DESC LIMIT 5',[uid]),
 db.query('SELECT id,title,body,is_read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5',[uid])]);
 const ls=listings.rows;return res.json({profile:profile.rows[0]||null,stats:{activeListings:ls.filter(x=>x.status==='active').length,completed:ls.filter(x=>['sold','exchanged'].includes(x.status)).length,favourites:favourites.rows[0].n,pendingEnquiries:enquiries.rows[0].n},listings:ls,conversations:conversations.rows,notifications:notifications.rows});
 }catch(e){console.error('dashboard',e);res.status(500).json({error:'Could not load dashboard.'})}
}