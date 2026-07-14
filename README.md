# Libac

Libac هو موقع عربي بسيط ومخصص للطلبة الجزائريين الجدد الناجحين في البكالوريا، يساعدهم على اختيار التخصص والجامعة المناسبين.

## كيف يعمل المشروع

- كل صفحة تُكتب كملف Markdown داخل مجلد content.
- عند كل push إلى الفرع main، GitHub Actions ينشئ الموقع ويضعه على فرع gh-pages.
- الموقع يُبنى بالكامل بواسطة Node.js باستخدام gray-matter وmarked.

## إضافة تخصص جديد

1. انسخ ملف content/specialites/_TEMPLATE.md إلى ملف جديد مثل content/specialites/nom-specialite.md.
2. غيّر العنوان، slug، وصف التخصص، معلوماته، ثم أضف روابط الجامعات التي تدرّسه.
3. Commit ثم push إلى GitHub.

## إضافة جامعة جديدة

1. انسخ ملف content/universites/_TEMPLATE.md إلى ملف جديد مثل content/universites/nom-universite.md.
2. املأ بيانات الجامعة والجهة والمدينة والتخصصات المتوفرة.
3. Commit ثم push إلى GitHub.

## إضافة دليل عام

- أضف ملف Markdown جديد داخل content/guides/ مع front matter مناسب.

## التشغيل محليًا

```bash
npm install
npm run build
```

الملفات الناتجة ستظهر داخل مجلد dist/.

## النشر التلقائي

- تأكد من أن GitHub Actions مفعّل.
- من إعدادات المستودع اختر فرع gh-pages كمصدر لصفحات GitHub Pages.
