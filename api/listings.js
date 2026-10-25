import { db, auth, storage } from 'hatchable';
export const access = 'public';
export const methods = ['GET','POST'];
const allowedTypes=new Set(['sell','exchange','free']);
const allowedConditions=new Set(['New','Like New','Good','Fair']);
export default async function(req,res){
  try{
    if(req.method==='GET'){
      const q=String(req.query.q||'').trim().slice(0,100);
      const category=String(req.query.category||'').trim().slice(0,80);
      const type=String(req.query.type||'').trim();
      const condition=String(req.query.condition||'').trim();
      const campus=String(req.query.campus||'').trim().slice(0,100);
      const min=req.query.min!==undefined&&req.query.min!==''?Number(req.query.min):null;
      const max=req.query.max!==undefined&&req.query.max!==''?Number(req.query.max):null;
      const limit=Math.min(24,Math.max(1,Number(req.query.limit)||12));
      const page=Math.max(1,Number(req.query.page)||1);
      const sort=String(req.query.sort||'newest');
      const order=sort==='price_asc'?'l.price ASC,l.created_at DESC':sort==='price_desc'?'l.price DESC,l.created_at DESC':'l.created_at DESC';
      const where=["(l.status = 'active' OR (l.status IN ('sold','exchanged') AND l.updated_at > now() - interval '1 hour'))"];
      const params=[];
      function add(sql,value){params.push(value);where.push(sql.replace('?', '$'+params.length))}
      if(q){params.push(q);where.push("(l.title ILIKE '%' || $"+params.length+" || '%' OR l.description ILIKE '%' || $"+params.length+" || '%')");}
      if(category)add('c.name = ?',category);
      if(type&&allowedTypes.has(type))add('l.listing_type = ?',type);
      if(condition&&allowedConditions.has(condition))add('l.condition = ?',condition);
      if(campus)add("l.campus ILIKE '%' || ? || '%'",campus);
      if(min!==null&&Number.isFinite(min)&&min>=0)add('l.price >= ?',min);
      if(max!==null&&Number.isFinite(max)&&max>=0)add('l.price <= ?',max);
      const clause=where.join(' AND ');
      const count=await db.query('SELECT count(*)::int AS total FROM listings l LEFT JOIN categories c ON c.id=l.category_id WHERE '+clause,params);
      const listParams=params.slice();listParams.push(limit);listParams.push((page-1)*limit);
      const {rows}=await db.query('SELECT l.id,l.seller_id,l.title,l.description,l.category_id,c.name AS category_name,l.listing_type,l.price,l.original_price,l.condition,l.image_urls,l.campus,l.location,l.exchange_preferences,l.status,l.created_at,l.updated_at,COALESCE(p.display_name,\'Student\') AS seller_name FROM listings l LEFT JOIN categories c ON c.id=l.category_id LEFT JOIN profiles p ON p.user_id=l.seller_id WHERE '+clause+' ORDER BY '+order+' LIMIT $'+(params.length+1)+' OFFSET $'+(params.length+2),listParams);
      for(const listing of rows){if(Array.isArray(listing.image_urls))listing.image_urls=await Promise.all(listing.image_urls.map(async value=>typeof value==='string'&&value.startsWith('uploads/')?await storage.url(value):value));}return res.json({listings:rows,total:count.rows[0]?.total||0,page,limit});
    }
    const user=await auth.getUser(req);
    if(!user)return res.status(401).json({error:'Sign in to create a listing.'});
    const body=req.body||{};
    const title=String(body.title||'').trim().slice(0,100);
    const description=String(body.description||'').trim().slice(0,2000);
    const listingType=String(body.listingType||'sell');
    const condition=String(body.condition||'Good');
    const categoryId=Number(body.categoryId);
    const price=Number(body.price??0);
    const originalPrice=body.originalPrice===''||body.originalPrice==null?null:Number(body.originalPrice);
    if(title.length<3||description.length<10)return res.status(400).json({error:'Title must be at least 3 characters and description at least 10.'});
    if(!allowedTypes.has(listingType)||!allowedConditions.has(condition))return res.status(400).json({error:'Choose a valid listing type and condition.'});
    if(!Number.isFinite(price)||price<0||price>10000000)return res.status(400).json({error:'Enter a valid non-negative price.'});
    if(listingType==='free'&&price!==0)return res.status(400).json({error:'Free listings must have a price of zero.'});
    if(listingType==='exchange'&&price!==0)return res.status(400).json({error:'Exchange-only listings cannot have an asking price.'});
    if(originalPrice!==null&&(!Number.isFinite(originalPrice)||originalPrice<0))return res.status(400).json({error:'Original price must be non-negative.'});
    const cat=await db.query('SELECT id FROM categories WHERE id=$1',[categoryId]);
    if(!cat.rows.length)return res.status(400).json({error:'Choose a valid category.'});
    const imageUrls=Array.isArray(body.imageUrls)?body.imageUrls.slice(0,5).map(x=>String(x).slice(0,1000)): [];
    if(imageUrls.some(u=>!(/^https:\/\//i.test(u)||(u.startsWith('uploads/'+String(user.id)+'/')))))return res.status(400).json({error:'Use a secure image URL or upload a photo from your account.'});
    const campus=String(body.campus||'').trim().slice(0,100);
    const location=String(body.location||'').trim().slice(0,120);
    const exchange=String(body.exchangePreferences||'').trim().slice(0,250);
    await db.query('INSERT INTO profiles(user_id,display_name) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',[String(user.id),String(user.name||'Student').slice(0,80)]);
    const result=await db.query('INSERT INTO listings(seller_id,title,description,category_id,listing_type,price,original_price,condition,image_urls,campus,location,exchange_preferences,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,\'active\') RETURNING id,title,status,created_at',[String(user.id),title,description,categoryId,listingType,listingType==='sell'?price:0,originalPrice,condition,JSON.stringify(imageUrls),campus,location,exchange]);
    return res.status(201).json({listing:result.rows[0]});
  }catch(e){console.error('listings',e);res.status(500).json({error:'Could not process listings right now.'});}
}