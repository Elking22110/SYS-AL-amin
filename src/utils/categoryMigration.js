// Category Hierarchy Overwrite & Seeding Utility V9

const ALL_CATEGORIES = [
  // 1. Br
  { id: 'Br', name: 'Br', description: 'بي ار - مواسير ولوازم', parentId: null },
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

  // 2. اسمارت ابيض
  { id: 'اسمارت ابيض', name: 'اسمارت ابيض', description: 'اسمارت ابيض - مواسير ولوازم', parentId: null },
  { id: 'بوصه 6', name: 'بوصه 6', parentId: 'اسمارت ابيض' },
  { id: 'بوصه 4', name: 'بوصه 4', parentId: 'اسمارت ابيض' },
  { id: 'بوصه 3', name: 'بوصه 3', parentId: 'اسمارت ابيض' },
  { id: 'بوصه 2', name: 'بوصه 2', parentId: 'اسمارت ابيض' },
  { id: 'بوصه ١,٥', name: 'بوصه ١,٥', parentId: 'اسمارت ابيض' },
  { id: '١بوصه', name: '١بوصه', parentId: 'اسمارت ابيض' },

  // 3. لوازم حديد انفيت
  { id: 'لوازم حديد انفيت', name: 'لوازم حديد انفيت', description: 'لوازم حديد انفيت', parentId: null },
  { id: 'إسود', name: 'إسود', parentId: 'لوازم حديد انفيت' },
  { id: 'أبيض', name: 'أبيض', parentId: 'لوازم حديد انفيت' },
  { id: 'مقاسات حديد', name: 'مقاسات حديد', parentId: 'لوازم حديد انفيت' },
  { id: 'كولية ظهر', name: 'كولية ظهر', parentId: 'لوازم حديد انفيت' },

  // 4. كيسيل
  { id: 'كيسيل', name: 'كيسيل', description: 'كيسيل - مواسير ولوازم', parentId: null },
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

  // 5. تكنو بولي
  { id: 'تكنو بولي', name: 'تكنو بولي', description: 'تكنو بولي - مواسير ولوازم', parentId: null },
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

  // 6. مجموعه دروفت +ايديال
  { id: 'مجموعه دروفت +ايديال', name: 'مجموعه دروفت +ايديال', description: 'مجموعه دروفت وايديال وأطقم حمام', parentId: null },
  { id: 'طقم صينى - إكو', name: 'طقم صينى - إكو', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'بانيو ديورافيت', name: 'بانيو ديورافيت', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'طقم صينى - جولف', name: 'طقم صينى - جولف', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'طقم صينى - دي كود', name: 'طقم صينى - دي كود', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'بانيو الطيب', name: 'بانيو الطيب', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'بانيو اديال', name: 'بانيو اديال', parentId: 'مجموعه دروفت +ايديال' },
  { id: 'طابق بانيو + حوض', name: 'طابق بانيو + حوض', parentId: 'مجموعه دروفت +ايديال' },


  // 7. خلاطات
  { id: 'خلاطات', name: 'خلاطات', description: 'خلاطات مياه وإكسسوارات', parentId: null },
  { id: 'طقم خلاط - جولد ايديال', name: 'طقم خلاط - جولد ايديال', parentId: 'خلاطات' },
  { id: 'طقم خلاط رويال', name: 'طقم خلاط رويال', parentId: 'خلاطات' },
  { id: 'اطقم خلاطات عرض', name: 'اطقم خلاطات عرض', parentId: 'خلاطات' },
  { id: 'نص خلاط', name: 'نص خلاط', parentId: 'خلاطات' },
  { id: 'قطع خلاط دش - ديكور', name: 'قطع خلاط دش - ديكور', parentId: 'خلاطات' },
  { id: 'خلاط مطبخ الشيف', name: 'خلاط مطبخ الشيف', parentId: 'خلاطات' },
  { id: 'خلاط شطاف', name: 'خلاط شطاف', parentId: 'خلاطات' },
  { id: 'خلاطات شواي', name: 'خلاطات شواي', parentId: 'خلاطات' },

  // 8. افيز+تثبيت+غراء
  { id: 'افيز+تثبيت+غراء', name: 'افيز+تثبيت+غراء', description: 'أفيز وطقم تثبيت وغراء وسيليكون', parentId: null },
  { id: 'أفيز فيشر', name: 'أفيز فيشر', parentId: 'افيز+تثبيت+غراء' },
  { id: 'طقم مسمار', name: 'طقم مسمار', parentId: 'افيز+تثبيت+غراء' },
  { id: 'تفلون + غراء + سيليكون', name: 'تفلون + غراء + سيليكون', parentId: 'افيز+تثبيت+غراء' },
  { id: 'صرف احواض + قاعدة', name: 'صرف احواض + قاعدة', parentId: 'افيز+تثبيت+غراء' },

  // 9. الاهرام بولي+صرف
  { id: 'الاهرام بولي+صرف', name: 'الاهرام بولي+صرف', description: 'الاهرام بولي ومستلزمات صرف', parentId: null },
  { id: 'قطع ٥٠ ملى كيسل الاهرام', name: 'قطع ٥٠ ملى كيسل الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٧٥ ملى كيسل الاهرام', name: 'قطع ٧٥ ملى كيسل الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١١٠ ملى كيسل الاهرام', name: 'قطع ١١٠ ملى كيسل الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١٦٠ ملى كيسل الاهرام', name: 'قطع ١٦٠ ملى كيسل الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١بوصه الاهرام ابيض', name: 'قطع ١بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١,٥ ابيض الاهرام', name: 'قطع ١,٥ ابيض الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٢بوصه الاهرام ابيض', name: 'قطع ٢بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٣بوصه الاهرام ابيض', name: 'قطع ٣بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٤بوصه الاهرام ابيض', name: 'قطع ٤بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٦بوصه الاهرام ابيض', name: 'قطع ٦بوصه الاهرام ابيض', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٢/١ بولى الاهرام', name: 'قطع ٢/١ بولى الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ٤/٣ بولى الاهرام', name: 'قطع ٤/٣ بولى الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١بوصه بولى الاهرام', name: 'قطع ١بوصه بولى الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'قطع ١,٥ بولى الاهرام', name: 'قطع ١,٥ بولى الاهرام', parentId: 'الاهرام بولي+صرف' },
  { id: 'بولى ٢ و ٣ بوصه الاهرام', name: 'بولى ٢ و ٣ بوصه الاهرام', parentId: 'الاهرام بولي+صرف' },

  // 10. سانبيور+ديروفيت+ايديال+ليسكو
  { id: 'سانبيور+ديروفيت+ايديال+ليسكو', name: 'سانبيور+ديروفيت+ايديال+ليسكو', description: 'سان بيور ومستلزمات أطقم حمامات', parentId: null },
  { id: 'صينى سان بيور ليسيكو', name: 'صينى سان بيور ليسيكو', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'صينى سان بيور', name: 'صينى سان بيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'احوض وحده سانبيور', name: 'احوض وحده سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'كونبليشن سانبيور', name: 'كونبليشن سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'احوض ورقبه سانبيور', name: 'احوض ورقبه سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'سداري عاديه', name: 'سداري عاديه', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'سداري سوفت', name: 'سداري سوفت', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'مرحاض معلق سانبيور', name: 'مرحاض معلق سانبيور', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'صينى ديورافيت', name: 'صينى ديورافيت', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },
  { id: 'صينى ايديال ستاندر', name: 'صينى ايديال ستاندر', parentId: 'سانبيور+ديروفيت+ايديال+ليسكو' },

  // 11. مجموعه مواتير
  { id: 'مجموعه مواتير', name: 'مجموعه مواتير', description: 'مجموعه مواتير وأجهزة تحكم للرفع', parentId: null },
  { id: 'مواتير ٢ حصان', name: 'مواتير ٢ حصان', parentId: 'مجموعه مواتير' },
  { id: 'بلونه', name: 'بلونه', parentId: 'مجموعه مواتير' },
  { id: 'اتوماتيك ماتور', name: 'اتوماتيك ماتور', parentId: 'مجموعه مواتير' },
  { id: 'عداد ونحاسه', name: 'عداد ونحاسه', parentId: 'مجموعه مواتير' },
  { id: 'جهاز ماتور', name: 'جهاز ماتور', parentId: 'مجموعه مواتير' },
  { id: 'ماتور ١ حصان', name: 'ماتور ١ حصان', parentId: 'مجموعه مواتير' },

  // 12. اطقم اكسسوار
  { id: 'اطقم اكسسوار', name: 'اطقم اكسسوار', description: 'أطقم إكسسوارات حمام', parentId: null },
  { id: 'اطقم اكسسوار بورسيلين', name: 'اطقم اكسسوار بورسيلين', parentId: 'اطقم اكسسوار' },
  { id: 'اطقم اكسسوار استالس', name: 'اطقم اكسسوار استالس', parentId: 'اطقم اكسسوار' },
  { id: 'قطع صيانات فردي', name: 'قطع صيانات فردي', parentId: 'اطقم اكسسوار' },
  { id: 'خزان صابون تاتش', name: 'خزان صابون تاتش', parentId: 'اطقم اكسسوار' },
  { id: 'اطقم اكسسوار عرض', name: 'اطقم اكسسوار عرض', parentId: 'اطقم اكسسوار' },

  // 13. مجموعهفلاتر+قطع غيار
  { id: 'مجموعهفلاتر+قطع غيار', name: 'مجموعهفلاتر+قطع غيار', description: 'مجموعة فلاتر وقطع غيار', parentId: null },
  { id: 'فلاتر تانك', name: 'فلاتر تانك', parentId: 'مجموعهفلاتر+قطع غيار' },
  { id: 'طقم شمع تانك', name: 'طقم شمع تانك', parentId: 'مجموعهفلاتر+قطع غيار' },
  { id: 'طقم شمع مستورد', name: 'طقم شمع مستورد', parentId: 'مجموعهفلاتر+قطع غيار' },
  { id: 'قطع غيار + صيانة', name: 'قطع غيار + صيانة', parentId: 'مجموعهفلاتر+قطع غيار' },

  // 14. غطاء بلاعات
  { id: 'غطاء بلاعات', name: 'غطاء بلاعات', description: 'غطاء بلاعات وصفايات وصرف', parentId: null },
  { id: 'غطيان ١٥*١٥', name: 'غطيان ١٥*١٥', parentId: 'غطاء بلاعات' },
  { id: 'غطيان ٢٠*٣٠', name: 'غطيان ٢٠*٣٠', parentId: 'غطاء بلاعات' },
  { id: 'بيه شور', name: 'بيه شور', parentId: 'غطاء بلاعات' },
  { id: 'غطاء بلاستك', name: 'غطاء بلاستك', parentId: 'غطاء بلاعات' },


  // 15. قطع صرف 6 بوصه
  { id: 'قطع صرف 6 بوصه', name: 'قطع صرف 6 بوصه', description: 'قطع صرف ٦ بوصة', parentId: null },
  { id: 'مواسير صرف', name: 'مواسير صرف', parentId: 'قطع صرف 6 بوصه' },
  { id: 'قطع ٦ بوصه', name: 'قطع ٦ بوصه', parentId: 'قطع صرف 6 بوصه' },
  { id: 'قطع ٤ بوصه', name: 'قطع ٤ بوصه', parentId: 'قطع صرف 6 بوصه' },
  { id: 'قطع ٣ بوصه', name: 'قطع ٣ بوصه', parentId: 'قطع صرف 6 بوصه' },
  { id: 'قطع ٢ بوصه', name: 'قطع ٢ بوصه', parentId: 'قطع صرف 6 بوصه' },
  { id: 'قطع ١,٥ بوصه', name: 'قطع ١,٥ بوصه', parentId: 'قطع صرف 6 بوصه' },
  { id: 'مجر + جلتراب', name: 'مجر + جلتراب', parentId: 'قطع صرف 6 بوصه' },
  { id: 'قطع صرف رمادي ضغط 80', name: 'قطع صرف رمادي ضغط 80', parentId: 'قطع صرف 6 بوصه' },

  // 16. جوليت صيني
  { id: 'جوليت صيني', name: 'جوليت صيني', description: 'أطقم صيني جوليت', parentId: null },
  { id: 'جوليت صيني عام', name: 'جوليت صيني عام', parentId: 'جوليت صيني' },

  // 17. مكن كومبينيشمن
  { id: 'مكن كومبينيشمن', name: 'مكن كومبينيشمن', description: 'مكن كومبينشن وأغطية خزان وملحقاتها', parentId: null },
  { id: 'ديوروفيت', name: 'ديوروفيت', parentId: 'مكن كومبينيشمن' },
  { id: 'مكن كومبينشن', name: 'مكن كومبينشن', parentId: 'مكن كومبينيشمن' },
  { id: 'سيديلى + مسمار تثبيت', name: 'سيديلى + مسمار تثبيت', parentId: 'مكن كومبينيشمن' },

  // 18. احواض استانلس
  { id: 'احواض استانلس', name: 'احواض استانلس', description: 'أحواض مطبخ استانلس ستيل', parentId: null },
  { id: 'احواض استانلس عام', name: 'احواض استانلس عام', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس ايطالى', name: 'حلة استانلس ايطالى', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس المنار', name: 'حلة استانلس المنار', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس ترك ستيل', name: 'حلة استانلس ترك ستيل', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس BEKA Turkey-', name: 'حلة استانلس BEKA Turkey-', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس بلازا', name: 'حلة استانلس بلازا', parentId: 'احواض استانلس' },
  { id: 'كابولى حوض استانلس', name: 'كابولى حوض استانلس', parentId: 'احواض استانلس' },
  { id: 'حلة استانلس سمارت', name: 'حلة استانلس سمارت', parentId: 'احواض استانلس' },

  // 19. قطع بلاكور+محابس+شيك بلف
  { id: 'قطع بلاكور+محابس+شيك بلف', name: 'قطع بلاكور+محابس+شيك بلف', description: 'قطع بلاكور ومحابس وشيك بلف', parentId: null },
  { id: 'محبس بلاكور', name: 'محبس بلاكور', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'جلب بلاكور', name: 'جلب بلاكور', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'شيك بلف بلاكور', name: 'شيك بلف بلاكور', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'محبس بلية', name: 'محبس بلية', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'شيك بلف نحاس', name: 'شيك بلف نحاس', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'شيك بلف سخان', name: 'شيك بلف سخان', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'هيتر + ثيرموستات سخان', name: 'هيتر + ثيرموستات سخان', parentId: 'قطع بلاكور+محابس+شيك بلف' },
  { id: 'عوامات نحاس خزان', name: 'عوامات نحاس خزان', parentId: 'قطع بلاكور+محابس+شيك بلف' },

  // 20. قطع اكوا استار
  { id: 'قطع اكوا استار', name: 'قطع اكوا استار', description: 'قطع غيار اكوا استار', parentId: null },
  { id: 'قطع ١/٢ بوصة اكوا استار', name: 'قطع ١/٢ بوصة اكوا استار', parentId: 'قطع اكوا استار' },
  { id: 'قطع ٣/٤ بوصة اكوا استار', name: 'قطع ٣/٤ بوصة اكوا استار', parentId: 'قطع اكوا استار' },
  { id: 'قطع ١ بوصة اكوا استار', name: 'قطع ١ بوصة اكوا استار', parentId: 'قطع اكوا استار' },
  { id: 'قطع ١,٥ بوصة اكوا استار', name: 'قطع ١,٥ بوصة اكوا استار', parentId: 'قطع اكوا استار' },
  { id: 'قطع ٢ بوصة اكوا استار', name: 'قطع ٢ بوصة اكوا استار', parentId: 'قطع اكوا استار' },

  // 21. مجموعه حنفيات+نواكل
  { id: 'مجموعه حنفيات+نواكل', name: 'مجموعه حنفيات+نواكل', description: 'مجموعة حنفيات ونواكل وإكسسوارات', parentId: null },
  { id: 'محبس زاوية', name: 'محبس زاوية', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'حنفيات', name: 'حنفيات', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'قلب+اوكرة+قنطرة', name: 'قلب+اوكرة+قنطرة', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'نبل + مساليب نيكل', name: 'نبل + مساليب نيكل', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'حنفيات غساله', name: 'حنفيات غساله', parentId: 'مجموعه حنفيات+نواكل' },
  { id: 'مجموعه نواكل متعدده', name: 'مجموعه نواكل متعدده', parentId: 'مجموعه حنفيات+نواكل' },

  // 22. وصله متعدده
  { id: 'وصله متعدده', name: 'وصله متعدده', description: 'وصلات مرنة متعددة', parentId: null },
  { id: 'وصلة مرنة تجاري', name: 'وصلة مرنة تجاري', parentId: 'وصله متعدده' },
  { id: 'وصلة مرنة فاير', name: 'وصلة مرنة فاير', parentId: 'وصله متعدده' },
  { id: 'وصلة مرنة اصيل', name: 'وصلة مرنة اصيل', parentId: 'وصله متعدده' },
  { id: 'وصلة مرنة Smart hom', name: 'وصلة مرنة Smart hom', parentId: 'وصله متعدده' },
  { id: 'وصلة مرنة LAVITA', name: 'وصلة مرنة LAVITA', parentId: 'وصله متعدده' },
  { id: 'وصلة سوستة شاور', name: 'وصلة سوستة شاور', parentId: 'وصله متعدده' },
  { id: 'وصلة مرنة نحاس', name: 'وصلة مرنة نحاس', parentId: 'وصله متعدده' },
  { id: 'وصلة مرنة Active', name: 'وصلة مرنة Active', parentId: 'وصله متعدده' },

  // 23. شاور+مساطر
  { id: 'شاور+مساطر', name: 'شاور+مساطر', description: 'شاور ومساطر دش', parentId: null },
  { id: 'مساطر دش ٢*١', name: 'مساطر دش ٢*١', parentId: 'شاور+مساطر' },
  { id: 'سماعة دش فردي', name: 'سماعة دش فردي', parentId: 'شاور+مساطر' },
  { id: 'دش دفن هد + هاند', name: 'دش دفن هد + هاند', parentId: 'شاور+مساطر' },
  { id: 'شطاف خارجي', name: 'شطاف خارجي', parentId: 'شاور+مساطر' },

  // 24. وحدات حوض+مرايات
  { id: 'وحدات حوض+مرايات', name: 'وحدات حوض+مرايات', description: 'وحدات حوض ومرايات', parentId: null },
  { id: 'وحدات حوض + مرايات', name: 'وحدات حوض + مرايات', parentId: 'وحدات حوض+مرايات' }
];

// دالة تُشغَّل في كل بدء تشغيل لضمان إن الفئات المعتمدة موجودة دون حذف فئات المستخدم المضافة
function enforceOnlyApprovedCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem('productCategories') || '[]');
    if (!Array.isArray(saved)) {
      localStorage.setItem('productCategories', JSON.stringify(ALL_CATEGORIES));
      return;
    }

    // إزالة المكرر: إبقاء نسخة واحدة فريدة لكل معرف فئة (id)
    const seenIds = new Set();
    const uniqueSaved = saved.filter(c => {
      if (!c || !c.id) return false;
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });

    // إضافة الفئات المعتمدة المفقودة
    const existingIds = new Set(uniqueSaved.map(c => c.id));
    const missing = ALL_CATEGORIES.filter(c => !existingIds.has(c.id));
    
    if (missing.length > 0 || uniqueSaved.length !== saved.length) {
      const final = [...uniqueSaved, ...missing];
      localStorage.setItem('productCategories', JSON.stringify(final));
      console.log(`enforceOnlyApprovedCategories: added ${missing.length} missing, total: ${final.length}`);
    }
  } catch (_) {}
}

export function runCategoryMigration() {
  try {
    // مسح flags الهجرة القديمة دائماً لضمان التنظيف
    localStorage.removeItem('categories_hierarchical_migration_v8');
    localStorage.removeItem('categories_hierarchical_migration_v7');
    localStorage.removeItem('categories_hierarchical_migration_v6');
    localStorage.removeItem('categories_hierarchical_migration_v9');
    localStorage.removeItem('categories_hierarchical_migration_v10');
    localStorage.removeItem('categories_hierarchical_migration_v11');
    localStorage.removeItem('categories_hierarchical_migration_v12');
    localStorage.removeItem('categories_hierarchical_migration_v13');
    localStorage.removeItem('categories_hierarchical_migration_v14');
    localStorage.removeItem('categories_hierarchical_migration_v15');
    localStorage.removeItem('categories_hierarchical_migration_v16');
    localStorage.removeItem('categories_hierarchical_migration_v17');
    localStorage.removeItem('categories_hierarchical_migration_v18');
    localStorage.removeItem('categories_hierarchical_migration_v19');
    localStorage.removeItem('categories_hierarchical_migration_v20');
    localStorage.removeItem('categories_hierarchical_migration_v21');
    localStorage.removeItem('categories_hierarchical_migration_v22');
    localStorage.removeItem('categories_hierarchical_migration_v23');

    const migrationFlag = localStorage.getItem('categories_hierarchical_migration_v24');
    if (migrationFlag === 'true') {
      enforceOnlyApprovedCategories();
      return;
    }

    console.log('Running Category Hierarchy Overwrite & Seeding V24 (جوليت صيني single tab)...');

    // 1. كتابة كافة الفئات الـ 24 الجديدة وحذف أي شيء قديم تمامًا
    localStorage.setItem('productCategories', JSON.stringify(ALL_CATEGORIES));

    // 2. تحديث وتصنيف كافة المنتجات الموجودة لتشير للمعرفات والمجموعات الهرمية الجديدة تلقائياً
    const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
    if (Array.isArray(savedProducts) && savedProducts.length > 0) {
      let productsChanged = false;
      const updatedProducts = savedProducts.map(product => {
        let catName = product.category || '';
        const name = product.name || '';
        const fullName = `${name} ${catName}`.toLowerCase();

        let targetMain = '';
        let targetSub = '';

        // 1. تحديد المجموعة بناء على الكلمات المفتاحية
        if (fullName.includes('بي ار') || fullName.includes('br')) {
          targetMain = 'Br';
          if (fullName.includes('اسود') || fullName.includes('أسود')) {
            if (fullName.includes('1.5') || fullName.includes('١.٥')) targetSub = 'قطع ١,٥ اسود';
            else if (fullName.includes('1') || fullName.includes('١')) targetSub = 'قطع ١ بوصه اسود';
            else targetSub = 'قطع اسواد ٣/٤';
          } else if (fullName.includes('افيز') || fullName.includes('أفيز')) {
            targetSub = 'افيز اسمارت';
          } else if (fullName.includes('مشكله') || fullName.includes('مشكلة')) {
            targetSub = 'قطع مشكله BR اسمارت و';
          } else if (fullName.includes('2/1') || fullName.includes('١/٢') || fullName.includes('1/2')) {
            targetSub = 'قطع ٢/١';
          } else if (fullName.includes('4/3') || fullName.includes('٣/٤') || fullName.includes('3/4')) {
            targetSub = 'قطع ٤/٣ بوصة';
          } else if (fullName.includes('1.25') || fullName.includes('١.٢٥') || fullName.includes('1/4 1') || fullName.includes('1 1/4')) {
            targetSub = 'قطع ١,٢٥ بوصة';
          } else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('1/2 1') || fullName.includes('1 1/2')) {
            targetSub = 'قطع ١,٥ بوصة';
          } else if (fullName.includes('2') || fullName.includes('٢')) {
            targetSub = 'قطع ٢ بوصة';
          } else if (fullName.includes('1') || fullName.includes('١')) {
            targetSub = 'قطع ١ بوصة';
          } else {
            targetSub = 'قطع مشكله BR اسمارت و';
          }
        } else if (fullName.includes('بروج') || fullName.includes('بولو') || fullName.includes('بلاست')) {
          targetMain = 'Br';
          if (fullName.includes('صرف')) {
            if (fullName.includes('1.5') || fullName.includes('١.٥')) targetSub = 'قطع ١,٥ بوصه';
            else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'قطع ٢ بوصة';
            else targetSub = 'قطع مشكله BR اسمارت و';
          } else {
            if (fullName.includes('2/1') || fullName.includes('١/٢') || fullName.includes('1/2')) targetSub = 'قطع ٢/١';
            else if (fullName.includes('4/3') || fullName.includes('٣/٤') || fullName.includes('3/4')) targetSub = 'قطع ٤/٣ بوصة';
            else if (fullName.includes('1.25') || fullName.includes('١.٢٥') || fullName.includes('1/4 1') || fullName.includes('1 1/4')) targetSub = 'قطع ١,٢٥ بوصة';
            else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('1/2 1') || fullName.includes('1 1/2')) targetSub = 'قطع ١,٥ بوصة';
            else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'قطع ٢ بوصة';
            else if (fullName.includes('1') || fullName.includes('١')) targetSub = 'قطع ١ بوصة';
            else targetSub = 'قطع مشكله BR اسمارت و';
          }
        } else if (fullName.includes('سمارت') || fullName.includes('اسمارت')) {
          if ((fullName.includes('حوض') || fullName.includes('حلة') || fullName.includes('حله')) && fullName.includes('استانلس')) {
            targetMain = 'احواض استانلس';
            targetSub = 'حلة استانلس سمارت';
          } else {
            targetMain = 'اسمارت ابيض';
            if (fullName.includes('6') || fullName.includes('٦')) targetSub = 'بوصه 6';
            else if (fullName.includes('4') || fullName.includes('٤')) targetSub = 'بوصه 4';
            else if (fullName.includes('3') || fullName.includes('٣')) targetSub = 'بوصه 3';
            else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'بوصه 2';
            else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('1 1/2') || fullName.includes('1/2 1')) targetSub = 'بوصه ١,٥';
            else if (fullName.includes('1') || fullName.includes('١')) targetSub = '١بوصه';
            else targetSub = 'بوصه 4';
          }
        } else if (fullName.includes('انفيت') || fullName.includes('حديد')) {
          targetMain = 'لوازم حديد انفيت';
          if (fullName.includes('كوليه') || fullName.includes('كولية') || fullName.includes('ظهر')) targetSub = 'كولية ظهر';
          else if (fullName.includes('اسود') || fullName.includes('أسود') || fullName.includes('إسود')) targetSub = 'إسود';
          else if (fullName.includes('ابيض') || fullName.includes('أبيض') || fullName.includes('أبيـض')) targetSub = 'أبيض';
          else targetSub = 'مقاسات حديد';
        } else if (fullName.includes('كيسل') || fullName.includes('كيسيل')) {
          targetMain = 'كيسيل';
          if (fullName.includes('بلاعة') || fullName.includes('بلاعه') || fullName.includes('بلاعات') || fullName.includes('صفاية') || fullName.includes('صفايه')) targetSub = 'بلاعات كيسل';
          else if (fullName.includes('مدفون') || fullName.includes('نظام') || fullName.includes('شاسيه') || fullName.includes('خزان')) {
            if (fullName.includes('110') || fullName.includes('١١٠')) targetSub = 'نظام كيسيل المدفون ١١٠';
            else if (fullName.includes('160') || fullName.includes('١٦٠')) targetSub = 'نظام كيسيل المدفون ١٦٠';
            else targetSub = 'نظام كيسل المدفون ٢٠٠';
          } else if (fullName.includes('ماسور') || fullName.includes('مواسير')) targetSub = 'مواسير كيسل';
          else {
            if (fullName.includes('63') || fullName.includes('٦٣')) targetSub = 'قطع ٦٣ كيسل';
            else if (fullName.includes('40') || fullName.includes('٤٠')) targetSub = 'قطع ٤٠ كيسل';
            else if (fullName.includes('50') || fullName.includes('٥٠')) targetSub = 'قطع ٥٠';
            else if (fullName.includes('75') || fullName.includes('٧٥')) targetSub = 'قطع ٧٥';
            else if (fullName.includes('110') || fullName.includes('١١٠')) targetSub = 'قطع ١١٠';
            else if (fullName.includes('160') || fullName.includes('١٦٠')) targetSub = 'قطع ١٦٠';
            else if (fullName.includes('1') || fullName.includes('١') || fullName.includes('بوصه') || fullName.includes('بوصة')) targetSub = 'قطع ١بوصه كيسل';
            else targetSub = 'قطع ٥٠';
          }
        } else if (fullName.includes('تكنو')) {
          targetMain = 'تكنو بولي';
          if (fullName.includes('صرف')) {
            if (fullName.includes('1.5') || fullName.includes('١.٥')) targetSub = 'صرف ١,٥ تكنو';
            else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'صرف ٢ تكنو';
            else if (fullName.includes('3') || fullName.includes('٣')) targetSub = 'صرف ٣ تكنو';
            else if (fullName.includes('4') || fullName.includes('٤')) targetSub = 'صرف ٤ تكنو';
            else if (fullName.includes('6') || fullName.includes('٦')) targetSub = 'صرف ٦ تكنو';
            else targetSub = 'صرف ٢ تكنو';
          } else {
            if (fullName.includes('2/1') || fullName.includes('١/٢') || fullName.includes('1/2')) targetSub = 'بولى ٢/١';
            else if (fullName.includes('4/3') || fullName.includes('٣/٤') || fullName.includes('3/4')) targetSub = 'بولى ٤/٣ تكنو';
            else if (fullName.includes('1.5') || fullName.includes('١.٥')) targetSub = 'بولى ١,٥ تكنو';
            else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'بولى ٢ تكنو';
            else if (fullName.includes('1') || fullName.includes('١')) targetSub = 'بولى ١ تكنو';
            else targetSub = 'بولى ٢/١';
          }
        } else if (fullName.includes('ديورافيت') || fullName.includes('ديوروفيت') || fullName.includes('دروفت') || fullName.includes('ايديال') || fullName.includes('ستاندر')) {
          targetMain = 'مجموعه دروفت +ايديال';
          if (fullName.includes('بانيو')) {
            if (fullName.includes('الطيب')) targetSub = 'بانيو الطيب';
            else if (fullName.includes('اديال') || fullName.includes('ايديال')) targetSub = 'بانيو اديال';
            else targetSub = 'بانيو ديورافيت';
          } else if (fullName.includes('جولف')) {
            targetSub = 'طقم صينى - جولف';
          } else if (fullName.includes('كود') || fullName.includes('code')) {
            targetSub = 'طقم صينى - دي كود';
          } else {
            targetSub = 'طقم صينى - إكو';
          }
        } else if (fullName.includes('خلاط')) {
          targetMain = 'خلاطات';
          if (fullName.includes('رويال')) targetSub = 'طقم خلاط رويال';
          else if (fullName.includes('نص')) targetSub = 'نص خلاط';
          else if (fullName.includes('دش') || fullName.includes('ديكور')) targetSub = 'قطع خلاط دش - ديكور';
          else if (fullName.includes('شيف') || fullName.includes('الشيف')) targetSub = 'خلاط مطبخ الشيف';
          else if (fullName.includes('شطاف')) targetSub = 'خلاط شطاف';
          else if (fullName.includes('شواي')) targetSub = 'خلاطات شواي';
          else if (fullName.includes('جولد') || fullName.includes('ايديال')) targetSub = 'طقم خلاط - جولد ايديال';
          else targetSub = 'اطقم خلاطات عرض';
        } else if (fullName.includes('افيز') || fullName.includes('أفيز') || fullName.includes('غراء') || fullName.includes('تثبيت') || fullName.includes('سيليكون') || fullName.includes('سليكون')) {
          targetMain = 'افيز+تثبيت+غراء';
          if (fullName.includes('فيشر')) targetSub = 'أفيز فيشر';
          else if (fullName.includes('مسمار')) targetSub = 'طقم مسمار';
          else if (fullName.includes('تفلون') || fullName.includes('غراء') || fullName.includes('سيليكون') || fullName.includes('سليكون')) targetSub = 'تفلون + غراء + سيليكون';
          else targetSub = 'صرف احواض + قاعدة';
        } else if (fullName.includes('الاهرام') || fullName.includes('الأهرام')) {
          targetMain = 'الاهرام بولي+صرف';
          if (fullName.includes('كيسل') || fullName.includes('٥٠ ملى')) targetSub = 'قطع ٥٠ ملى كيسل الاهرام';
          else if (fullName.includes('٧٥ ملى')) targetSub = 'قطع ٧٥ ملى كيسل الاهرام';
          else if (fullName.includes('١١٠ ملى')) targetSub = 'قطع ١١٠ ملى كيسل الاهرام';
          else if (fullName.includes('١٦٠ ملى')) targetSub = 'قطع ١٦٠ ملى كيسل الاهرام';
          else if (fullName.includes('بولي') || fullName.includes('٢/١')) targetSub = 'قطع ٢/١ بولى الاهرام';
          else if (fullName.includes('٤/٣')) targetSub = 'قطع ٤/٣ بولى الاهرام';
          else if (fullName.includes('ابيض') || fullName.includes('أبيض')) {
            if (fullName.includes('1.5') || fullName.includes('١.٥')) targetSub = 'قطع ١,٥ ابيض الاهرام';
            else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'قطع ٢بوصه الاهرام ابيض';
            else if (fullName.includes('3') || fullName.includes('٣')) targetSub = 'قطع ٣بوصه الاهرام ابيض';
            else if (fullName.includes('4') || fullName.includes('٤')) targetSub = 'قطع ٤بوصه الاهرام ابيض';
            else if (fullName.includes('6') || fullName.includes('٦')) targetSub = 'قطع ٦بوصه الاهرام ابيض';
            else targetSub = 'قطع ١بوصه الاهرام ابيض';
          } else {
            targetSub = 'قطع ٢/١ بولى الاهرام';
          }
        } else if (fullName.includes('سانبيور') || fullName.includes('سان بيور') || fullName.includes('ليسيكو') || fullName.includes('ليسكو')) {
          targetMain = 'سانبيور+ديروفيت+ايديال+ليسكو';
          if (fullName.includes('وحده') || fullName.includes('وحدة')) targetSub = 'احوض وحده سانبيور';
          else if (fullName.includes('كونبليشن') || fullName.includes('كومبنيشن')) targetSub = 'كونبليشن سانبيور';
          else if (fullName.includes('ورقبه') || fullName.includes('رقبة')) targetSub = 'احوض ورقبه سانبيور';
          else if (fullName.includes('سداري عاديه') || fullName.includes('سدري')) targetSub = 'سداري عاديه';
          else if (fullName.includes('سداري سوفت')) targetSub = 'سداري سوفت';
          else if (fullName.includes('معلق')) targetSub = 'مرحاض معلق سانبيور';
          else if (fullName.includes('ديورافيت')) targetSub = 'صينى ديورافيت';
          else if (fullName.includes('ايديال')) targetSub = 'صينى ايديال ستاندر';
          else if (fullName.includes('ليسيكو')) targetSub = 'صينى سان بيور ليسيكو';
          else targetSub = 'صينى سان بيور';
        } else if (fullName.includes('ماتور') || fullName.includes('موتور') || fullName.includes('بلونه') || fullName.includes('بالونة') || fullName.includes('اتوماتيك') || fullName.includes('أوتوماتيك') || fullName.includes('عداد') || fullName.includes('نحاسه') || fullName.includes('نحاسة')) {
          targetMain = 'مجموعه مواتير';
          if (fullName.includes('بلونه') || fullName.includes('بالونة')) targetSub = 'بلونه';
          else if (fullName.includes('اتوماتيك') || fullName.includes('أوتوماتيك')) targetSub = 'اتوماتيك ماتور';
          else if (fullName.includes('عداد') || fullName.includes('نحاس') || fullName.includes('نحاسه')) targetSub = 'عداد ونحاسه';
          else if (fullName.includes('جهاز')) targetSub = 'جهاز ماتور';
          else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'مواتير ٢ حصان';
          else targetSub = 'ماتور ١ حصان';
        } else if (fullName.includes('اكسسوار') || fullName.includes('إكسسوار')) {
          targetMain = 'اطقم اكسسوار';
          if (fullName.includes('بورسلين') || fullName.includes('بورسيلين')) targetSub = 'اطقم اكسسوار بورسيلين';
          else if (fullName.includes('استالس') || fullName.includes('استانلس')) targetSub = 'اطقم اكسسوار استالس';
          else if (fullName.includes('صيانة') || fullName.includes('صيانه') || fullName.includes('فردي')) targetSub = 'قطع صيانات فردي';
          else if (fullName.includes('صابون') || fullName.includes('تاتش')) targetSub = 'خزان صابون تاتش';
          else targetSub = 'اطقم اكسسوار عرض';
        } else if (fullName.includes('فلتر') || fullName.includes('فلاتر') || fullName.includes('شمع')) {
          targetMain = 'مجموعهفلاتر+قطع غيار';
          if (fullName.includes('تانك')) {
            if (fullName.includes('شمع')) targetSub = 'طقم شمع تانك';
            else targetSub = 'فلاتر تانك';
          } else if (fullName.includes('شمع')) targetSub = 'طقم شمع مستورد';
          else targetSub = 'قطع غيار + صيانة';
        } else if (fullName.includes('غطاء') || fullName.includes('غطيان') || fullName.includes('بلاعة') || fullName.includes('بلاعات') || fullName.includes('صفاية') || fullName.includes('صفايه')) {
          targetMain = 'غطاء بلاعات';
          if (fullName.includes('15*15') || fullName.includes('١٥*١٥')) targetSub = 'غطيان ١٥*١٥';
          else if (fullName.includes('20*30') || fullName.includes('٣٠*٢٠') || fullName.includes('٢٠*٣٠')) targetSub = 'غطيان ٢٠*٣٠';
          else if (fullName.includes('شور') || fullName.includes('شاور') || fullName.includes('بيه')) targetSub = 'بيه شور';
          else if (fullName.includes('بلاستك') || fullName.includes('بلاستيك')) targetSub = 'غطاء بلاستك';
          else targetSub = 'طابق بانيو + حوض';
        } else if (fullName.includes('صرف') && (fullName.includes('6') || fullName.includes('٦') || fullName.includes('بوصه 6') || fullName.includes('6 بوصه') || fullName.includes('6بوصه'))) {
          targetMain = 'قطع صرف 6 بوصه';
          if (fullName.includes('ماسور') || fullName.includes('مواسير')) targetSub = 'مواسير صرف';
          else if (fullName.includes('مجر') || fullName.includes('جلتر')) targetSub = 'مجر + جلتراپ';
          else if (fullName.includes('رمادي') || fullName.includes('ضغط')) targetSub = 'قطع صرف رمادي ضغط 80';
          else targetSub = 'قطع ٦بوصه';
        } else if (fullName.includes('جوليت')) {
          targetMain = 'جوليت صيني';
          if (fullName.includes('سدري') || fullName.includes('سيديلي') || fullName.includes('غطاء')) targetSub = 'سيديلى جوليت';
          else if (fullName.includes('كومبنيشن') || fullName.includes('كومبينشن')) targetSub = 'كومبنيشن جوليت';
          else if (fullName.includes('حوض')) targetSub = 'حوض بالعامود جوليت';
          else if (fullName.includes('سلبسات') || fullName.includes('بلدي')) targetSub = 'سلبسات بلدي جوليت';
          else targetSub = 'طقم حمام جوليت';
        } else if (fullName.includes('مكن') || fullName.includes('سيديلى') || fullName.includes('سيديلي')) {
          targetMain = 'مكن كومبينيشمن';
          if (fullName.includes('ديوروفيت') || fullName.includes('ديورافيت')) targetSub = 'ديوروفيت';
          else if (fullName.includes('مسمار') || fullName.includes('تثبيت')) targetSub = 'سيديلى + مسمار تثبيت';
          else targetSub = 'مكن كومبينشن';
        } else if ((fullName.includes('حوض') || fullName.includes('حلة') || fullName.includes('حله')) && fullName.includes('استانلس')) {
          targetMain = 'احواض استانلس';
          if (fullName.includes('ايطالي') || fullName.includes('ايطالى')) targetSub = 'حلة استانلس ايطالى';
          else if (fullName.includes('المنار')) targetSub = 'حلة استانلس المنار';
          else if (fullName.includes('ترك') || fullName.includes('ستيل')) targetSub = 'حلة استانلس ترك ستيل';
          else if (fullName.includes('beka')) targetSub = 'حلة استانلس BEKA Turkey-';
          else if (fullName.includes('بلازا')) targetSub = 'حلة استانلس بلازا';
          else if (fullName.includes('كابولي') || fullName.includes('كابولى')) targetSub = 'كابولى حوض استانلس';
          else if (fullName.includes('سمارت')) targetSub = 'حلة استانلس سمارت';
          else targetSub = 'حلة استانلس بلازا';
        } else if (fullName.includes('بلاكور') || fullName.includes('بلف') || fullName.includes('عوامات') || fullName.includes('عوامة') || fullName.includes('عوامه') || fullName.includes('محبس')) {
          if (fullName.includes('اكوا') || fullName.includes('أكوا')) {
            targetMain = 'قطع اكوا استار';
            if (fullName.includes('2/1') || fullName.includes('١/٢') || fullName.includes('1/2')) targetSub = 'قطع ١/٢ بوصة اكوا استار';
            else if (fullName.includes('4/3') || fullName.includes('٣/٤') || fullName.includes('3/4')) targetSub = 'قطع ٣/٤ بوصة اكوا استار';
            else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('1/2 1') || fullName.includes('1 1/2')) targetSub = 'قطع ١,٥ بوصة اكوا استار';
            else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'قطع ٢ بوصة اكوا استار';
            else if (fullName.includes('1') || fullName.includes('١')) targetSub = 'قطع ١ بوصة اكوا استار';
            else targetSub = 'قطع ١/٢ بوصة اكوا استار';
          } else {
            targetMain = 'قطع بلاكور+محابس+شيك بلف';
            if (fullName.includes('محبس') && fullName.includes('بلاكور')) targetSub = 'محبس بلاكور';
            else if (fullName.includes('جلب') && fullName.includes('بلاكور')) targetSub = 'جلب بلاكور';
            else if (fullName.includes('شيك بلف') && fullName.includes('بلاكور')) targetSub = 'شيك بلف بلاكور';
            else if (fullName.includes('بلية') || fullName.includes('بليه')) targetSub = 'محبس بلية';
            else if (fullName.includes('شيك بلف') && fullName.includes('نحاس')) targetSub = 'شيك بلف نحاس';
            else if (fullName.includes('شيك بلف') && fullName.includes('سخان')) targetSub = 'شيك بلف سخان';
            else if (fullName.includes('هيتر') || fullName.includes('ثيرموستات')) targetSub = 'هيتر + ثيرموستات سخان';
            else if (fullName.includes('عوامات') || fullName.includes('عوامة') || fullName.includes('عوامه')) targetSub = 'عوامات نحاس خزان';
            else targetSub = 'محبس بلية';
          }
        } else if (fullName.includes('اكوا') || fullName.includes('أكوا') || fullName.includes('aqua')) {
          targetMain = 'قطع اكوا استار';
          if (fullName.includes('2/1') || fullName.includes('١/٢') || fullName.includes('1/2')) targetSub = 'قطع ١/٢ بوصة اكوا استار';
          else if (fullName.includes('4/3') || fullName.includes('٣/٤') || fullName.includes('3/4')) targetSub = 'قطع ٣/٤ بوصة اكوا استار';
          else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('1/2 1') || fullName.includes('1 1/2')) targetSub = 'قطع ١,٥ بوصة اكوا استار';
          else if (fullName.includes('2') || fullName.includes('٢')) targetSub = 'قطع ٢ بوصة اكوا استار';
          else if (fullName.includes('1') || fullName.includes('١')) targetSub = 'قطع ١ بوصة اكوا استار';
          else targetSub = 'قطع ١/٢ بوصة اكوا استار';
        } else if (fullName.includes('حنفيات') || fullName.includes('حنفية') || fullName.includes('حنفيه') || fullName.includes('نواكل') || fullName.includes('نكل')) {
          targetMain = 'مجموعه حنفيات+نواكل';
          if (fullName.includes('زاوية') || fullName.includes('زاويه') || fullName.includes('ذاوية') || fullName.includes('ذاويه')) {
            targetSub = 'محبس زاوية';
          } else if (fullName.includes('غسالة') || fullName.includes('غساله')) {
            targetSub = 'حنفيات غساله';
          } else if (fullName.includes('قلب') || fullName.includes('اوكرة') || fullName.includes('اوكره') || fullName.includes('أوكرة') || fullName.includes('أوكره') || fullName.includes('قنطرة') || fullName.includes('قنطره')) {
            targetSub = 'قلب+اوكرة+قنطرة';
          } else if (fullName.includes('نبل') || fullName.includes('مسلوب') || fullName.includes('مساليب')) {
            targetSub = 'نبل + مساليب نيكل';
          } else if (fullName.includes('طقم') || fullName.includes('مجموعة') || fullName.includes('مجموعه') || fullName.includes('متعدد') || fullName.includes('نواكل') || fullName.includes('نيكل')) {
            targetSub = 'مجموعه نواكل متعدده';
          } else {
            targetSub = 'حنفيات';
          }
        } else if (fullName.includes('وصلة') || fullName.includes('وصله')) {
          targetMain = 'وصله متعدده';
          if (fullName.includes('تجاري') || fullName.includes('تجارى')) targetSub = 'وصلة تجاري';
          else if (fullName.includes('فايبر')) targetSub = 'وصلة فايبر';
          else if (fullName.includes('اصيل') || fullName.includes('أصيل')) targetSub = 'وصلة مرنة اصيل';
          else if (fullName.includes('سوستة') || fullName.includes('شاور') || fullName.includes('دش')) targetSub = 'وصلة سوستة شاور';
          else targetSub = 'وصلة تجاري';
        } else if (fullName.includes('شاور') || fullName.includes('مسطرة') || fullName.includes('مسطره') || fullName.includes('مساطر') || fullName.includes('دش')) {
          targetMain = 'شاور+مساطر';
          if (fullName.includes('حراري') || fullName.includes('سخان')) targetSub = 'شاور حراري';
          else if (fullName.includes('استانلس') || fullName.includes('استالس')) targetSub = 'شاور استانلس';
          else targetSub = 'مسطرة دش';
        } else if (fullName.includes('مراية') || fullName.includes('مرايه') || fullName.includes('مرايات') || fullName.includes('وحدات حوض') || fullName.includes('وحدة حوض')) {
          targetMain = 'وحدات حوض+مرايات';
          if (fullName.includes('مراية') || fullName.includes('مرايه') || fullName.includes('مرايات')) targetSub = 'مرايات';
          else targetSub = 'وحدات حوض';
        }

        // تحديث المنتج إذا تم العثور على مجموعة مناسبة له
        if (targetMain) {
          product.mainCategoryId = targetMain;
          product.subCategoryId = targetSub;
          product.category = targetSub || targetMain;
          productsChanged = true;
        }

        return product;
      });

      if (productsChanged) {
        localStorage.setItem('products', JSON.stringify(updatedProducts));
      }
    }

    localStorage.setItem('categories_hierarchical_migration_v24', 'true');
    console.log('Category Hierarchy Overwrite V24 completed successfully.');
  } catch (error) {
    console.error('Error during category migration v9:', error);
  }
}
