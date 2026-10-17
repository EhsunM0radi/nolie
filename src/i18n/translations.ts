/**
 * Bilingual (Persian / English) Translation System
 * Styled with Vazirmatn typography for Persian and modern sans-serif for English
 */

export type Language = 'fa' | 'en';

export const translations = {
  fa: {
    appTitle: 'تأیید تعهد و رابطه',
    appSubtitle: 'پلتفرم راستی‌آزمایی صداقت و تعهد در رابطه',
    dir: 'rtl',
    langToggle: 'English',

    // Privacy Guarantee
    privacyNoticeTitle: 'حفظ امنیت و محرمانگی داده‌ها',
    privacyNoticeBody:
      'اطلاعات بیومتریک شما (۳ زاویه چهره و اثر انگشت شصت دست راست) به صورت رمزنگاری‌شده در فضای ابری امن Cloudflare R2 نگهداری می‌شوند و سیستم هیچ نیازی به کد ملی، کارت شناسایی یا استعلام‌های دولتی ندارد.',

    // Core Concept Banner
    monogamyRuleTitle: 'قانون تعهد انحصاری (یک نفر همزمان)',
    monogamyRuleBody:
      'در این سامانه هر شخص تنها می‌تواند با «یک نفر» در رابطه فعال ثبت شود. تا زمانی که پایان رابطه ثبت و تأیید نشود، امکان ثبت رابطه با شخص جدید وجود ندارد.',
    breakupNotificationNotice:
      'با ثبت پایان رابطه، بلافاصله از طریق ربات تلگرام و اعلان گوشی (FCM) به طرف مقابل اطلاع داده می‌شود و هر دو طرف باید علت جدایی را ثبت کنند.',

    // Navigation & Tabs
    tabStatus: 'وضعیت من',
    tabPartner: 'پارتنر من',
    tabHistory: 'تاریخچه شفاف',
    tabSubscription: 'اشتراک VIP',
    tabVerification: 'احراز بیومتریک',

    // Subscription
    subscriptionRequiredTitle: 'اشتراک الزامی است',
    subscriptionRequiredDesc:
      'برای جلوگیری از سوءاستفاده، اکانت‌های جعلی و محافظت از امنیت کاربران، استفاده از تمام بخش‌های اپ نیازمند اشتراک فعال است.',
    monthlyPlanTitle: 'اشتراک ۱ ماهه',
    monthlyPlanPrice: '۱۰۰,۰۰۰ تومان',
    monthlyPlanPeriod: 'ماهانه',
    annualPlanTitle: 'اشتراک ۱ ساله (ویژه)',
    annualPlanPrice: '۵۰,۰۰۰ تومان',
    annualPlanPeriod: 'در ماه (۶۰۰,۰۰۰ تومان سالانه)',
    annualDiscountBadge: '۵۰٪ تخفیف ویژه',
    subscribeBtn: 'خرید و فعال‌سازی اشتراک',
    sandboxCheckoutTitle: 'درگاه پرداخت تستی (شتاب / زرین‌پال)',
    sandboxCheckoutNotice: 'محیط آزمایشی فعال است. با زدن دکمه پرداخت، اشتراک شما بلافاصله فعال می‌شود.',
    payNowBtn: 'پرداخت امن و بازگشت به اپ',
    subscriptionActiveUntil: 'اشتراک شما فعال است تا تاریخ: ',

    // Status & Relationship States
    singleStatus: 'مجرد / بدون رابطه فعال',
    singleDesc: 'شما در حال حاضر پارتنری در سامانه ثبت نکرده‌اید و آماده شروع یک رابطه متعهدانه هستید.',
    inRelationshipStatus: 'در رابطه متعهدانه با:',
    pendingInviteStatus: 'در انتظار تأیید پارتنر...',
    sinceDate: 'تاریخ شروع رابطه:',
    daysTogether: 'روز با هم',

    // Partner Invitation Wizard
    invitePartnerTitle: 'درخواست ثبت رابطه متعهدانه',
    invitePartnerSubtitle: 'شماره موبایل یا شناسه پارتنر خود را وارد کنید:',
    inviteInputPlaceholder: 'مثال: ۰۹۱۲۱۱۱۲۲۳۳',
    sendInviteBtn: 'ارسال دعوت‌نامه رسمی تعهد',
    inviteDisclaimer:
      'با ارسال دعوت‌نامه، به پارتنر شما پیام داده می‌شود. تنها در صورتی که او نیز درخواست شما را بپذیرد، رابطه ثبت شده و تاریخچه هر دو طرف برای یکدیگر شفاف خواهد شد.',
    alreadyInRelError: 'این شخص یا خود شما در حال حاضر در رابطه فعال دیگری هستید!',
    cannotSelfInvite: 'نمی‌توانید به خودتان درخواست بفرستید.',

    // Breakup & Termination Flow
    endRelationshipBtn: 'اعلام پایان رابطه (کات کردن)',
    endRelationshipModalTitle: 'ثبت رسمی پایان رابطه',
    endRelationshipModalWarning:
      'آیا مطمئن هستید؟ با تأیید این عمل، بلافاصله پیامی در تلگرام و اعلان FCM برای پارتنر ارسال شده و علت جدایی در تاریخچه ثبت خواهد شد.',
    selectBreakupReason: 'علت پایان رابطه را انتخاب یا تایپ کنید:',
    reasonIncompatible: 'عدم تفاهم اخلاقی و اهداف متفاوت در زندگی',
    reasonDistance: 'فاصله مکانی و عدم امکان ادامه ارتباط',
    reasonDishonesty: 'عدم صداقت، خیانت یا نقض تعهد متقابل',
    reasonFamily: 'مخالفت خانواده‌ها یا موانع جدی ازدواج',
    reasonOther: 'سایر دلایل / توافق دوجانبه',
    customReasonPlaceholder: 'توضیحات تکمیلی درباره علت جدایی (اختیاری)...',
    confirmBreakupBtn: 'تأیید و ارسال اعلان جدایی به پارتنر',
    cancelBtn: 'انصراف',

    // Partner's Counter-Reason
    counterReasonTitle: 'ثبت دیدگاه شما درباره پایان این رابطه',
    counterReasonDesc: 'پارتنر قبلی علت جدایی را ثبت کرده است. شما نیز می‌توانید نظر و روایت خود را برای تاریخچه ثبت کنید.',
    saveCounterReasonBtn: 'ثبت روایت من',

    // Relationship History
    historyTitle: 'تاریخچه شفاف روابط',
    historySubtitle: 'تنها پارتنر رسمی شما به این بخش دسترسی دارد تا با اطمینان کامل انتخاب کند.',
    noPastRelationships: 'هیچ رابطه قبلی ثبت‌شده‌ای وجود ندارد (اولین رابطه متعهدانه).',
    pastRelationshipCard: 'رابطه قبلی',
    durationLabel: 'مدت زمان:',
    initiatorLabel: 'پایان‌دهنده رابطه:',
    initiatorReasonLabel: 'علت ثبت‌شده توسط پایان‌دهنده:',
    partnerReasonLabel: 'دیدگاه و روایت طرف مقابل:',

    // Wizard Registration & Verification
    wizardTitle: 'احراز هویت بیومتریک',
    step1Title: 'اطلاعات اولیه و موبایل',
    step2Title: 'تأیید پیامکی موبایل',
    step3Title: 'اسکن زنده چهره (۳ زاویه)',
    step4Title: 'اسکن اثر انگشت شصت راست',
    step5Title: 'ذخیره‌سازی و تأیید نهایی',
    step3Desc: 'جهت تأیید زنده بودن و تطبیق هویت، چهره خود را در ۳ زاویه (روبه‌رو، راست و چپ) درون بیضی عمودی ثبت کنید.',
    step4Desc: 'انگشت شصت دست راست خود را روی پد اسکن قرار دهید تا خطوط بیومتریک ثبت گردد.',
    step5Desc: 'اطلاعات بیومتریک در فضای امن Cloudflare R2 ذخیره شد.',
    verificationSuccessTitle: 'احراز هویت بیومتریک تکمیل شد',
    verificationSuccessDesc: 'تصاویر ۳ زاویه چهره و اثر انگشت شصت راست با موفقیت در Cloudflare R2 ذخیره شده و نشان هویت معتبر فعال گردید.',
    verifyOtpBtn: 'تأیید و مرحله بعد',
    nextStepBtn: 'مرحله بعد',
    prevStepBtn: 'مرحله قبل',
    quickFillOtp: 'کد تستی:',
    resendOtp: 'ارسال مجدد کد',
    codeExpiresIn: 'انقضای کد:',

    // Misc
    verifiedBadge: 'هویت تأییدشده',
    unverifiedBadge: 'احراز نشده',
    telegramConnected: 'متصل به حساب تلگرام',
    helpFaqTitle: 'چرا این اپلیکیشن ساخته شد؟',
    helpFaqAnswer:
      'این اپ برای پایان دادن به بازی‌های احساسی، دوستی‌های موازی پنهانی و اتلاف وقت ساخته شده است. هر شخص فقط می‌تواند با یک نفر باشد و پایان هر رابطه به صورت شفاف با ثبت علل از هر دو طرف بایگانی می‌شود.',
  },
  en: {
    appTitle: 'Relationship Commitment & Verification',
    appSubtitle: 'Privacy-First Monogamous Relationship Verification',
    dir: 'ltr',
    langToggle: 'فارسی',

    // Privacy Guarantee
    privacyNoticeTitle: '100% Zero-Storage Privacy Guarantee',
    privacyNoticeBody:
      'No photos, identity cards, national IDs, or confidential documents are permanently stored on our servers. All files uploaded to Cloudflare R2 are permanently destroyed immediately upon registry matching.',

    // Core Concept Banner
    monogamyRuleTitle: 'Strict One-to-One Monogamy Rule',
    monogamyRuleBody:
      'In this platform, each person can only be registered in an active relationship with ONE person at a time. It is impossible to link with another person until the existing relationship is officially terminated.',
    breakupNotificationNotice:
      'Declaring a breakup immediately triggers an automated Telegram Bot alert and push notification (FCM) to your partner, and both parties record their reason for separation.',

    // Navigation & Tabs
    tabStatus: 'My Status',
    tabPartner: 'My Partner',
    tabHistory: 'Transparent History',
    tabSubscription: 'VIP Pass',
    tabVerification: 'Verify Identity',

    // Subscription
    subscriptionRequiredTitle: 'Subscription Required',
    subscriptionRequiredDesc:
      'To prevent fake accounts, bad actors, and preserve high security, an active subscription is required to unlock the app.',
    monthlyPlanTitle: '1-Month Pass',
    monthlyPlanPrice: '100,000 Tomans',
    monthlyPlanPeriod: 'monthly',
    annualPlanTitle: '1-Year Pass (Best Value)',
    annualPlanPrice: '50,000 Tomans',
    annualPlanPeriod: 'per month (600,000 Tomans / year)',
    annualDiscountBadge: '50% OFF',
    subscribeBtn: 'Activate VIP Subscription',
    sandboxCheckoutTitle: 'Simulated Payment Gateway (Shetab / Zarinpal)',
    sandboxCheckoutNotice: 'Sandbox mode is active. Clicking pay will instantly activate your VIP subscription.',
    payNowBtn: 'Secure Demo Pay & Return to App',
    subscriptionActiveUntil: 'Subscription active until: ',

    // Status & Relationship States
    singleStatus: 'Single / Not Committed',
    singleDesc: 'You do not currently have an active partner registered and are free to begin a committed relationship.',
    inRelationshipStatus: 'Committed Relationship with:',
    pendingInviteStatus: 'Waiting for partner confirmation...',
    sinceDate: 'Relationship started:',
    daysTogether: 'days together',

    // Partner Invitation Wizard
    invitePartnerTitle: 'Invite Your Partner to Bind',
    invitePartnerSubtitle: 'Enter your partner’s mobile number or identifier:',
    inviteInputPlaceholder: 'e.g. 09121112233',
    sendInviteBtn: 'Send Commitment Invite',
    inviteDisclaimer:
      'A formal invitation will be sent to your partner. Only upon their mutual acceptance will you both be officially bound, unlocking mutual past history visibility.',
    alreadyInRelError: 'This person or you are already in an active relationship with someone else!',
    cannotSelfInvite: 'You cannot invite yourself.',

    // Breakup & Termination Flow
    endRelationshipBtn: 'Declare Relationship End (Breakup)',
    endRelationshipModalTitle: 'Official Relationship Termination',
    endRelationshipModalWarning:
      'Are you sure? Confirming this will instantly alert your partner via Telegram and FCM push, and record your breakup reason in the mutual history.',
    selectBreakupReason: 'Select or write the reason for separation:',
    reasonIncompatible: 'Incompatible life goals and priorities',
    reasonDistance: 'Long distance and logistical hurdles',
    reasonDishonesty: 'Breach of trust, dishonesty, or betrayal',
    reasonFamily: 'Family objections or insurmountable obstacles',
    reasonOther: 'Other / Mutual amicable decision',
    customReasonPlaceholder: 'Additional explanation (optional)...',
    confirmBreakupBtn: 'Confirm & Dispatch Breakup Notification',
    cancelBtn: 'Cancel',

    // Partner's Counter-Reason
    counterReasonTitle: 'Add Your Perspective to the Breakup Record',
    counterReasonDesc: 'Your previous partner has recorded their reason. You can record your own side of the story for transparency.',
    saveCounterReasonBtn: 'Save My Perspective',

    // Relationship History
    historyTitle: 'Mutual Relationship History',
    historySubtitle: 'Only your confirmed partner can see this history, allowing both people to choose each other with full honesty.',
    noPastRelationships: 'No prior relationships recorded in the system (First verified commitment).',
    pastRelationshipCard: 'Prior Relationship',
    durationLabel: 'Duration:',
    initiatorLabel: 'Ended by:',
    initiatorReasonLabel: 'Reason recorded by initiator:',
    partnerReasonLabel: 'Partner’s perspective:',

    // Wizard Registration & Verification
    wizardTitle: 'Identity Verification Wizard',
    step1Title: 'Personal Credentials',
    step2Title: 'Mobile OTP Check',
    step3Title: 'Shahkar Registry Match',
    step4Title: 'Smart ID Card Scan',
    step5Title: '3-Angle Facial Liveness',
    step6Title: 'Identity Verified Badge',
    step3Desc: 'Official Shahkar government registry check verified mobile ownership with your National ID.',
    step4Desc: 'Position your National ID card inside the frame and take a photo or upload an image.',
    step5Desc: 'For biometric liveness and matching, capture your face in 3 angles (front, slightly right, and slightly left).',
    verificationSuccessTitle: 'Identity Verification Completed',
    verificationSuccessDesc: 'Your identity has been successfully verified. All biometric images have been permanently expunged.',
    verifyOtpBtn: 'Verify & Proceed',
    nextStepBtn: 'Next Step',
    prevStepBtn: 'Back',
    quickFillOtp: 'Test Code:',
    resendOtp: 'Resend Code',
    codeExpiresIn: 'Expires in:',

    // Misc
    verifiedBadge: 'Identity Verified',
    unverifiedBadge: 'Not Verified',
    telegramConnected: 'Linked with Telegram',
    helpFaqTitle: 'Why was this platform built?',
    helpFaqAnswer:
      'This app was engineered to eliminate ghosting, secret parallel dating, and emotional manipulation. Each user can only commit to one person at a time, and any breakup is transparently notified and documented from both sides.',
  },
};
