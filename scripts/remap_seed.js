/**
 * Script to remap products_seed.json products from old mg_/sc_ structure
 * to the new 24 main groups hierarchy.
 * Run: node scripts/remap_seed.js
 */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../public/products_seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const oldCats = seed.categories || [];
const prods = seed.products || [];

// Build mapping: old subCategoryId -> { oldSubName, oldMainId }
const oldSubMap = {};
oldCats.forEach(c => {
  if (c.parentId) {
    oldSubMap[c.id] = { name: c.name, mainId: c.parentId };
  }
});

// The NEW 24 main categories
const NEW_CATS = [
  { id: 'Br', name: 'Br', parentId: null },
  { id: 'قطع مشكله BR اسمارت و', name: 'قطع مشكله BR اسمارت و', parentId: 'Br' },
  { id: 'قطع ٢/١', name: 'قطع ٢/١', parentId: 'Br' },
  { id: 'قطع ٤/٣ بوصة', name: 'قطع ٤/٣ بوصة', parentId: 'Br' },
  { id: 'قطع ١ بوصة', name: 'قطع ١ بوصة', parentId: 'Br' },
  { id: 'قطع ١,٢٥ بوصة', name: 'قطع ١,٢٥ بوصة', parentId: 'Br' },
  { id: 'قطع ١,٥ بوصة', name: 'قطع ١,٥ بوصة', parentId: 'Br' },
  { id: 'قطع ٢ بوصة', name: 'قطع ٢ بوصة', parentId: 'Br' },
  { id: 'قطع اسواد ٣/٤', name: 'قطع اسواد ٣/٤', parentId: 'Br' },
  { id: 'قطع ١ بوصه اسود', name: 'قطع ١ بوصه اسود', parentId: 'Br' },
  { id: 'قطع ١,٥ اسود', name: 'قطع ١,٥ اسود', parentId: 'Br' },
  { id: 'افيز اسمارت', name: 'افيز اسمارت', parentId: 'Br' },

  { id: 'اسمارت ابيض', name: 'اسمارت ابيض', parentId: null },
  { id: 'بوصه 6', name: 'بوصه 6', parentId: 'اسمارت ابيض' },
  { id: 'بوصه 4', name: 'بوصه 4', parentId: 'اسمارت ابيض' },
  { id: 'بوصه 3', name: 'بوصه 3', parentId: 'اسمارت ابيض' },
  { id: 'بوصه 2', name: 'بوصه 2', parentId: 'اسمارت ابيض' },
  { id: 'بوصه ١,٥', name: 'بوصه ١,٥', parentId: 'اسمارت ابيض' },
  { id: '١بوصه', name: '١بوصه', parentId: 'اسمارت ابيض' },

  { id: 'لوازم حديد انفيت', name: 'لوازم حديد انفيت', parentId: null },
  { id: 'إسود', name: 'إسود', parentId: 'لوازم حديد انفيت' },
  { id: 'أبيض', name: 'أبيض', parentId: 'لوازم حديد انفيت' },
  { id: 'مقاسات حديد', name: 'مقاسات حديد', parentId: 'لوازم حديد انفيت' },
  { id: 'كولية ظهر', name: 'كولية ظهر', parentId: 'لوازم حديد انفيت' },

  { id: 'كيسيل', name: 'كيسيل', parentId: null },
  { id: 'مواسير كيسل', name: 'مواسير كيسل', parentId: 'كيسيل' },
  { id: 'نظام كيسيل المدفون ١١٠', name: 'نظام كيسيل المدفون ١١٠', parentId: 'كيسيل' },
  { id: 'نظام كيسيل المدفون ١٦٠', name: 'نظام كيسيل المدفون ١٦٠', parentId: 'كيسيل' },
  { id: 'نظام كيسل المدفون ٢٠٠', name: 'نظام كيسل المدفون ٢٠٠', parentId: 'كيسيل' },
  { id: 'قطع ٦٣ كيسل', name: 'قطع ٦٣ كيسل', parentId: 'كيسيل' },
  { id: 'قطع ٤٠ كيسل', name: 'قطع ٤٠ كيسل', parentId: 'كيسيل' },
  { id: 'قطع ٥٠', name: 'قطع ٥٠', parentId: 'كيسيل' },
  { id: 'قطع ٧٥', name: 'قطع ٧٥', parentId: 'كيسيل' },
  { id: 'قطع ١١٠', name: 'قطع ١١٠', parentId: 'كيسيل' },
  { id: 'قطع ١٦٠', name: 'قطع ١٦٠', parentId: 'كيسيل' },
  { id: 'بلاعات كيسل', name: 'بلاعات كيسل', parentId: 'كيسيل' },
  { id: 'قطع ١بوصه كيسل', name: 'قطع ١بوصه كيسل', parentId: 'كيسيل' },

  { id: 'تكنو بولي', name: 'تكنو بولي', parentId: null },
  { id: 'بولى ٢/١', name: 'بولى ٢/١', parentId: 'تكنو بولي' },
  { id: 'بولى ٤/٣ تكنو', name: 'بولى ٤/٣ تكنو', parentId: 'تكنو بولي' },
  { id: 'بولى ١ تكنو', name: 'بولى ١ تكنو', parentId: 'تكنو بولي' },
  { id: 'بولى ١,٥ تكنو', name: 'بولى ١,٥ تكنو', parentId: 'تكنو بولي' },
  { id: 'بولى ٢ تكنو', name: 'بولى ٢ تكنو', parentId: 'تكنو بولي' },
  { id: 'صرف ١,٥ تكنو', name: 'صرف ١,٥ تكنو', parentId: 'تكنو بولي' },
  { id: 'صرف ٢ تكنو', name: 'صرف ٢ تكنو', parentId: 'تكنو بولي' },
  { id: 'صرف ٣ تكنو', name: 'صرف ٣ تكنو', parentId: 'تكنو بولي' },
  { id: 'صرف ٤ تكنو', name: 'صرف ٤ تكنو', parentId: 'تكنو بولي' },
  { id: 'صرف ٦ تكنو', name: 'صرف ٦ تكنو', parentId: 'تكنو بولي' },

  { id: 'مجموعه دروفت +ايديال', name: 'مجموعه دروفت +ايديال', parentId: null },
  { id: 'طقم صينى - إكو', name: 'طقم صينى - إكو', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'بانيو ديورافيت', name: 'بانيو ديورافيت', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'طقم صينى - جولف', name: 'طقم صينى - جولف', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'طقم صينى - دي كود', name: 'طقم صينى - دي كود', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'بانيو الطيب', name: 'بانيو الطيب', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'بانيو اديال', name: 'بانيو اديال', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'طابق بانيو + حوض', name: 'طابق بانيو + حوض', parentId: 'مجموعه دروفت +ايديال' },

  { id: 'خلاطات', name: 'خلاطات', parentId: null },
  { id: 'طقم خلاط - جولد ايديال', name: 'طقم خلاط - جولد ايديال', parentId: 'خلاطات' },
  { id: 'طقم خلاط رويال', name: 'طقم خلاط رويال', parentId: 'خلاطات' },
  { id: 'اطقم خلاطات عرض', name: 'اطقم خلاطات عرض', parentId: 'خلاطات' },
  { id: 'نص خلاط', name: 'نص خلاط', parentId: 'خلاطات' },
  { id: 'قطع خلاط دش - ديكور', name: 'قطع خلاط دش - ديكور', parentId: 'خلاطات' },
  { id: 'خلاط مطبخ الشيف', name: 'خلاط مطبخ الشيف', parentId: 'خلاطات' },
  { id: 'خلاط شطاف', name: 'خلاط شطاف', parentId: 'خلاطات' },
  { id: 'خلاطات شواي', name: 'خلاطات شواي', parentId: 'خلاطات' },

  { id: 'افيز+تثبيت+غراء', name: 'افيز+تثبيت+غراء', parentId: null },
  { id: 'أفيز فيشر', name: 'أفيز فيشر', parentId: 'افيز+تثبيت+غراء' },
  { id: 'طقم مسمار', name: 'طقم مسمار', parentId: 'افيز+تثبيت+غراء' },
  { id: 'تفلون + غراء + سيليكون', name: 'تفلون + غراء + سيليكون', parentId: 'افيز+تثبيت+غراء' },
  { id: 'صرف احواض + قاعدة', name: 'صرف احواض + قاعدة', parentId: 'افيز+تثبيت+غراء' },

  { id: 'الاهرام بولي+صرف', name: 'الاهرام بولي+صرف', parentId: null },
  { id: 'قطع ٥٠ ملى كيسل الاهرام', name: 'قطع ٥٠ ملى كيسل الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٧٥ ملى كيسل الاهرام', name: 'قطع ٧٥ ملى كيسل الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١١٠ ملى كيسل الاهرام', name: 'قطع ١١٠ ملى كيسل الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١٦٠ ملى كيسل الاهرام', name: 'قطع ١٦٠ ملى كيسل الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١بوصه الاهرام ابيض', name: 'قطع ١بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١,٥ ابيض الاهرام', name: 'قطع ١,٥ ابيض الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٢بوصه الاهرام ابيض', name: 'قطع ٢بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٣بوصه الاهرام ابيض', name: 'قطع ٣بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٤بوصه الاهرام ابيض', name: 'قطع ٤بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٦بوصه الاهرام', name: 'قطع ٦بوصه الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'بلاعات الاهرام', name: 'بلاعات الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٢/١ بولى الاهرام', name: 'قطع ٢/١ بولى الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٤/٣ بولى الاهرام', name: 'قطع ٤/٣ بولى الاهرام', parentId: 'الاهرام بولي+صرف' },

  { id: 'سانبيور+ديروفيت+ايديال+ليسكو', name: 'سانبيور+ديروفيت+ايديال+ليسكو', parentId: null },
  { id: 'طقم سانبيور', name: 'طقم سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'قاعدة سانبيور', name: 'قاعدة سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'حوض برقبة سانبيور', name: 'حوض برقبة سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'سدري سانبيور', name: 'سدري سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'مرحاض معلق سانبيور', name: 'مرحاض معلق سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'حوض وحده سانبيور', name: 'حوض وحده سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'طقم ليسكو', name: 'طقم ليسكو', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'طقم ايديال ستاندر', name: 'طقم ايديال ستاندر', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'بانيو فرانكي', name: 'بانيو فرانكي', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },

  { id: 'مجموعه مواتير', name: 'مجموعه مواتير', parentId: null },
  { id: 'موتور ٢ حصان', name: 'موتور ٢ حصان', parentId: 'مجموعه مواتير' },
  { id: 'موتور ١ حصان', name: 'موتور ١ حصان', parentId: 'مجموعه مواتير' },
  { id: 'موتور ١,٥ حصان', name: 'موتور ١,٥ حصان', parentId: 'مجموعه مواتير' },
  { id: 'موتور ٢/١ حصان', name: 'موتور ٢/١ حصان', parentId: 'مجموعه مواتير' },
  { id: 'أجهزة الأوتوماتيك', name: 'أجهزة الأوتوماتيك', parentId: 'مجموعه مواتير' },
  { id: 'قطع غيار مواتير', name: 'قطع غيار مواتير', parentId: 'مجموعه مواتير' },

  { id: 'اطقم اكسسوار', name: 'اطقم اكسسوار', parentId: null },
  { id: 'طقم اكسسوار جوليت', name: 'طقم اكسسوار جوليت', parentId: 'اطقم اكسسوار' },
  { id: 'طقم اكسسوار ابيض', name: 'طقم اكسسوار ابيض', parentId: 'اطقم اكسسوار' },
  { id: 'طقم اكسسوار متنوع', name: 'طقم اكسسوار متنوع', parentId: 'اطقم اكسسوار' },

  { id: 'مجموعهفلاتر+قطع غيار', name: 'مجموعهفلاتر+قطع غيار', parentId: null },
  { id: 'فلاتر تانك', name: 'فلاتر تانك', parentId: 'مجموعهفلاتر+قطع غيار' },
  { id: 'طقم شمع تانك', name: 'طقم شمع تانك', parentId: 'مجموعهفلاتر+قطع غيار' },
  { id: 'طقم شمع مستورد', name: 'طقم شمع مستورد', parentId: 'مجموعهفلاتر+قطع غيار' },
  { id: 'قطع غيار + صيانة', name: 'قطع غيار + صيانة', parentId: 'مجموعهفلاتر+قطع غيار' },

  { id: 'غطاء بلاعات', name: 'غطاء بلاعات', parentId: null },
  { id: 'غطيان ١٥*١٥', name: 'غطيان ١٥*١٥', parentId: 'غطاء بلاعات' },
  { id: 'غطيان ٢٠*٣٠', name: 'غطيان ٢٠*٣٠', parentId: 'غطاء بلاعات' },
  { id: 'بيه شور', name: 'بيه شور', parentId: 'غطاء بلاعات' },
  { id: 'غطاء بلاستك', name: 'غطاء بلاستك', parentId: 'غطاء بلاعات' },
  { id: 'طابق بانيو + حوض2', name: 'طابق بانيو + حوض', parentId: 'غطاء بلاعات' },

  { id: 'قطع صرف 6 بوصه', name: 'قطع صرف 6 بوصه', parentId: null },
  { id: 'مواسير صرف', name: 'مواسير صرف', parentId: 'قطع صرف 6 بوصه' },
  { id: 'مجر + جلتراپ', name: 'مجر + جلتراپ', parentId: 'قطع صرف 6 بوصه' },
  { id: 'قطع صرف رمادي ضغط 80', name: 'قطع صرف رمادي ضغط 80', parentId: 'قطع صرف 6 بوصه' },
  { id: 'قطع ٦بوصه', name: 'قطع ٦بوصه', parentId: 'قطع صرف 6 بوصه' },

  { id: 'جوليت صيني', name: 'جوليت صيني', parentId: null },
  { id: 'سيديلى جوليت', name: 'سيديلى جوليت', parentId: 'جوليت صيني' },
  { id: 'كومبنيشن جوليت', name: 'كومبنيشن جوليت', parentId: 'جوليت صيني' },
  { id: 'حوض بالعامود جوليت', name: 'حوض بالعامود جوليت', parentId: 'جوليت صيني' },
  { id: 'سلبسات بلدي جوليت', name: 'سلبسات بلدي جوليت', parentId: 'جوليت صيني' },
  { id: 'طقم حمام جوليت', name: 'طقم حمام جوليت', parentId: 'جوليت صيني' },

  { id: 'مكن كومبينيشمن', name: 'مكن كومبينيشمن', parentId: null },
  { id: 'ديوروفيت', name: 'ديوروفيت', parentId: 'مكن كومبينيشمن' },
  { id: 'سيديلى + مسمار تثبيت', name: 'سيديلى + مسمار تثبيت', parentId: 'مكن كومبينيشمن' },
  { id: 'مكن كومبينشن', name: 'مكن كومبينشن', parentId: 'مكن كومبينيشمن' },

  { id: 'احواض استانلس', name: 'احواض استانلس', parentId: null },
  { id: 'حلة استانلس ايطالى', name: 'حلة استانلس ايطالى', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس المنار', name: 'حلة استانلس المنار', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس ترك ستيل', name: 'حلة استانلس ترك ستيل', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس BEKA Turkey-', name: 'حلة استانلس BEKA Turkey-', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس بلازا', name: 'حلة استانلس بلازا', parentId: 'احواض استانلس' },
  { id: 'كابولى حوض استانلس', name: 'كابولى حوض استانلس', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس سمارت', name: 'حلة استانلس سمارت', parentId: 'احواض استانلس' },

  { id: 'قطع بلاكور+محابس+شيك بلف', name: 'قطع بلاكور+محابس+شيك بلف', parentId: null },
  { id: 'محبس بلاكور', name: 'محبس بلاكور', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'جلب بلاكور', name: 'جلب بلاكور', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'شيك بلف بلاكور', name: 'شيك بلف بلاكور', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'محبس بلية', name: 'محبس بلية', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'شيك بلف نحاس', name: 'شيك بلف نحاس', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'شيك بلف سخان', name: 'شيك بلف سخان', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'هيتر + ثيرموستات سخان', name: 'هيتر + ثيرموستات سخان', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'عوامات نحاس خزان', name: 'عوامات نحاس خزان', parentId: 'قطع بلاكور+محابس+شيك بلف' },

  { id: 'قطع اكوا استار', name: 'قطع اكوا استار', parentId: null },
  { id: 'محبس اكوا استار', name: 'محبس اكوا استار', parentId: 'قطع اكوا استار' },
  { id: 'صرف اكوا استار', name: 'صرف اكوا استار', parentId: 'قطع اكوا استار' },

  { id: 'مجموعه حنفيات+نواكل', name: 'مجموعه حنفيات+نواكل', parentId: null },
  { id: 'حنفيات غسالة فاخرة', name: 'حنفيات غسالة فاخرة', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'حنفيات غسالة', name: 'حنفيات غسالة', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'حنفيات نص خلاط', name: 'حنفيات نص خلاط', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'حنفيات متنوعة', name: 'حنفيات متنوعة', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'حنفيات', name: 'حنفيات', parentId: 'مجموعه حنفيات+نواكل' },

  { id: 'وصله متعدده', name: 'وصله متعدده', parentId: null },
  { id: 'وصلة تجاري', name: 'وصلة تجاري', parentId: 'وصله متعدده' },
  { id: 'وصلة فايبر', name: 'وصلة فايبر', parentId: 'وصله متعدده' },
  { id: 'وصلة مرنة اصيل', name: 'وصلة مرنة اصيل', parentId: 'وصله متعدده' },
  { id: 'وصلة سوستة شاور', name: 'وصلة سوستة شاور', parentId: 'وصله متعدده' },

  { id: 'شاور+مساطر', name: 'شاور+مساطر', parentId: null },
  { id: 'مسطرة دش', name: 'مسطرة دش', parentId: 'شاور+مساطر' },
  { id: 'شاور حراري', name: 'شاور حراري', parentId: 'شاور+مساطر' },
  { id: 'شاور استانلس', name: 'شاور استانلس', parentId: 'شاور+مساطر' },

  { id: 'وحدات حوض+مرايات', name: 'وحدات حوض+مرايات', parentId: null },
  { id: 'وحدات حوض', name: 'وحدات حوض', parentId: 'وحدات حوض+مرايات' },
  { id: 'مرايات', name: 'مرايات', parentId: 'وحدات حوض+مرايات' },
];

// Mapping from old sub-category name to new main+sub
// Build by matching old sub names to new categories using keyword logic
function classifyProduct(name, category, oldSubName) {
  const full = `${name} ${category} ${oldSubName}`.toLowerCase();

  // BR
  if (oldSubName === 'قطع مشكلة BR' || full.includes('مشكله') || full.includes('مشكلة') && full.includes('br')) {
    return { main: 'Br', sub: 'قطع مشكله BR اسمارت و' };
  }
  if (oldSubName && oldSubName.includes('1/2 بوصة') && (full.includes('br') || oldSubName.includes('br'))) {
    return { main: 'Br', sub: 'قطع ٢/١' };
  }

  // اسمارت هوم / اسمارت ابيض
  if (full.includes('اسمارت') && !full.includes('br') && !full.includes('افيز')) {
    if (full.includes('6') || full.includes('٦')) return { main: 'اسمارت ابيض', sub: 'بوصه 6' };
    if (full.includes('4') || full.includes('٤')) return { main: 'اسمارت ابيض', sub: 'بوصه 4' };
    if (full.includes('3') || full.includes('٣')) return { main: 'اسمارت ابيض', sub: 'بوصه 3' };
    if (full.includes('2') || full.includes('٢')) return { main: 'اسمارت ابيض', sub: 'بوصه 2' };
    if (full.includes('1.5') || full.includes('١.٥')) return { main: 'اسمارت ابيض', sub: 'بوصه ١,٥' };
    return { main: 'اسمارت ابيض', sub: '١بوصه' };
  }

  // كيسل / كيسيل
  if (full.includes('كيسل') || full.includes('كيسيل') || full.includes('kessel')) {
    if (full.includes('مدفون') && (full.includes('200') || full.includes('٢٠٠'))) return { main: 'كيسيل', sub: 'نظام كيسل المدفون ٢٠٠' };
    if (full.includes('مدفون') && (full.includes('160') || full.includes('١٦٠'))) return { main: 'كيسيل', sub: 'نظام كيسيل المدفون ١٦٠' };
    if (full.includes('مدفون') && (full.includes('110') || full.includes('١١٠'))) return { main: 'كيسيل', sub: 'نظام كيسيل المدفون ١١٠' };
    if (full.includes('ماسور') || full.includes('مواسير')) return { main: 'كيسيل', sub: 'مواسير كيسل' };
    if (full.includes('بلاعة') || full.includes('بلاعات')) return { main: 'كيسيل', sub: 'بلاعات كيسل' };
    if (full.includes('40') || full.includes('٤٠') || full.includes('50') || full.includes('٥٠') || full.includes('75') || full.includes('٧٥')) return { main: 'كيسيل', sub: 'قطع ٥٠' };
    if (full.includes('63') || full.includes('٦٣')) return { main: 'كيسيل', sub: 'قطع ٦٣ كيسل' };
    if (full.includes('110') || full.includes('١١٠')) return { main: 'كيسيل', sub: 'قطع ١١٠' };
    if (full.includes('160') || full.includes('١٦٠')) return { main: 'كيسيل', sub: 'قطع ١٦٠' };
    if (full.includes('1بوصه') || full.includes('1 بوصه') || full.includes('١بوصه')) return { main: 'كيسيل', sub: 'قطع ١بوصه كيسل' };
    return { main: 'كيسيل', sub: 'قطع ١١٠' };
  }

  // الاهرام
  if (full.includes('الاهرام') || full.includes('الأهرام') || full.includes('ahram')) {
    if (full.includes('بلاعة') || full.includes('بلاعات') || full.includes('جلتر') || full.includes('جلتراب')) return { main: 'الاهرام بولي+صرف', sub: 'بلاعات الاهرام' };
    if (full.includes('2/1') || full.includes('١/٢') || full.includes('نص')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ٢/١ بولى الاهرام' };
    if (full.includes('4/3') || full.includes('٣/٤')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ٤/٣ بولى الاهرام' };
    if (full.includes('1.5') || full.includes('١.٥')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ١,٥ ابيض الاهرام' };
    if (full.includes('6') || full.includes('٦')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ٦بوصه الاهرام' };
    if (full.includes('4') || full.includes('٤')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ٤بوصه الاهرام ابيض' };
    if (full.includes('3') || full.includes('٣')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ٣بوصه الاهرام ابيض' };
    if (full.includes('2') || full.includes('٢')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ٢بوصه الاهرام ابيض' };
    if (full.includes('110') || full.includes('١١٠')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ١١٠ ملى كيسل الاهرام' };
    if (full.includes('160') || full.includes('١٦٠')) return { main: 'الاهرام بولي+صرف', sub: 'قطع ١٦٠ ملى كيسل الاهرام' };
    return { main: 'الاهرام بولي+صرف', sub: 'قطع ١بوصه الاهرام ابيض' };
  }

  // تكنو بولي - Borj (روكسي) mapped to تكنو بولي since both are poly pipes
  if (full.includes('بولي') || full.includes('بولى') || full.includes('روكسي') || full.includes('polo') || full.includes('بولو')) {
    if (full.includes('صرف')) {
      if (full.includes('6') || full.includes('٦')) return { main: 'تكنو بولي', sub: 'صرف ٦ تكنو' };
      if (full.includes('4') || full.includes('٤')) return { main: 'تكنو بولي', sub: 'صرف ٤ تكنو' };
      if (full.includes('3') || full.includes('٣')) return { main: 'تكنو بولي', sub: 'صرف ٣ تكنو' };
      if (full.includes('2') || full.includes('٢')) return { main: 'تكنو بولي', sub: 'صرف ٢ تكنو' };
      return { main: 'تكنو بولي', sub: 'صرف ١,٥ تكنو' };
    }
    if (full.includes('2/1') || full.includes('١/٢') || full.includes('1/2') || full.includes('نص')) return { main: 'تكنو بولي', sub: 'بولى ٢/١' };
    if (full.includes('4/3') || full.includes('٣/٤') || full.includes('3/4')) return { main: 'تكنو بولي', sub: 'بولى ٤/٣ تكنو' };
    if (full.includes('1.5') || full.includes('١.٥')) return { main: 'تكنو بولي', sub: 'بولى ١,٥ تكنو' };
    if (full.includes('2') || full.includes('٢')) return { main: 'تكنو بولي', sub: 'بولى ٢ تكنو' };
    return { main: 'تكنو بولي', sub: 'بولى ١ تكنو' };
  }

  // BR (Shareef maps here since similar pipe)
  if (full.includes('الشريف') || full.includes('br') || oldSubName.toLowerCase().includes('br')) {
    if (full.includes('اسود') || full.includes('أسود')) {
      if (full.includes('1.5') || full.includes('١.٥')) return { main: 'Br', sub: 'قطع ١,٥ اسود' };
      if (full.includes('1') || full.includes('١')) return { main: 'Br', sub: 'قطع ١ بوصه اسود' };
      return { main: 'Br', sub: 'قطع اسواد ٣/٤' };
    }
    if (full.includes('2/1') || full.includes('١/٢') || full.includes('1/2')) return { main: 'Br', sub: 'قطع ٢/١' };
    if (full.includes('4/3') || full.includes('٣/٤') || full.includes('3/4')) return { main: 'Br', sub: 'قطع ٤/٣ بوصة' };
    if (full.includes('1.5') || full.includes('١.٥')) return { main: 'Br', sub: 'قطع ١,٥ بوصة' };
    if (full.includes('2') || full.includes('٢')) return { main: 'Br', sub: 'قطع ٢ بوصة' };
    if (full.includes('1.25') || full.includes('١.٢٥')) return { main: 'Br', sub: 'قطع ١,٢٥ بوصة' };
    if (full.includes('1') || full.includes('١')) return { main: 'Br', sub: 'قطع ١ بوصة' };
    return { main: 'Br', sub: 'قطع ٢/١' };
  }

  // حنفيات غسالة
  if (full.includes('حنفية غسالة') || full.includes('حنفيات غسالة') || oldSubName.includes('حنفيات غسالة')) {
    if (full.includes('فاخرة') || full.includes('لافورا')) return { main: 'مجموعه حنفيات+نواكل', sub: 'حنفيات غسالة فاخرة' };
    return { main: 'مجموعه حنفيات+نواكل', sub: 'حنفيات غسالة' };
  }

  // خلاطات
  if (full.includes('خلاط') || full.includes('طقم خلاط') || full.includes('خلط')) {
    if (full.includes('رويال')) return { main: 'خلاطات', sub: 'طقم خلاط رويال' };
    if (full.includes('نص')) return { main: 'خلاطات', sub: 'نص خلاط' };
    if (full.includes('دش') || full.includes('ديكور') || full.includes('دفن')) return { main: 'خلاطات', sub: 'قطع خلاط دش - ديكور' };
    if (full.includes('شيف') || full.includes('الشيف')) return { main: 'خلاطات', sub: 'خلاط مطبخ الشيف' };
    if (full.includes('شطاف')) return { main: 'خلاطات', sub: 'خلاط شطاف' };
    if (full.includes('شواي')) return { main: 'خلاطات', sub: 'خلاطات شواي' };
    if (full.includes('جولد') || full.includes('ايديال') || full.includes('إيديال')) return { main: 'خلاطات', sub: 'طقم خلاط - جولد ايديال' };
    return { main: 'خلاطات', sub: 'اطقم خلاطات عرض' };
  }

  // أفيز + تثبيت + غراء
  if (full.includes('افيز') || full.includes('أفيز') || full.includes('فيشر')) {
    if (full.includes('فيشر')) return { main: 'افيز+تثبيت+غراء', sub: 'أفيز فيشر' };
    return { main: 'افيز+تثبيت+غراء', sub: 'أفيز فيشر' };
  }
  if (full.includes('تفلون') || full.includes('غراء') || full.includes('سيليكون') || full.includes('سليكون') || full.includes('عازل')) {
    return { main: 'افيز+تثبيت+غراء', sub: 'تفلون + غراء + سيليكون' };
  }
  if (full.includes('مسمار') && full.includes('تثبيت')) {
    return { main: 'افيز+تثبيت+غراء', sub: 'طقم مسمار' };
  }

  // صرف احواض
  if (full.includes('صرف') && full.includes('حوض') && !full.includes('6') && !full.includes('٦')) {
    return { main: 'افيز+تثبيت+غراء', sub: 'صرف احواض + قاعدة' };
  }

  // ديورافيت / ديروفيت / ايديال ستاندر
  if (full.includes('ديورافيت') || full.includes('ديوارفيت') || full.includes('ديوروفيت') || full.includes('دروفت')) {
    if (full.includes('مكن') || full.includes('ماكينة') || full.includes('كومبنيشن') || full.includes('كومبينشن')) {
      return { main: 'مكن كومبينيشمن', sub: 'ديوروفيت' };
    }
    if (full.includes('بانيو')) return { main: 'مجموعه دروفت +ايديال', sub: 'بانيو ديورافيت' };
    return { main: 'مجموعه دروفت +ايديال', sub: 'طقم صينى - إكو' };
  }
  if (full.includes('ايديال ستاندر') || full.includes('إيديال ستاندر') || full.includes('ideal standard') || full.includes('ايديال استاندر')) {
    if (full.includes('جولف')) return { main: 'مجموعه دروفت +ايديال', sub: 'طقم صينى - جولف' };
    if (full.includes('كود') || full.includes('code')) return { main: 'مجموعه دروفت +ايديال', sub: 'طقم صينى - دي كود' };
    if (full.includes('صوفيا') || full.includes('سوفيا')) return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'طقم ايديال ستاندر' };
    return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'طقم ايديال ستاندر' };
  }

  // سانبيور
  if (full.includes('سانبيور') || full.includes('san pure') || full.includes('sanpure') || full.includes('كبلر') || full.includes('فلوره') || full.includes('روزينا')) {
    if (full.includes('مرحاض') && full.includes('معلق')) return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'مرحاض معلق سانبيور' };
    if (full.includes('سدري') || full.includes('سداري')) return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'سدري سانبيور' };
    if (full.includes('حوض') && full.includes('برقبة') || full.includes('برقبه')) return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'حوض برقبة سانبيور' };
    if (full.includes('حوض') && full.includes('وحده') || full.includes('وحدة')) return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'حوض وحده سانبيور' };
    if (full.includes('قاعده') || full.includes('قاعدة')) return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'قاعدة سانبيور' };
    return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'طقم سانبيور' };
  }

  // ليسكو
  if (full.includes('ليسكو') || full.includes('ليسيكو') || full.includes('lisco')) {
    return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'طقم ليسكو' };
  }

  // بانيو الطيب / اديال
  if (full.includes('بانيو')) {
    if (full.includes('الطيب')) return { main: 'مجموعه دروفت +ايديال', sub: 'بانيو الطيب' };
    if (full.includes('اديال') || full.includes('ايديال')) return { main: 'مجموعه دروفت +ايديال', sub: 'بانيو اديال' };
    if (full.includes('فرانكي') || full.includes('فرانكى')) return { main: 'سانبيور+ديروفيت+ايديال+ليسكو', sub: 'بانيو فرانكي' };
    return { main: 'مجموعه دروفت +ايديال', sub: 'بانيو ديورافيت' };
  }

  // طقم جولف / دي كود / إكو
  if (full.includes('جولف') && (full.includes('طقم') || full.includes('مرحاض'))) {
    return { main: 'مجموعه دروفت +ايديال', sub: 'طقم صينى - جولف' };
  }
  if (full.includes('دي كود') || full.includes('d-code')) {
    return { main: 'مجموعه دروفت +ايديال', sub: 'طقم صينى - دي كود' };
  }
  if (full.includes('اكو') || full.includes('eco') || full.includes('إكو')) {
    return { main: 'مجموعه دروفت +ايديال', sub: 'طقم صينى - إكو' };
  }

  // طابق بانيو + حوض / صرف + طابق
  if (full.includes('طابق') && (full.includes('بانيو') || full.includes('حوض'))) {
    return { main: 'مجموعه دروفت +ايديال', sub: 'طابق بانيو + حوض' };
  }

  // مواتير
  if (full.includes('موتور') || full.includes('ماتور') || full.includes('مكينة موتور')) {
    if (full.includes('2 حصان') || full.includes('٢ حصان') || full.includes('2حصان')) return { main: 'مجموعه مواتير', sub: 'موتور ٢ حصان' };
    if (full.includes('1.5 حصان') || full.includes('1.5حصان') || full.includes('1,5 حصان')) return { main: 'مجموعه مواتير', sub: 'موتور ١,٥ حصان' };
    if (full.includes('1/2 حصان') || full.includes('نصف حصان') || full.includes('0.5')) return { main: 'مجموعه مواتير', sub: 'موتور ٢/١ حصان' };
    if (full.includes('1 حصان') || full.includes('١ حصان') || full.includes('1حصان') || full.includes('ً حصان')) return { main: 'مجموعه مواتير', sub: 'موتور ١ حصان' };
    return { main: 'مجموعه مواتير', sub: 'موتور ١ حصان' };
  }
  if (full.includes('اتوماتيك') || full.includes('أوتوماتيك') || full.includes('فلومك') || full.includes('ضغط') && full.includes('جهاز')) {
    return { main: 'مجموعه مواتير', sub: 'أجهزة الأوتوماتيك' };
  }
  if (full.includes('بلونه') || full.includes('بلون') || full.includes('خزان') && full.includes('موتور') || full.includes('داخلى')) {
    return { main: 'مجموعه مواتير', sub: 'قطع غيار مواتير' };
  }

  // اكسسوار
  if (full.includes('اكسسوار') || full.includes('إكسسوار') || full.includes('صبانة') || full.includes('صبانه') || full.includes('فوطة') || full.includes('فوطه')) {
    if (full.includes('جوليت')) return { main: 'اطقم اكسسوار', sub: 'طقم اكسسوار جوليت' };
    if (full.includes('ابيض') || full.includes('أبيض') || full.includes('white')) return { main: 'اطقم اكسسوار', sub: 'طقم اكسسوار ابيض' };
    return { main: 'اطقم اكسسوار', sub: 'طقم اكسسوار متنوع' };
  }

  // فلاتر
  if (full.includes('فلتر') || full.includes('فلاتر') || full.includes('شمع') || full.includes('tank') || full.includes('تانك')) {
    if (full.includes('تانك') || full.includes('tank')) {
      if (full.includes('شمع')) return { main: 'مجموعهفلاتر+قطع غيار', sub: 'طقم شمع تانك' };
      return { main: 'مجموعهفلاتر+قطع غيار', sub: 'فلاتر تانك' };
    }
    if (full.includes('شمع')) return { main: 'مجموعهفلاتر+قطع غيار', sub: 'طقم شمع مستورد' };
    return { main: 'مجموعهفلاتر+قطع غيار', sub: 'فلاتر تانك' };
  }

  // غطاء بلاعات
  if (full.includes('غطاء') || full.includes('غطيان') || full.includes('بلاعة') || full.includes('بلاعات') || full.includes('صفاية') || full.includes('صفايه') || full.includes('جلتراب') || full.includes('جلتر')) {
    if (full.includes('15*15') || full.includes('١٥*١٥') || full.includes('15سم') || full.includes('20*20') || full.includes('٢٠*٢٠')) return { main: 'غطاء بلاعات', sub: 'غطيان ١٥*١٥' };
    if (full.includes('20*30') || full.includes('٣٠*٢٠') || full.includes('٢٠*٣٠') || full.includes('30*20')) return { main: 'غطاء بلاعات', sub: 'غطيان ٢٠*٣٠' };
    if (full.includes('شور') || full.includes('شاور') || full.includes('بيه')) return { main: 'غطاء بلاعات', sub: 'بيه شور' };
    if (full.includes('بلاستك') || full.includes('بلاستيك')) return { main: 'غطاء بلاعات', sub: 'غطاء بلاستك' };
    if (full.includes('20*20') || full.includes('جلتراب')) return { main: 'غطاء بلاعات', sub: 'غطيان ١٥*١٥' };
    return { main: 'غطاء بلاعات', sub: 'غطيان ٢٠*٣٠' };
  }

  // قطع صرف 6 بوصة (for صرف 6 بوصة including borj products)
  if (full.includes('صرف') && (full.includes('6') || full.includes('٦'))) {
    if (full.includes('ماسور') || full.includes('مواسير') || full.includes('متر')) return { main: 'قطع صرف 6 بوصه', sub: 'مواسير صرف' };
    if (full.includes('مجر') || full.includes('جلتر')) return { main: 'قطع صرف 6 بوصه', sub: 'مجر + جلتراپ' };
    if (full.includes('رمادي') || full.includes('ضغط')) return { main: 'قطع صرف 6 بوصه', sub: 'قطع صرف رمادي ضغط 80' };
    return { main: 'قطع صرف 6 بوصه', sub: 'قطع ٦بوصه' };
  }

  // جوليت
  if (full.includes('جوليت')) {
    if (full.includes('سدري') || full.includes('سيديلى') || full.includes('غطاء')) return { main: 'جوليت صيني', sub: 'سيديلى جوليت' };
    if (full.includes('كومبنيشن') || full.includes('كومبينشن') || full.includes('كومبنيشون')) return { main: 'جوليت صيني', sub: 'كومبنيشن جوليت' };
    if (full.includes('حوض') && full.includes('عامود')) return { main: 'جوليت صيني', sub: 'حوض بالعامود جوليت' };
    if (full.includes('سلبسات') || full.includes('بلدي')) return { main: 'جوليت صيني', sub: 'سلبسات بلدي جوليت' };
    return { main: 'جوليت صيني', sub: 'طقم حمام جوليت' };
  }

  // مكن كومبينيشمن / سيديلى
  if (full.includes('مكن') || (full.includes('سيديلى') && !full.includes('سان') && !full.includes('جوليت')) || full.includes('كومبينيشن') && !full.includes('جوليت')) {
    if (full.includes('ديوروفيت') || full.includes('ديورافيت')) return { main: 'مكن كومبينيشمن', sub: 'ديوروفيت' };
    if (full.includes('مسمار') || full.includes('تثبيت')) return { main: 'مكن كومبينيشمن', sub: 'سيديلى + مسمار تثبيت' };
    return { main: 'مكن كومبينيشمن', sub: 'مكن كومبينشن' };
  }

  // حوض استانلس / حلة استانلس
  if ((full.includes('حوض') || full.includes('حلة') || full.includes('حله')) && full.includes('استانلس')) {
    if (full.includes('فرانكي') || full.includes('فرانكى')) return { main: 'احواض استانلس', sub: 'حلة استانلس ايطالى' };
    if (full.includes('ايطالي') || full.includes('ايطالى')) return { main: 'احواض استانلس', sub: 'حلة استانلس ايطالى' };
    if (full.includes('المنار')) return { main: 'احواض استانلس', sub: 'حلة استانلس المنار' };
    if (full.includes('ترك') || full.includes('ستيل')) return { main: 'احواض استانلس', sub: 'حلة استانلس ترك ستيل' };
    if (full.includes('beka')) return { main: 'احواض استانلس', sub: 'حلة استانلس BEKA Turkey-' };
    if (full.includes('بلازا')) return { main: 'احواض استانلس', sub: 'حلة استانلس بلازا' };
    if (full.includes('كابولي') || full.includes('كابولى')) return { main: 'احواض استانلس', sub: 'كابولى حوض استانلس' };
    if (full.includes('سمارت') || full.includes('هوم')) return { main: 'احواض استانلس', sub: 'حلة استانلس سمارت' };
    return { main: 'احواض استانلس', sub: 'حلة استانلس ايطالى' };
  }
  // حوض مطبخ فرانكي
  if (full.includes('فرانكي') || full.includes('فرانكى') || full.includes('مكسيم') || full.includes('هيرو')) {
    return { main: 'احواض استانلس', sub: 'حلة استانلس ايطالى' };
  }

  // بلاكور / محابس / شيك بلف / عوامات
  if (full.includes('بلاكور')) {
    if (full.includes('محبس')) return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'محبس بلاكور' };
    if (full.includes('جلب') || full.includes('جلبة') || full.includes('جلبه')) return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'جلب بلاكور' };
    if (full.includes('شيك بلف')) return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'شيك بلف بلاكور' };
    return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'محبس بلاكور' };
  }
  if (full.includes('شيك بلف')) {
    if (full.includes('سخان')) return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'شيك بلف سخان' };
    if (full.includes('نحاس')) return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'شيك بلف نحاس' };
    return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'شيك بلف سخان' };
  }
  if (full.includes('محبس') || full.includes('بلية') || full.includes('شيلد') || full.includes('زاوية')) {
    return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'محبس بلية' };
  }
  if (full.includes('عوامة') || full.includes('عوامات') || full.includes('عوامه')) {
    if (full.includes('اكوا') || full.includes('أكوا')) return { main: 'قطع اكوا استار', sub: 'محبس اكوا استار' };
    return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'عوامات نحاس خزان' };
  }
  if (full.includes('هيتر') || full.includes('ثيرموستات') || full.includes('سخان') && full.includes('خزان')) {
    return { main: 'قطع بلاكور+محابس+شيك بلف', sub: 'هيتر + ثيرموستات سخان' };
  }

  // اكوا استار
  if (full.includes('اكوا') || full.includes('أكوا')) {
    return { main: 'قطع اكوا استار', sub: 'محبس اكوا استار' };
  }

  // وصلات / مرنة
  if (full.includes('وصلة') || full.includes('وصله') || full.includes('توصيلات') || full.includes('نبل')) {
    if (full.includes('تجاري') || full.includes('تجارى')) return { main: 'وصله متعدده', sub: 'وصلة تجاري' };
    if (full.includes('فايبر')) return { main: 'وصله متعدده', sub: 'وصلة فايبر' };
    if (full.includes('اصيل') || full.includes('أصيل') || full.includes('lavita') || full.includes('active')) return { main: 'وصله متعدده', sub: 'وصلة مرنة اصيل' };
    if (full.includes('سوستة') || full.includes('شاور') || full.includes('دش') || full.includes('حراري')) return { main: 'وصله متعدده', sub: 'وصلة سوستة شاور' };
    if (full.includes('مرنة') || full.includes('مرنه')) return { main: 'وصله متعدده', sub: 'وصلة مرنة اصيل' };
    return { main: 'وصله متعدده', sub: 'وصلة تجاري' };
  }

  // مسطرة / شاور / دش
  if (full.includes('مسطرة') || full.includes('مسطره') || full.includes('مساطر') || (full.includes('شاور') && !full.includes('وصلة')) || (full.includes('دش') && !full.includes('خلاط') && !full.includes('وصلة')) || full.includes('سماعة') || full.includes('سماعه')) {
    if (full.includes('حراري') || full.includes('سخان')) return { main: 'شاور+مساطر', sub: 'شاور حراري' };
    if (full.includes('استانلس') || full.includes('استالس')) return { main: 'شاور+مساطر', sub: 'شاور استانلس' };
    return { main: 'شاور+مساطر', sub: 'مسطرة دش' };
  }

  // حنفيات عامة
  if (full.includes('حنفية') || full.includes('حنفيات') || full.includes('نواكل') || full.includes('نواكيل')) {
    if (full.includes('نص خلاط')) return { main: 'مجموعه حنفيات+نواكل', sub: 'حنفيات نص خلاط' };
    if (full.includes('متنوع') || full.includes('طبة')) return { main: 'مجموعه حنفيات+نواكل', sub: 'حنفيات متنوعة' };
    return { main: 'مجموعه حنفيات+نواكل', sub: 'حنفيات' };
  }

  // مرايا / وحدات حوض
  if (full.includes('مراية') || full.includes('مرايه') || full.includes('مرايات')) {
    return { main: 'وحدات حوض+مرايات', sub: 'مرايات' };
  }
  if (full.includes('وحدات حوض') || full.includes('وحدة حوض')) {
    return { main: 'وحدات حوض+مرايات', sub: 'وحدات حوض' };
  }

  // لوازم حديد انفيت
  if (full.includes('حديد') || full.includes('انفيت') || full.includes('كولية ظهر') || full.includes('كوليه ظهر')) {
    if (full.includes('اسود') || full.includes('أسود')) return { main: 'لوازم حديد انفيت', sub: 'إسود' };
    if (full.includes('ابيض') || full.includes('أبيض')) return { main: 'لوازم حديد انفيت', sub: 'أبيض' };
    if (full.includes('كولية')) return { main: 'لوازم حديد انفيت', sub: 'كولية ظهر' };
    return { main: 'لوازم حديد انفيت', sub: 'مقاسات حديد' };
  }

  // صرف general (4 inch and others)
  if (full.includes('صرف') || full.includes('بريز') || full.includes('جلب') || full.includes('سيفون') || full.includes('مجره') || full.includes('مجر')) {
    return { main: 'افيز+تثبيت+غراء', sub: 'صرف احواض + قاعدة' };
  }

  // Default: put in Br as general
  return null;
}

// Remap products
let remapped = 0;
let notMapped = 0;
const unmapped = {};

const remappedProducts = prods.map(p => {
  const oldSubName = oldSubMap[p.subCategoryId] ? oldSubMap[p.subCategoryId].name : (p.category || '');
  const result = classifyProduct(p.name || '', p.category || '', oldSubName);

  if (result) {
    remapped++;
    return {
      ...p,
      mainCategoryId: result.main,
      subCategoryId: result.sub,
      category: result.sub,
    };
  } else {
    notMapped++;
    const key = oldSubName || p.category || 'unknown';
    if (!unmapped[key]) unmapped[key] = { count: 0, sample: p.name };
    unmapped[key].count++;
    // Keep as-is but put in a general bucket
    return p;
  }
});

console.log('Remapped:', remapped, '/ Total:', prods.length);
console.log('Not mapped:', notMapped);
if (notMapped > 0) {
  console.log('Unmapped categories:');
  Object.entries(unmapped).sort((a,b) => b[1].count - a[1].count).forEach(([k,v]) => {
    console.log(' ', v.count, JSON.stringify(k), '|', v.sample.substring(0,40));
  });
}

// Save remapped seed
seed.products = remappedProducts;
seed.categories = NEW_CATS;
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2));
console.log('\\nSeed file saved to', seedPath);
