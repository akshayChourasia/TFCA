/**
 * Creates the TFCA organisation with a sample 2027 issue built from the
 * 2026 layouts. Names and numbers below are sample data, not real residents.
 *   npm run db:seed
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { defaultBrand } from "../src/lib/brand";

const SAMPLE_STORY = `उनका जन्म एक छोटे से गाँव में हुआ। बचपन से ही काम के प्रति लगाव रहा और हर काम को उन्होंने सीखने का अवसर माना।

## शुरुआत

सीमित साधनों के बीच उन्होंने अपना पहला व्यवसाय शुरू किया। अनुभव कम था, लेकिन मेहनत, ईमानदारी और कुछ कर दिखाने की ज़िद बहुत थी।

> मेहनत, ईमानदारी और सीखते रहने की सोच ही आगे बढ़ने की असली ताक़त है।

## परिवार — सबसे बड़ी ताक़त

जीवन के हर उतार-चढ़ाव में परिवार ने उनका साथ दिया। उनके लिए असली दौलत पैसा नहीं, परिवार है।

## Treasure Fantasy — एक परिवार

वे मानते हैं कि यहाँ के लोग सिर्फ़ पड़ोसी नहीं, परिवार हैं। खेल, संस्कृति और समाज के लिए TFCA के प्रयास सराहनीय हैं।

## मेरी जीवन सीख

- परिस्थितियाँ चाहे जैसी हों, हौसला कभी मत छोड़ो।
- हर अनुभव कुछ सिखाता है — असफलता भी।
- परिवार, संस्कार और समाज का साथ सबसे बड़ी ताक़त है।`;

async function main() {
  const existing = await db.query.organizations.findFirst({ where: eq(schema.organizations.slug, "tfca") });
  if (existing) {
    console.log("TFCA already seeded; deleting and re-creating sample data.");
    await db.delete(schema.organizations).where(eq(schema.organizations.id, existing.id));
  }

  const [org] = await db
    .insert(schema.organizations)
    .values({ slug: "tfca", name: "Treasure Fantasy Cricket Association", shortName: "TFCA", brand: defaultBrand })
    .returning();

  await db.insert(schema.teamUsers).values([
    { orgId: org.id, name: "संपादक एक", phone: "9000000001", role: "chief_editor", creditTitle: "Concept & Vision", creditQuote: "Great ideas become meaningful stories." },
    { orgId: org.id, name: "संपादक दो", phone: "9000000002", role: "designer", creditTitle: "Visual Creator & Photography", creditQuote: "Every picture has a story to tell." },
    { orgId: org.id, name: "संपादक तीन", phone: "9000000003", role: "editor", creditTitle: "Content & Editing", creditQuote: "Words have the power to connect us." },
    { orgId: org.id, name: "संपादक चार", phone: "9000000004", role: "ad_manager", creditTitle: "Concept & Strategy", creditQuote: "Good stories start with a good idea." },
    { orgId: org.id, name: "प्रूफ़रीडर", phone: "9000000005", role: "proofreader", creditTitle: "Proof Reading & Grammar" },
  ]);

  const firstNames = ["अमित", "सुनीता", "राजेश", "प्रिया", "विकास", "नेहा", "संजय", "कविता", "आलोक", "मीना", "दीपक", "रश्मि"];
  const lastNames = ["शर्मा", "पाटीदार", "जैन", "तिवारी", "चौहान", "सोलंकी"];
  await db.insert(schema.members).values(
    Array.from({ length: 48 }, (_, i) => ({
      orgId: org.id,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      unit: `${String.fromCharCode(65 + (i % 6))}-${101 + i}`,
      phone: `90000${String(10000 + i).padStart(5, "0")}`,
      showInDirectory: i % 7 !== 0,
    })),
  );

  const [issue] = await db
    .insert(schema.issues)
    .values({ orgId: org.id, title: "Treasure Ki Abhivyakti", year: 2027, editionLabel: "द्वितीय संस्करण", status: "in_progress" })
    .returning();

  const pageDefs: { templateKey: string; section?: string; status?: "draft" | "approved"; data: Record<string, unknown> }[] = [
    { templateKey: "cover", status: "approved", data: {} },
    { templateKey: "contents", status: "approved", data: {} },
    { templateKey: "team", status: "approved", data: { footerNote: "हर साथी का नाम लिख पाना संभव नहीं, लेकिन Team TFCA में हर साथी का योगदान ख़ास है।" } },
    { templateKey: "ads", data: { layout: "full", slots: [{ advertiser: "Sample Builders" }] } },
    {
      templateKey: "story",
      data: {
        title: "संघर्ष से सफलता तक... एक प्रेरणादायक सफ़र",
        personName: "नमूना निवासी 'बाबूजी'",
        personRole: "व्यवसायी, इंदौर, मध्य प्रदेश",
        leadQuote: "अपने लिए रास्ता बनाते-बनाते, दूसरों के लिए भी रोज़गार का रास्ता बनाना ही सच्ची सफलता है।",
        photoCaption: "अपने कार्यालय में",
        body: SAMPLE_STORY,
        qa: [
          { q: "आपकी यात्रा ने आपको सबसे बड़ी सीख क्या दी?", a: "परिस्थितियाँ चाहे जैसी हों, हौसला कभी मत छोड़ो।" },
          { q: "Treasure Fantasy residents के लिए आपका संदेश?", a: "मिल-जुलकर रहिए और इस कम्युनिटी की एकता बनाए रखिए।" },
        ],
      },
    },
    { templateKey: "ads", data: { layout: "halves", slots: [{ advertiser: "Sample Nutrition Centre" }, { advertiser: "Sample Brokers" }] } },
    {
      templateKey: "article",
      section: "Knowledge",
      data: {
        title: "ऋतु के अनुसार आहार",
        author: "आयुर्वेद टीम",
        body: "आयुर्वेद के अनुसार हर ऋतु में शरीर की ज़रूरतें बदलती हैं।\n\n## शीत ऋतु\n\nगरम और पौष्टिक भोजन लें।\n\n## ग्रीष्म ऋतु\n\nहल्का भोजन और पर्याप्त पानी लें।",
      },
    },
    { templateKey: "collage", section: "Community", data: { title: "गरबा महोत्सव", photos: Array.from({ length: 6 }, (_, i) => ({ caption: `फ़ोटो ${i + 1}` })) } },
    { templateKey: "ads", data: { layout: "quarters", slots: [{ advertiser: "Ad 1" }, { advertiser: "Ad 2" }, { advertiser: "Ad 3" }, { advertiser: "Ad 4" }] } },
    { templateKey: "directory", data: {} },
    { templateKey: "article", section: "TFCA 2027", data: { title: "आपकी रचनाएँ आमंत्रित हैं", body: "अगले अंक के लिए अपनी कहानियाँ, कविताएँ और तस्वीरें TFCA टीम को भेजें।" } },
    { templateKey: "ads", data: { layout: "full", slots: [{ advertiser: "Back cover sponsor" }] } },
  ];

  await db.insert(schema.pages).values(
    pageDefs.map((p, i) => ({
      orgId: org.id,
      issueId: issue.id,
      position: i,
      templateKey: p.templateKey,
      section: p.section ?? null,
      status: p.status ?? "draft",
      data: p.data,
    })),
  );

  console.log(`Seeded TFCA with issue ${issue.year} (${pageDefs.length} pages).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
