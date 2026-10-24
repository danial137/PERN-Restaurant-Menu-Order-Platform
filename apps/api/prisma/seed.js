import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db=new PrismaClient();
const menu=[
  ['ramen','رامن و نودل',0,[
    ['رامن تند توکیو','tokyo-ramen','رامن گرم با مرغ، تخم‌مرغ و سس تند',245000,24],
    ['رامن میسو','miso-ramen','آبگوشت میسو، قارچ و نودل دست‌ساز',228000,22],
    ['نودل سبزیجات','veggie-noodles','سبزیجات تازه، سس کنجد، نودل',195000,30]
  ]],
  ['rice','رایس و کاسه‌ها',1,[
    ['چیکن کاتسو','chicken-katsu','مرغ سوخاری ژاپنی با برنج و سس مخصوص',289000,18],
    ['بیف بول','beef-bowl','گوشت گریل‌شده، برنج و پیاز کاراملی',325000,13],
    ['رایس کاری','curry-rice','کاری ژاپنی و سبزیجات فصلی',235000,26]
  ]],
  ['sides','پیش‌غذا',2,[
    ['گیوزا','gyoza','دامپلینگ برشته، سس سویا',159000,32],
    ['سیب زمینی نوری','nori-fries','سیب‌زمینی ترد با پودر نوری',119000,42]
  ]],
  ['drinks','نوشیدنی',3,[
    ['ماچا آیس','iced-matcha','ماچا سرد و شیر',135000,26],
    ['لیموناد یوزو','yuzu-lemonade','لیموناد مرکبات تازه',98000,50]
  ]]
];
async function main(){
  const email=(process.env.SEED_ADMIN_EMAIL??'admin@persianfood.test').toLowerCase();
  const password=process.env.SEED_ADMIN_PASSWORD;
  if(!password || password.length<10) throw new Error('Set SEED_ADMIN_PASSWORD (at least 10 characters) in .env before seeding');
  await db.user.upsert({where:{email},update:{},create:{email,name:'مدیر پرشین فود',passwordHash:await bcrypt.hash(password,12),role:'ADMIN'}});
  for(const [slug,name,position,products] of menu){
    const category=await db.category.upsert({where:{slug},update:{name,position},create:{slug,name,position}});
    for(const [productName,productSlug,description,priceToman,stock] of products){
      await db.product.upsert({where:{slug:productSlug},update:{name:productName,description,priceToman,categoryId:category.id},create:{slug:productSlug,name:productName,description,priceToman,stock,categoryId:category.id}});
    }
  }
  for(let i=1;i<=8;i++) await db.restaurantTable.upsert({where:{label:`میز ${i}`},update:{},create:{label:`میز ${i}`,qrKey:`table-${i}-${randomSuffix(i)}`}});
  console.log('Seed finished. Admin:',email,'(password remains unchanged if admin already existed)');
}
function randomSuffix(i){return String(i).padStart(8,'0');}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
