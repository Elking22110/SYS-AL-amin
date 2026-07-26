const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const mainCategoryName = 'بولي + صرف';

const subcategoriesData = [
  {
    name: 'قطع ٥٠ ملي كيسل الاهرام',
    products: []
  },
  {
    name: 'قطع ٧٥ ملي كيسل الاهرام',
    products: []
  },
  {
    name: 'قطع ١١٠ ملي كيسل الاهرام',
    products: []
  },
  {
    name: 'قطع ١٦٠ ملي كيسل الاهرام',
    products: []
  },
  {
    name: 'قطع ١ بوصة الاهرام أبيض',
    products: [
      { name: 'متر ١ عادة أبيض', price: 25 },
      { name: 'م ١ بوصه الاهرام أبيض', price: 40 },
      { name: 'بوش ١٫٥*١ أبيض أهرام', price: 16 },
      { name: 'كوع ١ بوصه مفتوح أبيض', price: 12 },
      { name: 'كوع ١ بوصه عادة أبيض', price: 12 },
      { name: 'مشترك ١ بوصة عادة أبيض', price: 18 },
      { name: 'مشترك مفتوح ١ أبيض', price: 25 },
      { name: 'جلبة لزق ١ بوصة أبيض', price: 10 }
    ]
  },
  {
    name: 'قطع ١٫٥ ابيض الاهرام',
    products: [
      { name: 'كوع ١٫٥ ٤٥ ابيض الاهرام', price: 19 },
      { name: 'كوع مفتوح ١٫٥ ابيض الاهرام', price: 19 },
      { name: 'تي ١٫٥ ابيض الاهرام', price: 28 },
      { name: 'جلبه ١٫٥ ابيض الاهرام', price: 16 },
      { name: 'واي ١٫٥ ابيض الاهرام', price: 41 },
      { name: 'كوع بسن ١٫٥ ابيض الاهرام', price: 29 },
      { name: 'جلبه بسن ١٫٥ ابيض الاهرام', price: 25 },
      { name: 'بيبه شور ١٫٥ ابيض الاهرام', price: 94 },
      { name: 'م ١٫٥ ٤ م ابيض الاهرام', price: 78 },
      { name: 'م ١٫٥ ٣ م ابيض الاهرام', price: 59 }
    ]
  },
  {
    name: 'قطع ٢ بوصه الاهرام أبيض',
    products: [
      { name: 'جلتراب الاهرام 20*20', price: 220 },
      { name: 'كوع ٢ بوصه ابيض الاهرام', price: 31 },
      { name: 'كوع مفتوح ٢ بوصه ابيض الاهرام', price: 31 },
      { name: 'تي ٢ بوصه ابيض الاهرام', price: 43 },
      { name: 'جلبه ٢ بوصه ابيض الاهرام', price: 21 },
      { name: 'واي ٢ بوصه ابيض الاهرام', price: 57 },
      { name: 'كوع باب ٢ بوصه ابيض الاهرام', price: 50 },
      { name: 'طبه ٢ تسليك بوصه ابيض الاهرام', price: 35 },
      { name: 'طبه ٢ بوصه ابيض الاهرام', price: 20 },
      { name: 'بوش ٣*١,٥ بوصه ابيض الاهرام', price: 18 },
      { name: 'بيبه ٧*١,٥ سم ابيض الاهرام', price: 60 },
      { name: 'بيبه ٢*١,٥ بوصه ابيض الاهرام', price: 119 },
      { name: 'بيبه ٢/٢ ابيض الاهرام', price: 124 },
      { name: 'بيبه ٢/٢ ٧سم ابيض الاهرام', price: 83 },
      { name: 'م ٢ بوصه ٣ملى الاهرام ابيض', price: 71 },
      { name: 'م ٢ بوصه ٤ملى الاهرام ابيض', price: 100 },
      { name: 'هوايه ٢ بوصه', price: 17 }
    ]
  },
  {
    name: 'قطع ٣بوصه الاهرام أبيض',
    products: [
      { name: 'م ٣بوصه ٣ملى الاهرام ابيض', price: 100 },
      { name: 'م ٣بوصه ٤ملى الاهرام ابيض', price: 127 },
      { name: 'كوع ٣بوصه ابيض الاهرام', price: 55 },
      { name: 'كوع مفتوح ٣بوصه ابيض الاهرام', price: 55 },
      { name: 'كوع باب ٣بوصه ابيض الاهرام', price: 75 },
      { name: 'تي ٣بوصه ابيض الاهرام', price: 83 },
      { name: 'جلبه ٣بوصه ابيض الاهرام', price: 36 },
      { name: 'واي ٣بوصه ابيض الاهرام', price: 129 },
      { name: 'تي ٣*٣ عاده ابيض الاهرام', price: 101 },
      { name: 'تي ٣*٣ باب ابيض الاهرام', price: 102 },
      { name: 'تي باب ٣بوصه ابيض الاهرام', price: 102 },
      { name: 'جلبه اصلاح ٣بوصه ابيض الاهرام', price: 36 },
      { name: 'واي ٣/٢ ابيض الاهرام', price: 140 },
      { name: 'صليبه ٣*٣بوصه ابيض الاهرام', price: 178 },
      { name: 'طبه تسليك ٣بوصه ابيض الاهرام', price: 53 },
      { name: 'طبه عميه ٣بوصه أبيض الاهرام', price: 25 },
      { name: 'هوايه ٣بوصه ابيض الاهرام', price: 25 },
      { name: 'نقاص ٣*٣ ابيض الاهرام', price: 25 },
      { name: 'جرجوري ٣بوصه ابيض الاهرام', price: 150 },
      { name: 'بيبه ٣/٢بوصه ابيض الاهرام', price: 135 },
      { name: 'بيبه ٣/١,٥ ابيض الاهرام', price: 130 }
    ]
  },
  {
    name: 'قطع ٤بوصه الاهرام أبيض',
    products: [
      { name: 'كوع ٤بوصه ابيض الاهرام', price: 99 },
      { name: 'كوع مفتوح ٤بوصه ابيض الاهرام', price: 99 },
      { name: 'كوع باب ٤بوصه ابيض الاهرام', price: 135 },
      { name: 'تي ٤ بوصه ابيض الاهرام', price: 140 },
      { name: 'جلبه ٤بوصه ابيض الاهرام', price: 49 },
      { name: 'واي ٤بوصه ابيض الاهرام', price: 181 },
      { name: 'تي ٤*٣ ابيض الاهرام', price: 161 },
      { name: 'تي ٤*٣ باب ابيض الاهرام', price: 171 },
      { name: 'تي ٣*٤ باب ابيض الاهرام', price: 197 },
      { name: 'تي ٣*٤ باب ابيض الاهرام ثقيل', price: 203 },
      { name: 'تي ٤باب ابيض الاهرام', price: 187 },
      { name: 'جلبه ٤اصلاح ابيض الاهرام', price: 50 },
      { name: 'واي ٤*٣ ابيض الاهرام', price: 155 },
      { name: 'صليبه ٤/٤ ابيض الاهرام', price: 220 },
      { name: 'طبه ٤تسليك ابيض الاهرام', price: 75 },
      { name: 'هوايه ٤بوصه ابيض الاهرام', price: 36 },
      { name: 'طبه ٤عميه ابيض الاهرام', price: 36 },
      { name: 'سفون ٤بوصه ابيض الاهرام', price: 182 },
      { name: 'جلتراب ٣٠*٣٠ الاهرام', price: 301 },
      { name: 'صرف جره رمادي الاهرام', price: 21.77 },
      { name: 'صليبه ٤/٣ ابيض الاهرام', price: 190 },
      { name: 'مجره ١م الاهرام', price: 312 },
      { name: 'بوش ٤*٣ ابيض الاهرام', price: 57 },
      { name: 'بوش ٣*٤ ابيض الاهرام', price: 62 },
      { name: 'م ٤بوصه ٣ملى ابيض الاهرام', price: 142.5 },
      { name: 'م ٤بوصه ٤ملى ابيض الاهرام', price: 175 },
      { name: 'جلبه ٤ بوصه ١١٤ اهرام', price: 49 }
    ]
  },
  {
    name: 'قطع ٦ بوصه الاهرام أبيض',
    products: [
      { name: 'FOX لحام 8/1', price: 0 },
      { name: 'FOX لحام 4/1', price: 0 },
      { name: 'كوع ٦بوصه ابيض الاهرام', price: 216 },
      { name: 'طبه ٦بوصه كاب اهرام ابيض', price: 83 },
      { name: 'كوع ٦مفتوح ابيض الاهرام', price: 216 },
      { name: 'كوع ٦باب', price: 275 },
      { name: 'مشترك ٦*٦ ابيض الاهرام', price: 369 },
      { name: 'جلبه ٦ ابيض الاهرام', price: 113 },
      { name: 'واي ٦ ابيض الاهرام', price: 520 },
      { name: 'تي ٦*٤ ابيض الاهرام', price: 358 },
      { name: 'تي ٦*٤ باب ابيض الاهرام', price: 416 },
      { name: 'تي ٦*٦ باب ابيض الاهرام', price: 441 },
      { name: 'جلبه ٦بوصه اصلاح ابيض الاهرام', price: 113 },
      { name: 'واي ٦*٤ ابيض الاهرام', price: 441 },
      { name: 'م ٦بوصه ٤ملى ابيض الاهرام', price: 285.83 },
      { name: 'طبه ٦ بوصه تسليك ابيض الاهرام', price: 181 },
      { name: 'نقاص ٦/٤ ابيض الاهرام', price: 124 },
      { name: 'غرفه ٥٠*٥٠ البحر الاحمر', price: 1500 },
      { name: 'م ٦بوصه ٣م ابيض الاهرام', price: 234 }
    ]
  },
  {
    name: 'قطع ٢/١ بولي الاهرام',
    products: [
      { name: 'متر بولي ٢/١ اهرام', price: 36 },
      { name: 'كوع ٢/١ بولي اهرام', price: 8.4 },
      { name: 'تي ٢/١ لحام بولي اهرام', price: 9.5 },
      { name: 'جلبه ٢/١ بولي اهرام', price: 6.3 },
      { name: 'مسلوب ٢/١*٣/٤ لحام بولي اهرام', price: 11.5 },
      { name: 'كوع ٢/١ بسن بولي اهرام', price: 66 },
      { name: 'تي بسن ٢/١ بولي اهرام', price: 72 },
      { name: 'جلبه بسن ٢/١ دخلي بولي اهرام', price: 70 },
      { name: 'محبس ٢/١ دفن بولي اهرام', price: 483 },
      { name: 'كرنك ٢/١ قصير بولي اهرام', price: 17 },
      { name: 'جلبه بسن خارجي ١/٢ بولي اهرام', price: 88.5 },
      { name: 'افيز مجوز بلاستك ١/٢', price: 5 },
      { name: 'افيز ٤ بوصه ايطالى', price: 40 },
      { name: 'افيز ٣ بوصه ايطالى', price: 35 },
      { name: 'افيز ٢ بوصه ايطالى', price: 25 },
      { name: 'افيز ١/٥ ايطالى', price: 22 },
      { name: 'افيز ١ بوصه ايطالى', price: 17 },
      { name: 'افيز ٣/٤ بوصه ايطالى', price: 15 },
      { name: 'افيز ١/٢ بوصه ايطالى', price: 15 },
      { name: 'FOX لحام 1/4', price: 90 },
      { name: 'FOX لحام 1/8', price: 50 },
      { name: 'نبل نيكل ١/٢', price: 10 },
      { name: 'وصله نيكل 40سم', price: 20 },
      { name: 'طبه اختبار ١/٢', price: 3 },
      { name: 'بكرة تفلون جامبو', price: 25 },
      { name: 'بكره عازل', price: 35 },
      { name: 'بكره عازل تايواني', price: 60 },
      { name: 'حنفيه بليه ١/٢ LAVORA', price: 65 },
      { name: 'K لفه السومات ٣', price: 500 },
      { name: 'K لفه السومات ٤', price: 550 }
    ]
  },
  {
    name: 'قطع ٣/٤ بولي الاهرام',
    products: [
      { name: 'متر ٣/٤ بولي الاهرام', price: 49.25 },
      { name: 'متر ٣/٤ بولي معزول الاهرام', price: 58 },
      { name: 'كوع ٣/٤ لحام بولي الاهرام', price: 10.5 },
      { name: 'كوع ٣/٤ مفتوح بولي الاهرام', price: 10 },
      { name: 'تي ٣/٤ لحام بولي الاهرام', price: 15.75 },
      { name: 'جلبه ٣/٤ لحام بولي الاهرام', price: 8.5 },
      { name: 'مسلوب لحام ٣/٤*٢/١ بولي الاهرام', price: 20 },
      { name: 'طبه ٣/٤ لحام بولي الاهرام', price: 8.5 },
      { name: 'كوع بسن ٣/٤ الاهرام ٢/١', price: 70 },
      { name: 'تي بسن ٣/٤ الاهرام ٢/١', price: 79 },
      { name: 'جلبه بسن داخلي ٣/٤*٢/١ الاهرام', price: 74 },
      { name: 'جلبه بسن خارجي ٣/٤ الاهرام ٢/١', price: 91 },
      { name: 'جلبه بسن داخلي ٣/٤ الاهرام', price: 98 },
      { name: 'كوع بسن ٣/٤ الاهرام', price: 104 },
      { name: 'تي بسن ٣/٤ الاهرام', price: 135 },
      { name: 'جلبه بسن خارجي ٣/٤ الاهرام', price: 124 },
      { name: 'كرنك ٣/٤ قصير الاهرام', price: 25 },
      { name: 'محبس ٣/٤ دفن الاهرام', price: 502 },
      { name: 'محبس ٣/٤ بلاكور الاهرام', price: 390 },
      { name: 'تي لحام ٣/٤ الاهرام ٢/١', price: 20 },
      { name: 'بكرة تفلون صيني', price: 10 },
      { name: 'بكرة تفلون ايطالي', price: 25 },
      { name: 'حنفية بلية ٢/١ لافورا', price: 65 },
      { name: 'P-G حنفية بلية ٢/١', price: 100 },
      { name: 'افيز فيشر ٣/٤', price: 15 },
      { name: 'افيز فيشر ١ بوصة', price: 17 },
      { name: 'تي لحام ١*٢/١ الاهرام', price: 29 }
    ]
  },
  {
    name: 'قطع ١بوصه بولي الاهرام',
    products: [
      { name: 'تي مسلوب١*١/٢ بولي اهرام', price: 29 },
      { name: 'م ١ بوصه بولي الاهرام', price: 72 },
      { name: 'مسلوب ٣/٤لحام بولي١* الاهرام', price: 13.5 },
      { name: 'كوع ١ بوصه بولي الاهرام', price: 20 },
      { name: 'كوع ١ مفتوح بولي الاهرام', price: 20 },
      { name: 'تي ١بوصه بولي الاهرام', price: 25 },
      { name: 'مسلوب ١/٢ لحام بولي ١* الاهرام', price: 13.5 },
      { name: 'جلبه لحام ١بوصه الاهرام', price: 13.5 },
      { name: 'طبه ١بوصه بولي الاهرام', price: 13.5 },
      { name: 'كوع ١بوصه بسن بولي الاهرام', price: 178 },
      { name: 'تي مسلوب بولي ٣/٤*١ اهرام', price: 30.5 },
      { name: 'تي بسن ١بوصه الاهرام', price: 227 },
      { name: 'جلبه ١بوصه سن خارجي الاهرام', price: 202 },
      { name: 'جلبه ١*٣/٤ سن خارجي الاهرام', price: 130 },
      { name: 'جلبه ١بوصه سن داخلي الاهرام', price: 164 },
      { name: 'متر بولي ١ معزول الاهرام', price: 113 },
      { name: 'محبس ١ بوصه بلاكور الاهرام', price: 594 },
      { name: 'بكرة تفلون ايطالي', price: 25 },
      { name: 'بكرة تفلون صيني', price: 10 }
    ]
  },
  {
    name: 'قطع ١,٥ بولي الاهرام',
    products: [
      { name: 'متر بولي ١,٥ الاهرام', price: 170 },
      { name: 'تي لحام ١,٥*١ بولي اهرام', price: 66 },
      { name: 'محبس ١,٥ بلاكور الاهرام', price: 1206 },
      { name: 'كوع ١,٥ لحام الاهرام', price: 54 },
      { name: 'تي ١,٥ لحام الاهرام', price: 66 },
      { name: 'كوع ١,٥ مفتوح الاهرام', price: 54 },
      { name: 'جلبه ١,٥ لحام الاهرام', price: 46 },
      { name: 'مسلوب ١,٥*١ لحام الاهرام', price: 46 },
      { name: 'مسلوب ١,٥*٣/٤ لحام الاهرام', price: 46 },
      { name: 'طبه ١,٥ لحام الاهرام', price: 46 },
      { name: 'كوع ١,٥ بسن الاهرام', price: 298 },
      { name: 'جلبه ١,٥ بسن دخلي الاهرام', price: 297 },
      { name: 'جلبه ١,٥ بسن خارجي الاهرام', price: 380 },
      { name: 'جلبه ١,٥ بلاكور بسن خارجي الاهرام', price: 494 },
      { name: 'تي ١,٥*٣/٤ لحام الاهرام', price: 66 }
    ]
  },
  {
    name: 'بولي ٢ و ٣ بوصه الاهرام',
    products: [
      { name: 'م ٢بوصه بولي الاهرام بن ١٦', price: 244 },
      { name: 'كوع ٢ بولي الاهرام', price: 74 },
      { name: 'جلبه ٢ بولي الاهرام', price: 63 },
      { name: 'تي ٢ بولي الاهرام', price: 93 },
      { name: 'م ٧٥ ملي بولي الاهرام ١٦ بن', price: 371 },
      { name: 'كوع ٧٥ملي بولي الاهرام', price: 131 },
      { name: 'جلبه٧٥بولي الاهرام', price: 112 },
      { name: 'تي ٧٥*٥٠ ملي بولي الاهرام', price: 224 },
      { name: 'تي ٧٥*٣٢ ملي بولي الاهرام', price: 191.8 },
      { name: 'مسلوب ٧٥*٣٢ بولي الاهرام', price: 121 },
      { name: 'كوع ٢ مفتوح بولي الاهرام', price: 74 },
      { name: 'مسلوب ٧٥*٥٠ بولي الاهرام', price: 121 },
      { name: 'جلبه ٧٥ سن دخلي بولي الاهرام', price: 1012 }
    ]
  }
];

async function seedPolySarf() {
  console.log('🚀 Starting Poly + Sarf seeding to Supabase...');

  // 1. إنشاء/تحديث المجموعة الرئيسية
  const mainCatObj = {
    id: mainCategoryName,
    name: mainCategoryName,
    parent_id: null,
    updated_at: new Date().toISOString()
  };

  const { error: mainCatErr } = await supabase.from('categories').upsert([mainCatObj]);
  if (mainCatErr) {
    console.error('❌ Error upserting main category:', mainCatErr.message);
  } else {
    console.log(`✅ Main category "${mainCategoryName}" upserted.`);
  }

  // إنشاء اسم مستعار كـ "الاهرام بولي+صرف" كفئة رئيسية احتياطية للمطابقة
  await supabase.from('categories').upsert([{
    id: 'الاهرام بولي+صرف',
    name: 'الاهرام بولي+صرف',
    parent_id: null,
    updated_at: new Date().toISOString()
  }]);

  // 2. إنشاء الفئات الفرعية والمنتجات
  let totalProducts = 0;
  const nowIso = new Date().toISOString();

  for (const sub of subcategoriesData) {
    const subCatObj = {
      id: sub.name,
      name: sub.name,
      parent_id: mainCategoryName,
      updated_at: nowIso
    };

    const { error: subCatErr } = await supabase.from('categories').upsert([subCatObj]);
    if (subCatErr) {
      console.error(`❌ Error upserting subcategory "${sub.name}":`, subCatErr.message);
    } else {
      console.log(`📂 Subcategory "${sub.name}" upserted (${sub.products.length} products).`);
    }

    if (sub.products.length > 0) {
      const productsToUpsert = sub.products.map((p, idx) => {
        const prodId = `poly_sarf_${sub.name}_${idx}_${p.name.replace(/[\s\/\\*]/g, '_')}`;
        return {
          id: prodId,
          name: p.name,
          price: p.price,
          cost: 0,
          stock: 100,
          barcode: null,
          main_category_id: mainCategoryName,
          sub_category_id: sub.name,
          image_path: null,
          updated_at: nowIso
        };
      });

      const { error: prodErr } = await supabase.from('products').upsert(productsToUpsert);
      if (prodErr) {
        console.error(`❌ Error upserting products for "${sub.name}":`, prodErr.message);
      } else {
        totalProducts += productsToUpsert.length;
        console.log(`   └─ ✅ Inserted ${productsToUpsert.length} products into "${sub.name}".`);
      }
    }
  }

  console.log(`🎉 Seeding complete! Inserted total of ${totalProducts} products under "${mainCategoryName}".`);
  process.exit(0);
}

seedPolySarf();
